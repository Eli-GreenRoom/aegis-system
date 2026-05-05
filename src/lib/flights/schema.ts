import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));

export const personKindEnum = z.enum(["artist", "crew"]);
export type PersonKind = z.infer<typeof personKindEnum>;

export const directionEnum = z.enum(["inbound", "outbound"]);
export type Direction = z.infer<typeof directionEnum>;

export const flightStatusEnum = z.enum([
  "scheduled",
  "boarded",
  "in_air",
  "landed",
  "delayed",
  "cancelled",
]);
export type FlightStatus = z.infer<typeof flightStatusEnum>;

const isoDateTime = z
  .union([
    z.literal(""),
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "must be an ISO date-time",
    }),
  ])
  .optional();

const optionalUrl = z
  .union([
    z.literal(""),
    z.string().trim().url("must be a valid URL"),
  ])
  .optional();

export const flightInputSchema = z.object({
  personKind: personKindEnum,
  personId: z.string().uuid(),
  direction: directionEnum,
  fromAirport: optionalString,
  toAirport: optionalString,
  airline: optionalString,
  flightNumber: optionalString,
  scheduledDt: isoDateTime,
  actualDt: isoDateTime,
  status: flightStatusEnum.optional(),
  // Set when status flips to `delayed`. UI subtracts the delta from any
  // auto-computed pickup ETA (see OPERATIONS-FLOW.md §2). Capped at 48h —
  // anything longer is a separate flight, not a delay.
  delayMinutes: z.number().int().min(0).max(60 * 48).nullable().optional(),
  pnr: optionalString,
  ticketUrl: optionalUrl,
  confirmationEmailUrl: optionalUrl,
  seat: optionalString,
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type FlightInput = z.infer<typeof flightInputSchema>;

export const flightPatchSchema = flightInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type FlightPatch = z.infer<typeof flightPatchSchema>;

export interface FlightDbValues {
  personKind: PersonKind;
  personId: string;
  direction: Direction;
  fromAirport: string | null;
  toAirport: string | null;
  airline: string | null;
  flightNumber: string | null;
  scheduledDt: Date | null;
  actualDt: Date | null;
  status: FlightStatus;
  delayMinutes: number | null;
  pnr: string | null;
  ticketUrl: string | null;
  confirmationEmailUrl: string | null;
  seat: string | null;
  comments: string | null;
}

const NULLABLE_STRINGS = [
  "fromAirport",
  "toAirport",
  "airline",
  "flightNumber",
  "pnr",
  "ticketUrl",
  "confirmationEmailUrl",
  "seat",
  "comments",
] as const;

function dt(v: string | undefined): Date | null {
  if (v === undefined || v === "") return null;
  return new Date(v);
}

export function flightToDbValues(input: FlightInput): FlightDbValues {
  const out: FlightDbValues = {
    personKind: input.personKind,
    personId: input.personId,
    direction: input.direction,
    status: input.status ?? "scheduled",
    delayMinutes: input.delayMinutes ?? null,
    fromAirport: null,
    toAirport: null,
    airline: null,
    flightNumber: null,
    scheduledDt: dt(input.scheduledDt),
    actualDt: dt(input.actualDt),
    pnr: null,
    ticketUrl: null,
    confirmationEmailUrl: null,
    seat: null,
    comments: null,
  };
  for (const k of NULLABLE_STRINGS) {
    const v = input[k];
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}

export function flightToDbPatchValues(
  input: FlightPatch
): Partial<FlightDbValues> {
  const out: Partial<FlightDbValues> = {};
  if ("personKind" in input && input.personKind !== undefined) out.personKind = input.personKind;
  if ("personId" in input && input.personId !== undefined) out.personId = input.personId;
  if ("direction" in input && input.direction !== undefined) out.direction = input.direction;
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("delayMinutes" in input) {
    out.delayMinutes = input.delayMinutes ?? null;
  }
  if ("scheduledDt" in input) out.scheduledDt = dt(input.scheduledDt);
  if ("actualDt" in input) out.actualDt = dt(input.actualDt);
  for (const k of NULLABLE_STRINGS) {
    if (k in input) {
      const v = input[k];
      out[k] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}
