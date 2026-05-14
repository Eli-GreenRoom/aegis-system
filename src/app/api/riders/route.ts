import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import {
  riderInputSchema,
  riderKindEnum,
  riderToDbValues,
} from "@/lib/riders/schema";
import { createRider, listRiders } from "@/lib/riders/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "riders.view");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);
  const artistId = url.searchParams.get("artistId") ?? undefined;
  const kindRaw = url.searchParams.get("kind") ?? undefined;
  const kindParsed = kindRaw ? riderKindEnum.safeParse(kindRaw) : null;
  const confirmedRaw = url.searchParams.get("confirmed");
  const confirmed =
    confirmedRaw === "true"
      ? true
      : confirmedRaw === "false"
        ? false
        : undefined;

  const rows = await listRiders({
    festivalId: festival.id,
    artistId,
    kind: kindParsed?.success ? kindParsed.data : undefined,
    confirmed,
  });
  return Response.json({ riders: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "riders.edit");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = riderInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await createRider(riderToDbValues(parsed.data));
  return Response.json({ rider: created }, { status: 201 });
}
