/**
 * POST /api/ai/parse-flight-pdf
 *
 * Accepts a PDF upload (multipart/form-data, field name "file"), extracts
 * the text server-side with pdfjs-dist, then hands it to parseFlightText
 * (Haiku) for structured extraction. Returns the parsed legs.
 *
 * No DB writes. The operator reviews + submits the flight form to persist.
 * The PDF itself is not stored here; the flight form attaches it via
 * the existing FileUpload flow.
 */

import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { parseFlightText, type ParsedFlightArray } from "@/lib/ai/parse-flight";
import { extractPdfText } from "@/lib/ai/pdf-text";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights.edit");
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Missing PDF file (field 'file')" },
      { status: 400 },
    );
  }
  if (file.type && !file.type.includes("pdf")) {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "PDF too large (max 10 MB)" },
      { status: 400 },
    );
  }

  let text: string;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    text = await extractPdfText(buf);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Text extract failed";
    return Response.json({ error: message }, { status: 502 });
  }
  if (!text.trim()) {
    return Response.json(
      { error: "Could not read any text from this PDF." },
      { status: 422 },
    );
  }

  try {
    const festival = await getActiveFestival(session);
    const result: ParsedFlightArray = await parseFlightText(
      text,
      festival?.location,
    );
    return Response.json({ parsed: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
