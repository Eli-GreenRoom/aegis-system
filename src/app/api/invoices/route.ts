import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import { invoiceInputSchema, invoiceToDbValues } from "@/lib/payments/schema";
import { createInvoice, listInvoices } from "@/lib/payments/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments");
  if (denied) return denied;

  const edition = await getCurrentEdition();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const issuerKind = url.searchParams.get("issuerKind") ?? undefined;

  const rows = await listInvoices({
    editionId: edition.id,
    search,
    status,
    issuerKind,
  });
  return Response.json({ invoices: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = invoiceInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const edition = await getCurrentEdition();
  const created = await createInvoice(edition.id, invoiceToDbValues(parsed.data));
  return Response.json({ invoice: created }, { status: 201 });
}
