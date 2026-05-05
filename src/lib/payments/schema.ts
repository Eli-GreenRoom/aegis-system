import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("must be a valid URL")])
  .optional();

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).optional();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
const optionalIsoDate = z
  .union([z.literal(""), isoDate])
  .optional();

export const currencyEnum = z.enum(["USD", "EUR"]);
export type Currency = z.infer<typeof currencyEnum>;

// ── Invoice ─────────────────────────────────────────────────────────────

/**
 * Issuer kind is open text rather than an enum — invoices come from
 * artists, agencies, hotels, vendors, freight, catering, you name it.
 * Locking to an enum now would just slow Eli down. The UI suggests a
 * few common values via a datalist but accepts anything.
 */
export const invoiceInputSchema = z.object({
  number: optionalString,
  issuerKind: z.string().trim().min(1).max(80),
  issuerId: optionalUuid,
  issueDate: optionalIsoDate,
  dueDate: optionalIsoDate,
  amountCents: z.number().int().min(0).max(100_000_000_00),
  currency: currencyEnum,
  fileUrl: optionalUrl,
  status: z.string().trim().min(1).max(40).optional(),
  comments: optionalText,
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const invoicePatchSchema = invoiceInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type InvoicePatch = z.infer<typeof invoicePatchSchema>;

export interface InvoiceDbValues {
  number: string | null;
  issuerKind: string;
  issuerId: string | null;
  issueDate: string | null;
  dueDate: string | null;
  amountCents: number;
  currency: string;
  fileUrl: string | null;
  status: string;
  comments: string | null;
}

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export function invoiceToDbValues(input: InvoiceInput): InvoiceDbValues {
  return {
    number: emptyToNull(input.number),
    issuerKind: input.issuerKind,
    issuerId: emptyToNull(input.issuerId),
    issueDate: emptyToNull(input.issueDate),
    dueDate: emptyToNull(input.dueDate),
    amountCents: input.amountCents,
    currency: input.currency,
    fileUrl: emptyToNull(input.fileUrl),
    status: input.status ?? "received",
    comments: emptyToNull(input.comments),
  };
}

export function invoiceToDbPatchValues(
  input: InvoicePatch
): Partial<InvoiceDbValues> {
  const out: Partial<InvoiceDbValues> = {};
  if ("issuerKind" in input && input.issuerKind !== undefined)
    out.issuerKind = input.issuerKind;
  if ("amountCents" in input && input.amountCents !== undefined)
    out.amountCents = input.amountCents;
  if ("currency" in input && input.currency !== undefined)
    out.currency = input.currency;
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("number" in input) out.number = emptyToNull(input.number);
  if ("issuerId" in input) out.issuerId = emptyToNull(input.issuerId);
  if ("issueDate" in input) out.issueDate = emptyToNull(input.issueDate);
  if ("dueDate" in input) out.dueDate = emptyToNull(input.dueDate);
  if ("fileUrl" in input) out.fileUrl = emptyToNull(input.fileUrl);
  if ("comments" in input) out.comments = emptyToNull(input.comments);
  return out;
}

// ── Payment ─────────────────────────────────────────────────────────────

export const paymentStatusEnum = z.enum([
  "pending",
  "due",
  "paid",
  "overdue",
  "void",
]);
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

const isoDateTime = z
  .union([
    z.literal(""),
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "must be an ISO date-time",
    }),
  ])
  .optional();

export const paymentInputSchema = z.object({
  artistId: optionalUuid,
  vendorId: optionalUuid,
  invoiceId: optionalUuid,
  description: z.string().trim().min(1).max(500),
  dueDate: optionalIsoDate,
  amountCents: z.number().int().min(0).max(100_000_000_00),
  currency: currencyEnum,
  popUrl: optionalUrl,
  status: paymentStatusEnum.optional(),
  paidAt: isoDateTime,
  paidVia: optionalString,
  comments: optionalText,
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const paymentPatchSchema = paymentInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type PaymentPatch = z.infer<typeof paymentPatchSchema>;

export interface PaymentDbValues {
  artistId: string | null;
  vendorId: string | null;
  invoiceId: string | null;
  description: string;
  dueDate: string | null;
  amountCents: number;
  currency: string;
  popUrl: string | null;
  status: PaymentStatus;
  paidAt: Date | null;
  paidVia: string | null;
  comments: string | null;
}

function dt(v: string | undefined): Date | null {
  if (v === undefined || v === "") return null;
  return new Date(v);
}

export function paymentToDbValues(input: PaymentInput): PaymentDbValues {
  return {
    artistId: emptyToNull(input.artistId),
    vendorId: emptyToNull(input.vendorId),
    invoiceId: emptyToNull(input.invoiceId),
    description: input.description,
    dueDate: emptyToNull(input.dueDate),
    amountCents: input.amountCents,
    currency: input.currency,
    popUrl: emptyToNull(input.popUrl),
    status: input.status ?? "pending",
    paidAt: dt(input.paidAt),
    paidVia: emptyToNull(input.paidVia),
    comments: emptyToNull(input.comments),
  };
}

export function paymentToDbPatchValues(
  input: PaymentPatch
): Partial<PaymentDbValues> {
  const out: Partial<PaymentDbValues> = {};
  if ("description" in input && input.description !== undefined)
    out.description = input.description;
  if ("amountCents" in input && input.amountCents !== undefined)
    out.amountCents = input.amountCents;
  if ("currency" in input && input.currency !== undefined)
    out.currency = input.currency;
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("artistId" in input) out.artistId = emptyToNull(input.artistId);
  if ("vendorId" in input) out.vendorId = emptyToNull(input.vendorId);
  if ("invoiceId" in input) out.invoiceId = emptyToNull(input.invoiceId);
  if ("dueDate" in input) out.dueDate = emptyToNull(input.dueDate);
  if ("popUrl" in input) out.popUrl = emptyToNull(input.popUrl);
  if ("paidAt" in input) out.paidAt = dt(input.paidAt);
  if ("paidVia" in input) out.paidVia = emptyToNull(input.paidVia);
  if ("comments" in input) out.comments = emptyToNull(input.comments);
  return out;
}
