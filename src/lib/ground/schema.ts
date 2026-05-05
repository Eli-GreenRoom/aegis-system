import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));

const optionalEmail = z
  .union([z.literal(""), z.string().trim().email()])
  .optional();

// ── Vendor ──────────────────────────────────────────────────────────────

export const vendorInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  service: z.string().trim().min(1).max(120),
  contactName: optionalString,
  contactEmail: optionalEmail,
  contactPhone: optionalString,
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type VendorInput = z.infer<typeof vendorInputSchema>;

export const vendorPatchSchema = vendorInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type VendorPatch = z.infer<typeof vendorPatchSchema>;

export interface VendorDbValues {
  name: string;
  service: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}

const NULLABLE_VENDOR_STRINGS = [
  "contactName",
  "contactEmail",
  "contactPhone",
  "notes",
] as const;

export function vendorToDbValues(input: VendorInput): VendorDbValues {
  const out: VendorDbValues = {
    name: input.name,
    service: input.service,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
  };
  for (const k of NULLABLE_VENDOR_STRINGS) {
    const v = input[k];
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}

export function vendorToDbPatchValues(
  input: VendorPatch
): Partial<VendorDbValues> {
  const out: Partial<VendorDbValues> = {};
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("service" in input && input.service !== undefined) out.service = input.service;
  for (const k of NULLABLE_VENDOR_STRINGS) {
    if (k in input) {
      const v = input[k];
      out[k] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}

// ── Pickup ──────────────────────────────────────────────────────────────

export const personKindEnum = z.enum(["artist", "crew"]);
export type PersonKind = z.infer<typeof personKindEnum>;

export const routeEnum = z.enum(["airport", "hotel", "stage", "other"]);
export type Route = z.infer<typeof routeEnum>;

export const pickupStatusEnum = z.enum([
  "scheduled",
  "dispatched",
  "completed",
  "cancelled",
]);
export type PickupStatus = z.infer<typeof pickupStatusEnum>;

export const currencyEnum = z.enum(["USD", "EUR"]);

const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "must be an ISO date-time",
});

const optionalUuid = z
  .union([z.literal(""), z.string().uuid()])
  .optional();

export const pickupInputSchema = z.object({
  personKind: personKindEnum,
  personId: z.string().uuid(),
  routeFrom: routeEnum,
  routeFromDetail: optionalString,
  routeTo: routeEnum,
  routeToDetail: optionalString,
  linkedFlightId: optionalUuid,
  pickupDt: isoDateTime,
  vehicleType: optionalString,
  vendorId: optionalUuid,
  driverName: optionalString,
  driverPhone: optionalString,
  costAmountCents: z.number().int().min(0).max(100_000_00).nullable().optional(),
  costCurrency: currencyEnum.optional().or(z.literal("")),
  status: pickupStatusEnum.optional(),
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type PickupInput = z.infer<typeof pickupInputSchema>;

// Partial: omit refine, then partial; refine again. pickupDt becomes optional.
const pickupPatchBase = z.object({
  personKind: personKindEnum,
  personId: z.string().uuid(),
  routeFrom: routeEnum,
  routeFromDetail: optionalString,
  routeTo: routeEnum,
  routeToDetail: optionalString,
  linkedFlightId: optionalUuid,
  pickupDt: isoDateTime,
  vehicleType: optionalString,
  vendorId: optionalUuid,
  driverName: optionalString,
  driverPhone: optionalString,
  costAmountCents: z.number().int().min(0).max(100_000_00).nullable().optional(),
  costCurrency: currencyEnum.optional().or(z.literal("")),
  status: pickupStatusEnum.optional(),
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
});
export const pickupPatchSchema = pickupPatchBase.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type PickupPatch = z.infer<typeof pickupPatchSchema>;

export interface PickupDbValues {
  personKind: PersonKind;
  personId: string;
  routeFrom: Route;
  routeFromDetail: string | null;
  routeTo: Route;
  routeToDetail: string | null;
  linkedFlightId: string | null;
  pickupDt: Date;
  vehicleType: string | null;
  vendorId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  costAmountCents: number | null;
  costCurrency: string | null;
  status: PickupStatus;
  comments: string | null;
}

const NULLABLE_PICKUP_STRINGS = [
  "routeFromDetail",
  "routeToDetail",
  "vehicleType",
  "driverName",
  "driverPhone",
  "comments",
] as const;

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export function pickupToDbValues(input: PickupInput): PickupDbValues {
  const out: PickupDbValues = {
    personKind: input.personKind,
    personId: input.personId,
    routeFrom: input.routeFrom,
    routeTo: input.routeTo,
    routeFromDetail: null,
    routeToDetail: null,
    linkedFlightId: emptyToNull(input.linkedFlightId),
    pickupDt: new Date(input.pickupDt),
    vehicleType: null,
    vendorId: emptyToNull(input.vendorId),
    driverName: null,
    driverPhone: null,
    costAmountCents:
      input.costAmountCents === undefined ? null : input.costAmountCents,
    costCurrency:
      input.costCurrency === undefined || input.costCurrency === ""
        ? null
        : input.costCurrency,
    status: input.status ?? "scheduled",
    comments: null,
  };
  for (const k of NULLABLE_PICKUP_STRINGS) {
    const v = input[k];
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}

export function pickupToDbPatchValues(
  input: PickupPatch
): Partial<PickupDbValues> {
  const out: Partial<PickupDbValues> = {};
  if ("personKind" in input && input.personKind !== undefined) out.personKind = input.personKind;
  if ("personId" in input && input.personId !== undefined) out.personId = input.personId;
  if ("routeFrom" in input && input.routeFrom !== undefined) out.routeFrom = input.routeFrom;
  if ("routeTo" in input && input.routeTo !== undefined) out.routeTo = input.routeTo;
  if ("linkedFlightId" in input) out.linkedFlightId = emptyToNull(input.linkedFlightId);
  if ("vendorId" in input) out.vendorId = emptyToNull(input.vendorId);
  if ("pickupDt" in input && input.pickupDt !== undefined) out.pickupDt = new Date(input.pickupDt);
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("costAmountCents" in input) {
    out.costAmountCents =
      input.costAmountCents === undefined ? null : input.costAmountCents;
  }
  if ("costCurrency" in input) {
    out.costCurrency =
      input.costCurrency === undefined || input.costCurrency === ""
        ? null
        : input.costCurrency;
  }
  for (const k of NULLABLE_PICKUP_STRINGS) {
    if (k in input) {
      const v = input[k];
      out[k] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}
