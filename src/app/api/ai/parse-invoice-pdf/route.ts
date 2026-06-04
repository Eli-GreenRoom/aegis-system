/**
 * POST /api/ai/parse-invoice-pdf
 *
 * Accepts a PDF or image file (multipart/form-data, field "file").
 * - PDF: extract text with pdfjs, pass to parseInvoiceText
 * - Image (jpg/png/webp/gif): send directly to Claude vision API
 *
 * Returns { parsed: ParsedInvoice }
 */

import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { parseInvoiceText, parsedInvoiceSchema } from "@/lib/ai/parse-invoice";
import { extractPdfText } from "@/lib/ai/pdf-text";
import { anthropic, AI_MODEL } from "@/lib/ai/client";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

function isImageType(t: string): t is ImageMediaType {
  return (IMAGE_TYPES as readonly string[]).includes(t);
}

const SYSTEM_PROMPT = `You extract structured data from inbound invoices for a festival operator.

Output JSON matching this exact shape:
{
  "vendor": string | null,
  "invoiceNumber": string | null,
  "amount": number | null,
  "currency": "USD" | "EUR" | null,
  "issueDate": "YYYY-MM-DD" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "lineItems": [{ "description": string, "amount": number | null }],
  "issuerKind": string | null
}

Rules:
- If a field isn't present, use null. Don't guess.
- Amounts are numbers, not strings. Strip currency symbols.
- Dates must be YYYY-MM-DD.
- Return ONLY the JSON object. No prose, no code fences, no markdown.
- "issuerKind": agency / hotel / vendor / freight / catering / production / venue / artist / other`;

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.edit");
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return Response.json(
      { error: "Missing file (field 'file')" },
      { status: 400 },
    );
  if (file.size > MAX_BYTES)
    return Response.json(
      { error: "File too large (max 10 MB)" },
      { status: 400 },
    );

  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";

  let rawText: string | null = null;

  if (mime.includes("pdf")) {
    // PDF → extract text → text parse
    try {
      rawText = await extractPdfText(buf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF extraction failed";
      return Response.json({ error: msg }, { status: 502 });
    }
    if (!rawText.trim())
      return Response.json(
        { error: "Could not read any text from this PDF." },
        { status: 422 },
      );

    try {
      const result = await parseInvoiceText(rawText);
      return Response.json({ parsed: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed";
      return Response.json({ error: msg }, { status: 502 });
    }
  }

  if (isImageType(mime)) {
    // Image → Claude vision
    try {
      const base64 = Buffer.from(buf).toString("base64");
      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mime, data: base64 },
              },
              {
                type: "text",
                text: "Extract the invoice data from this image.",
              },
            ],
          },
        ],
      });
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text")
        return Response.json({ error: "No response from AI" }, { status: 502 });

      const raw = block.text
        .replace(/^```[a-z]*\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return Response.json(
          { error: "Model returned invalid JSON" },
          { status: 502 },
        );
      }
      const validated = parsedInvoiceSchema.safeParse(parsed);
      if (!validated.success)
        return Response.json(
          { error: "Model output failed validation" },
          { status: 502 },
        );
      return Response.json({ parsed: validated.data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed";
      return Response.json({ error: msg }, { status: 502 });
    }
  }

  return Response.json(
    { error: "File must be a PDF or image (jpg, png, webp, gif)" },
    { status: 400 },
  );
}
