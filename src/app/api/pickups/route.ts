import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import {
  personKindEnum,
  pickupInputSchema,
  pickupStatusEnum,
  pickupToDbValues,
  routeEnum,
} from "@/lib/ground/schema";
import { createPickup, listPickups } from "@/lib/ground/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);

  const st = url.searchParams.get("status");
  const stp = st ? pickupStatusEnum.safeParse(st) : null;
  const fr = url.searchParams.get("routeFrom");
  const frp = fr ? routeEnum.safeParse(fr) : null;
  const to = url.searchParams.get("routeTo");
  const top = to ? routeEnum.safeParse(to) : null;
  const pk = url.searchParams.get("personKind");
  const pkp = pk ? personKindEnum.safeParse(pk) : null;

  const rows = await listPickups({
    festivalId: festival.id,
    search: url.searchParams.get("search") ?? undefined,
    status: stp?.success ? stp.data : undefined,
    routeFrom: frp?.success ? frp.data : undefined,
    routeTo: top?.success ? top.data : undefined,
    personKind: pkp?.success ? pkp.data : undefined,
    personId: url.searchParams.get("personId") ?? undefined,
    vendorId: url.searchParams.get("vendorId") ?? undefined,
  });
  return Response.json({ pickups: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pickupInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const created = await createPickup(
    festival.id,
    pickupToDbValues(parsed.data),
  );
  return Response.json({ pickup: created }, { status: 201 });
}
