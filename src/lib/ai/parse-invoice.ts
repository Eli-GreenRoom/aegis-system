/**
 * Invoice parser. Takes a chunk of text (an email body, a PDF's
 * extracted text, a copy-pasted document) and returns structured
 * fields the operator can then drop into the invoice form.
 *
 * AI never writes to the DB - the route returns parsed JSON, the
 * operator confirms each field, then submits the form normally.
 *
 * Spec: AGENT.md §6.
 */

import { z } from "zod";
import { anthropic, AI_MODEL } from "./client";

export const parsedInvoiceSchema = z.object({
  /** Free-form vendor name (agency, hotel, freight company, etc.). */
  vendor: z.string().nullable(),
  /** Optional invoice number printed on the document. */
  invoiceNumber: z.string().nullable(),
  /** Total amount in major units (USD/EUR), not cents. */
  amount: z.number().nullable(),
  currency: z.enum(["USD", "EUR"]).nullable(),
  /** ISO date YYYY-MM-DD when the invoice was issued. */
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
    .nullable(),
  /** ISO date YYYY-MM-DD when payment is due. */
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
    .nullable(),
  /** Line items if itemised. Empty array if the invoice is a single total. */
  lineItems: z.array(
    z.object({
      description: z.string(),
      amount: z.number().nullable(),
    })
  ),
  /** What kind of issuer this looks like (agency / hotel / vendor / freight /
   *  catering / production / venue / artist / other). */
  issuerKind: z.string().nullable(),
});
export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>;

const SYSTEM_PROMPT = `You extract structured data from inbound invoices for a festival operator.

Output JSON matching this exact shape:
{
  "vendor": string | null,
  "invoiceNumber": string | null,
  "amount": number | null,           // total, in major units (USD or EUR)
  "currency": "USD" | "EUR" | null,
  "issueDate": "YYYY-MM-DD" | null,
  "dueDate": "YYYY-MM-DD" | null,
  "lineItems": [{ "description": string, "amount": number | null }],
  "issuerKind": string | null         // agency / hotel / vendor / freight / catering / production / venue / artist / other
}

Rules:
- If a field isn't present in the source, use null. Don't guess.
- Amounts are numbers, not strings. Strip currency symbols and thousands separators.
- Dates must be YYYY-MM-DD. Convert from any source format. If only a month + year are given, return null.
- Return ONLY the JSON object. No prose, no code fences, no markdown.
- If multiple totals appear (subtotal vs total), return the final total.
- "issuerKind" is your best guess at the category for the operator's filtering.`;

/**
 * Send the raw text to Claude and parse the response with Zod. Throws
 * if the model returns malformed JSON or fields that don't validate.
 */
export async function parseInvoiceText(text: string): Promise<ParsedInvoice> {
  if (!text.trim()) {
    throw new Error("Empty input");
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text in response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(block.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Model returned invalid JSON: ${message}`);
  }

  const validated = parsedInvoiceSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Model output failed validation: ${JSON.stringify(validated.error.flatten())}`
    );
  }
  return validated.data;
}
