import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import {
  directionEnum,
  flightInputSchema,
  flightStatusEnum,
  flightToDbValues,
  personKindEnum,
} from "@/lib/flights/schema";
import { createFlight, listFlights } from "@/lib/flights/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights");
  if (denied) return denied;

  const edition = await getCurrentEdition();
  const url = new URL(req.url);

  const dir = url.searchParams.get("direction");
  const directionParsed = dir ? directionEnum.safeParse(dir) : null;

  const st = url.searchParams.get("status");
  const statusParsed = st ? flightStatusEnum.safeParse(st) : null;

  const pk = url.searchParams.get("personKind");
  const personKindParsed = pk ? personKindEnum.safeParse(pk) : null;

  const rows = await listFlights({
    editionId: edition.id,
    search: url.searchParams.get("search") ?? undefined,
    direction: directionParsed?.success ? directionParsed.data : undefined,
    status: statusParsed?.success ? statusParsed.data : undefined,
    personKind: personKindParsed?.success ? personKindParsed.data : undefined,
    personId: url.searchParams.get("personId") ?? undefined,
  });
  return Response.json({ flights: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = flightInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const edition = await getCurrentEdition();
  const created = await createFlight(edition.id, flightToDbValues(parsed.data));
  return Response.json({ flight: created }, { status: 201 });
}
