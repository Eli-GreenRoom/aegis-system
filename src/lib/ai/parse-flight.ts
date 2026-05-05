/**
 * Flight-confirmation parser. Takes the body of an airline confirmation
 * email or PDF text, returns the fields needed to create a flight row.
 *
 * AI never writes to the DB - the route returns parsed JSON, the
 * operator confirms each field, then submits the form normally.
 *
 * Spec: AGENT.md §6.
 */

import { z } from "zod";
import { anthropic, AI_MODEL } from "./client";

export const parsedFlightSchema = z.object({
  passengerName: z.string().nullable(),
  airline: z.string().nullable(),
  flightNumber: z.string().nullable(),
  /** 3-letter IATA airport code, uppercase. */
  fromAirport: z
    .string()
    .regex(/^[A-Z]{3}$/, "must be 3 uppercase letters")
    .nullable(),
  toAirport: z
    .string()
    .regex(/^[A-Z]{3}$/, "must be 3 uppercase letters")
    .nullable(),
  /** ISO 8601 datetime, e.g. 2026-08-15T14:30:00Z. Local time if no timezone
   *  is given - the operator can adjust on the form. */
  scheduledDt: z.string().nullable(),
  pnr: z.string().nullable(),
  seat: z.string().nullable(),
  /** Best guess at direction relative to the festival in Lebanon: "inbound"
   *  if `toAirport === BEY` or similar, else "outbound". null if ambiguous. */
  direction: z.enum(["inbound", "outbound"]).nullable(),
});
export type ParsedFlight = z.infer<typeof parsedFlightSchema>;

const SYSTEM_PROMPT = `You extract structured data from airline confirmation emails for a festival operator.

The festival is in Lebanon (Beirut, BEY). Use this to infer flight direction:
- "inbound" if the destination airport is BEY (or another Lebanese airport)
- "outbound" if the origin airport is BEY
- null if neither matches

Output JSON matching this exact shape:
{
  "passengerName": string | null,
  "airline": string | null,
  "flightNumber": string | null,
  "fromAirport": "XXX" | null,             // 3-letter IATA, uppercase
  "toAirport":   "XXX" | null,
  "scheduledDt": "YYYY-MM-DDTHH:MM:SSZ" | null,  // ISO 8601, prefer UTC
  "pnr": string | null,
  "seat": string | null,
  "direction": "inbound" | "outbound" | null
}

Rules:
- If a field isn't present, return null. Don't guess.
- IATA codes are exactly 3 uppercase letters. If a city is given without a code, return null.
- For the datetime: if the email gives a local time at the origin airport, return that as ISO with no timezone offset (the operator will confirm). If a UTC offset is given, normalise to UTC.
- Return ONLY the JSON object. No prose, no code fences, no markdown.
- For round trips, return the OUTBOUND-FROM-FESTIVAL leg only (i.e. the trip leaving BEY). If the email lists multiple legs and you can't tell which is which, pick the first.`;

export async function parseFlightText(text: string): Promise<ParsedFlight> {
  if (!text.trim()) {
    throw new Error("Empty input");
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
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

  const validated = parsedFlightSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Model output failed validation: ${JSON.stringify(validated.error.flatten())}`
    );
  }
  return validated.data;
}
