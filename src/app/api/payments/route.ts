import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import {
  paymentInputSchema,
  paymentStatusEnum,
  paymentToDbValues,
} from "@/lib/payments/schema";
import { createPayment, listPayments } from "@/lib/payments/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.view");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const statusRaw = url.searchParams.get("status") ?? undefined;
  const statusParsed = statusRaw
    ? paymentStatusEnum.safeParse(statusRaw)
    : null;
  const artistId = url.searchParams.get("artistId") ?? undefined;
  const vendorId = url.searchParams.get("vendorId") ?? undefined;
  const invoiceId = url.searchParams.get("invoiceId") ?? undefined;

  const rows = await listPayments({
    festivalId: festival.id,
    search,
    status: statusParsed?.success ? statusParsed.data : undefined,
    artistId,
    vendorId,
    invoiceId,
  });
  return Response.json({ payments: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.edit");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = paymentInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const created = await createPayment(
    festival.id,
    paymentToDbValues(parsed.data),
  );
  return Response.json({ payment: created }, { status: 201 });
}
