import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { invoices, payments } from "@/db/schema";
import type { InvoiceDbValues, PaymentDbValues, PaymentStatus } from "./schema";

export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;

// -- Invoices ------------------------------------------------------------

export interface ListInvoicesParams {
  festivalId: string;
  search?: string;
  status?: string;
  issuerKind?: string;
}

export async function listInvoices({
  festivalId,
  search,
  status,
  issuerKind,
}: ListInvoicesParams): Promise<Invoice[]> {
  const filters = [eq(invoices.festivalId, festivalId)];
  if (status) filters.push(eq(invoices.status, status));
  if (issuerKind) filters.push(eq(invoices.issuerKind, issuerKind));

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(invoices.number, q),
      ilike(invoices.issuerKind, q),
      ilike(invoices.comments, q),
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(invoices)
    .where(and(...filters))
    .orderBy(desc(invoices.createdAt));
}

export async function listInvoiceIssuerKinds(
  festivalId: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ kind: invoices.issuerKind })
    .from(invoices)
    .where(eq(invoices.festivalId, festivalId))
    .orderBy(asc(invoices.issuerKind));
  return rows.map((r) => r.kind).filter((k): k is string => !!k);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  return row ?? null;
}

export async function createInvoice(
  festivalId: string,
  input: InvoiceDbValues,
): Promise<Invoice> {
  const [row] = await db
    .insert(invoices)
    .values({ ...input, festivalId })
    .returning();
  return row;
}

export async function updateInvoice(
  id: string,
  input: Partial<InvoiceDbValues>,
): Promise<Invoice | null> {
  if (Object.keys(input).length === 0) return getInvoice(id);
  const [row] = await db
    .update(invoices)
    .set(input)
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

/** Unawaited update builder for use inside `db.batch([..., recordTransition])`. */
export function buildUpdateInvoice(
  id: string,
  input: Partial<InvoiceDbValues>,
) {
  return db.update(invoices).set(input).where(eq(invoices.id, id)).returning();
}

export async function deleteInvoice(id: string): Promise<Invoice | null> {
  const [row] = await db
    .delete(invoices)
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

// -- Payments ------------------------------------------------------------

export interface ListPaymentsParams {
  festivalId: string;
  search?: string;
  status?: PaymentStatus;
  artistId?: string;
  vendorId?: string;
  invoiceId?: string;
}

export async function listPayments({
  festivalId,
  search,
  status,
  artistId,
  vendorId,
  invoiceId,
}: ListPaymentsParams): Promise<Payment[]> {
  const filters = [eq(payments.festivalId, festivalId)];
  if (status) filters.push(eq(payments.status, status));
  if (artistId) filters.push(eq(payments.artistId, artistId));
  if (vendorId) filters.push(eq(payments.vendorId, vendorId));
  if (invoiceId) filters.push(eq(payments.invoiceId, invoiceId));

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(payments.description, q),
      ilike(payments.paidVia, q),
      ilike(payments.comments, q),
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(payments)
    .where(and(...filters))
    .orderBy(desc(payments.createdAt));
}

export async function getPayment(id: string): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  return row ?? null;
}

export async function createPayment(
  festivalId: string,
  input: PaymentDbValues,
): Promise<Payment> {
  const [row] = await db
    .insert(payments)
    .values({ ...input, festivalId })
    .returning();
  return row;
}

export async function updatePayment(
  id: string,
  input: Partial<PaymentDbValues>,
): Promise<Payment | null> {
  if (Object.keys(input).length === 0) return getPayment(id);
  const [row] = await db
    .update(payments)
    .set(input)
    .where(eq(payments.id, id))
    .returning();
  return row ?? null;
}

/** Unawaited update builder for use inside `db.batch([..., recordTransition])`. */
export function buildUpdatePayment(
  id: string,
  input: Partial<PaymentDbValues>,
) {
  return db.update(payments).set(input).where(eq(payments.id, id)).returning();
}

export async function deletePayment(id: string): Promise<Payment | null> {
  const [row] = await db
    .delete(payments)
    .where(eq(payments.id, id))
    .returning();
  return row ?? null;
}

// -- Aggregator (lightweight summary card) -------------------------------

export interface PaymentsSummary {
  /** Status counts. Zero-filled for every status so the UI can render
   *  consistent zero-state badges. */
  countsByStatus: Record<PaymentStatus, number>;
  /** Sum of `amountCents` per status, partitioned by currency since we
   *  don't convert. Currency is the row's currency, USD or EUR. */
  totalsByStatus: Record<PaymentStatus, { USD: number; EUR: number }>;
}

const ZERO_COUNTS: Record<PaymentStatus, number> = {
  pending: 0,
  due: 0,
  paid: 0,
  overdue: 0,
  void: 0,
};

/**
 * Roll-up of payment totals for the current edition. Used by the summary
 * card on `/payments`. Currencies are kept separate (USD vs EUR) - we
 * never convert. Returns aggregates as plain JS numbers so the UI can
 * format with `formatCents`.
 */
export async function getPaymentsSummary(
  festivalId: string,
): Promise<PaymentsSummary> {
  const rows = await db
    .select({
      status: payments.status,
      currency: payments.currency,
      total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(eq(payments.festivalId, festivalId))
    .groupBy(payments.status, payments.currency);

  const countsByStatus: Record<PaymentStatus, number> = { ...ZERO_COUNTS };
  const totalsByStatus: Record<PaymentStatus, { USD: number; EUR: number }> = {
    pending: { USD: 0, EUR: 0 },
    due: { USD: 0, EUR: 0 },
    paid: { USD: 0, EUR: 0 },
    overdue: { USD: 0, EUR: 0 },
    void: { USD: 0, EUR: 0 },
  };

  for (const r of rows) {
    countsByStatus[r.status] += r.count;
    if (r.currency === "USD") totalsByStatus[r.status].USD += r.total;
    if (r.currency === "EUR") totalsByStatus[r.status].EUR += r.total;
  }

  return { countsByStatus, totalsByStatus };
}
