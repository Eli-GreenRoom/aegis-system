import type { Invoice, Payment } from "@/lib/payments/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_VENDOR_ID = "88888888-8888-4888-8888-888888888888";
export const FIXTURE_INVOICE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const FIXTURE_PAYMENT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

export const fixtureInvoice: Invoice = {
  id: FIXTURE_INVOICE_ID,
  workspaceId: null,
  festivalId: FIXTURE_EDITION_ID,
  number: "INV-001",
  issuerKind: "agency",
  issuerId: null,
  issueDate: "2026-04-01",
  dueDate: "2026-05-01",
  amountCents: 250000,
  currency: "USD",
  fileUrl: null,
  status: "received",
  comments: null,
  createdAt: new Date("2026-04-01T00:00:00Z"),
};

export const fixturePayment: Payment = {
  id: FIXTURE_PAYMENT_ID,
  workspaceId: null,
  festivalId: FIXTURE_EDITION_ID,
  artistId: FIXTURE_ARTIST_ID,
  vendorId: null,
  invoiceId: FIXTURE_INVOICE_ID,
  description: "Hiroko Yamamura - deposit",
  dueDate: "2026-05-01",
  amountCents: 100000,
  currency: "USD",
  popUrl: null,
  status: "pending",
  paidAt: null,
  paidVia: null,
  comments: null,
  createdAt: new Date("2026-04-01T00:00:00Z"),
};
