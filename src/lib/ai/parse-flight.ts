/**
 * Flight-confirmation parser. Takes the body of an airline confirmation
 * email or PDF text, returns all flight legs found.
 *
 * For a round trip, both the inbound and outbound legs are returned so
 * the operator can create them in one pass. AI never writes to the DB -
 * the route returns parsed JSON, the operator confirms, then submits.
 *
 * Spec: AGENT.md -6.
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
  /** ISO 8601 datetime. Local time if no timezone given. */
  scheduledDt: z.string().nullable(),
  pnr: z.string().nullable(),
  seat: z.string().nullable(),
  /** Direction relative to the festival location. */
  direction: z.enum(["inbound", "outbound"]).nullable(),
});
export type ParsedFlight = z.infer<typeof parsedFlightSchema>;

export const parsedFlightArraySchema = z
  .array(parsedFlightSchema)
  .min(1)
  .max(4);
export type ParsedFlightArray = z.infer<typeof parsedFlightArraySchema>;

function buildSystemPrompt(festivalLocation?: string | null): string {
  const location = festivalLocation?.trim() || "Beirut, Lebanon (BEY)";
  return `You extract structured flight data from airline confirmation emails or booking summaries for a festival operator.

The festival is in ${location}. Use this to classify each leg:
- "inbound"  = leg arriving at the festival location/country
- "outbound" = leg departing from the festival location/country
- null       = cannot determine from the airport codes

Return ALL legs found as a JSON array (max 4). For a round-trip confirmation return BOTH legs.
For a one-way return a single-element array.

Each element must match this exact shape:
{
  "passengerName": string | null,
  "airline": string | null,
  "flightNumber": string | null,
  "fromAirport": "XXX" | null,
  "toAirport":   "XXX" | null,
  "scheduledDt": "YYYY-MM-DDTHH:MM:SSZ" | null,
  "pnr": string | null,
  "seat": string | null,
  "direction": "inbound" | "outbound" | null
}

Rules:
- If a field isn't present, use null. Never guess.
- IATA codes are exactly 3 uppercase letters. If only a city is given, use null.
- Datetime: use the origin airport's local time as ISO with no offset if no timezone is provided; otherwise normalise to UTC.
- Return ONLY the JSON array. No prose, no code fences, no markdown.`;
}

export async function parseFlightText(
  text: string,
  festivalLocation?: string | null,
): Promise<ParsedFlightArray> {
  if (!text.trim()) {
    throw new Error("Empty input");
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(festivalLocation),
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

  // Accept both an array and a single object (legacy single-leg responses)
  const normalised = Array.isArray(parsed) ? parsed : [parsed];

  const validated = parsedFlightArraySchema.safeParse(normalised);
  if (!validated.success) {
    throw new Error(
      `Model output failed validation: ${JSON.stringify(validated.error.flatten())}`,
    );
  }
  return validated.data;
}
