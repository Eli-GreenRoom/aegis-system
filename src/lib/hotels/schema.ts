import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalEmail = z
  .union([z.literal(""), z.string().trim().email()])
  .optional();
const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("must be a valid URL")])
  .optional();

// ── Hotel (venue catalogue) ─────────────────────────────────────────────

export const hotelInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  location: optionalString,
  address: optionalString,
  contactName: optionalString,
  contactEmail: optionalEmail,
  contactPhone: optionalString,
  notes: optionalText,
});
export type HotelInput = z.infer<typeof hotelInputSchema>;

export const hotelPatchSchema = hotelInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type HotelPatch = z.infer<typeof hotelPatchSchema>;

export interface HotelDbValues {
  name: string;
  location: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}

const HOTEL_NULLABLE = [
  "location",
  "address",
  "contactName",
  "contactEmail",
  "contactPhone",
  "notes",
] as const;

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export function hotelToDbValues(input: HotelInput): HotelDbValues {
  const out: HotelDbValues = {
    name: input.name,
    location: null,
    address: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
  };
  for (const k of HOTEL_NULLABLE) out[k] = emptyToNull(input[k]);
  return out;
}

export function hotelToDbPatchValues(input: HotelPatch): Partial<HotelDbValues> {
  const out: Partial<HotelDbValues> = {};
  if ("name" in input && input.name !== undefined) out.name = input.name;
  for (const k of HOTEL_NULLABLE) {
    if (k in input) out[k] = emptyToNull(input[k]);
  }
  return out;
}

// ── Room block ──────────────────────────────────────────────────────────

export const currencyEnum = z.enum(["USD", "EUR"]);

export const roomBlockInputSchema = z.object({
  hotelId: z.string().uuid(),
  // Operator-friendly name, e.g. "Artists - Deluxe", "Crew - Standard".
  // Lets Eli book separate blocks for crew (per 2026-05-05 decision in
  // OPERATIONS-FLOW.md s3).
  label: optionalString,
  roomType: z.string().trim().min(1).max(120),
  nights: z.number().int().min(0).max(365).nullable().optional(),
  roomsReserved: z.number().int().min(0).max(500).nullable().optional(),
  pricePerNightAmountCents: z
    .number()
    .int()
    .min(0)
    .max(1_000_000_00)
    .nullable()
    .optional(),
  pricePerNightCurrency: currencyEnum.optional().or(z.literal("")),
  breakfastNote: optionalString,
});
export type RoomBlockInput = z.infer<typeof roomBlockInputSchema>;

export const roomBlockPatchSchema = roomBlockInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type RoomBlockPatch = z.infer<typeof roomBlockPatchSchema>;

export interface RoomBlockDbValues {
  hotelId: string;
  label: string | null;
  roomType: string;
  nights: number | null;
  roomsReserved: number | null;
  pricePerNightAmountCents: number | null;
  pricePerNightCurrency: string | null;
  breakfastNote: string | null;
}

function intOrNull(v: number | null | undefined): number | null {
  return v === undefined ? null : v;
}

export function roomBlockToDbValues(input: RoomBlockInput): RoomBlockDbValues {
  return {
    hotelId: input.hotelId,
    label: emptyToNull(input.label),
    roomType: input.roomType,
    nights: intOrNull(input.nights),
    roomsReserved: intOrNull(input.roomsReserved),
    pricePerNightAmountCents: intOrNull(input.pricePerNightAmountCents),
    pricePerNightCurrency:
      input.pricePerNightCurrency === undefined ||
      input.pricePerNightCurrency === ""
        ? null
        : input.pricePerNightCurrency,
    breakfastNote: emptyToNull(input.breakfastNote),
  };
}

export function roomBlockToDbPatchValues(
  input: RoomBlockPatch
): Partial<RoomBlockDbValues> {
  const out: Partial<RoomBlockDbValues> = {};
  if ("hotelId" in input && input.hotelId !== undefined) out.hotelId = input.hotelId;
  if ("roomType" in input && input.roomType !== undefined) out.roomType = input.roomType;
  if ("label" in input) out.label = emptyToNull(input.label);
  if ("nights" in input) out.nights = intOrNull(input.nights);
  if ("roomsReserved" in input) out.roomsReserved = intOrNull(input.roomsReserved);
  if ("pricePerNightAmountCents" in input) {
    out.pricePerNightAmountCents = intOrNull(input.pricePerNightAmountCents);
  }
  if ("pricePerNightCurrency" in input) {
    out.pricePerNightCurrency =
      input.pricePerNightCurrency === undefined ||
      input.pricePerNightCurrency === ""
        ? null
        : input.pricePerNightCurrency;
  }
  if ("breakfastNote" in input) out.breakfastNote = emptyToNull(input.breakfastNote);
  return out;
}

// ── Hotel booking (per-person assignment) ───────────────────────────────

export const personKindEnum = z.enum(["artist", "crew"]);
export type PersonKind = z.infer<typeof personKindEnum>;

export const hotelBookingStatusEnum = z.enum([
  "tentative",
  "booked",
  "checked_in",
  "checked_out",
  "no_show",
  "cancelled",
]);
export type HotelBookingStatus = z.infer<typeof hotelBookingStatusEnum>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

const optionalUuid = z
  .union([z.literal(""), z.string().uuid()])
  .optional();

/**
 * Base object (unrefined) so callers like the booking form can `.omit(...)`
 * fields and re-apply their own refinement. The exported `hotelBookingInputSchema`
 * adds the date-order refinement on top.
 */
export const hotelBookingBaseSchema = z.object({
  hotelId: z.string().uuid(),
  roomBlockId: optionalUuid,
  personKind: personKindEnum,
  personId: z.string().uuid(),
  roomType: optionalString,
  checkin: isoDate,
  checkout: isoDate,
  bookingNumber: optionalString,
  creditsAmountCents: z
    .number()
    .int()
    .min(0)
    .max(1_000_000_00)
    .nullable()
    .optional(),
  creditsCurrency: currencyEnum.optional().or(z.literal("")),
  status: hotelBookingStatusEnum.optional(),
  confirmationUrl: optionalUrl,
  comments: optionalText,
});

export const hotelBookingInputSchema = hotelBookingBaseSchema.refine(
  (v) => v.checkin <= v.checkout,
  { message: "checkout must be on or after checkin", path: ["checkout"] }
);
export type HotelBookingInput = z.infer<typeof hotelBookingInputSchema>;

// Patch: take the base, .partial(), then re-apply the date check only when
// both fields are present.
export const hotelBookingPatchSchema = hotelBookingBaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Body must contain at least one field",
  })
  .refine(
    (v) =>
      !(v.checkin !== undefined && v.checkout !== undefined && v.checkin > v.checkout),
    { message: "checkout must be on or after checkin", path: ["checkout"] }
  );
export type HotelBookingPatch = z.infer<typeof hotelBookingPatchSchema>;

export interface HotelBookingDbValues {
  hotelId: string;
  roomBlockId: string | null;
  personKind: PersonKind;
  personId: string;
  roomType: string | null;
  checkin: string; // YYYY-MM-DD
  checkout: string;
  bookingNumber: string | null;
  creditsAmountCents: number | null;
  creditsCurrency: string | null;
  status: HotelBookingStatus;
  confirmationUrl: string | null;
  comments: string | null;
}

const BOOKING_NULLABLE_STRINGS = [
  "roomType",
  "bookingNumber",
  "confirmationUrl",
  "comments",
] as const;

export function hotelBookingToDbValues(
  input: HotelBookingInput
): HotelBookingDbValues {
  const out: HotelBookingDbValues = {
    hotelId: input.hotelId,
    roomBlockId:
      input.roomBlockId === undefined || input.roomBlockId === ""
        ? null
        : input.roomBlockId,
    personKind: input.personKind,
    personId: input.personId,
    roomType: null,
    checkin: input.checkin,
    checkout: input.checkout,
    bookingNumber: null,
    creditsAmountCents: intOrNull(input.creditsAmountCents),
    creditsCurrency:
      input.creditsCurrency === undefined || input.creditsCurrency === ""
        ? null
        : input.creditsCurrency,
    status: input.status ?? "booked",
    confirmationUrl: null,
    comments: null,
  };
  for (const k of BOOKING_NULLABLE_STRINGS) out[k] = emptyToNull(input[k]);
  return out;
}

export function hotelBookingToDbPatchValues(
  input: HotelBookingPatch
): Partial<HotelBookingDbValues> {
  const out: Partial<HotelBookingDbValues> = {};
  if ("hotelId" in input && input.hotelId !== undefined) out.hotelId = input.hotelId;
  if ("roomBlockId" in input) {
    out.roomBlockId =
      input.roomBlockId === undefined || input.roomBlockId === ""
        ? null
        : input.roomBlockId;
  }
  if ("personKind" in input && input.personKind !== undefined)
    out.personKind = input.personKind;
  if ("personId" in input && input.personId !== undefined) out.personId = input.personId;
  if ("checkin" in input && input.checkin !== undefined) out.checkin = input.checkin;
  if ("checkout" in input && input.checkout !== undefined) out.checkout = input.checkout;
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("creditsAmountCents" in input) {
    out.creditsAmountCents = intOrNull(input.creditsAmountCents);
  }
  if ("creditsCurrency" in input) {
    out.creditsCurrency =
      input.creditsCurrency === undefined || input.creditsCurrency === ""
        ? null
        : input.creditsCurrency;
  }
  for (const k of BOOKING_NULLABLE_STRINGS) {
    if (k in input) out[k] = emptyToNull(input[k]);
  }
  return out;
}
