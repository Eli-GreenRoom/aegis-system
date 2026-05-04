import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { setInputSchema, setToDbValues } from "@/lib/lineup/schema";
import {
  createSet,
  listSetsForArtist,
  listSetsForSlot,
} from "@/lib/lineup/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup");
  if (denied) return denied;

  const url = new URL(req.url);
  const slotId = url.searchParams.get("slotId");
  const artistId = url.searchParams.get("artistId");

  if (!slotId && !artistId) {
    return Response.json(
      { error: "Provide slotId or artistId" },
      { status: 400 }
    );
  }

  const rows = slotId
    ? await listSetsForSlot(slotId)
    : await listSetsForArtist(artistId!);
  return Response.json({ sets: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await createSet(setToDbValues(parsed.data));
  return Response.json({ set: created }, { status: 201 });
}
