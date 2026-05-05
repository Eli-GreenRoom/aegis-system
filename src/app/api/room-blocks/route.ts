import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import {
  roomBlockInputSchema,
  roomBlockToDbValues,
} from "@/lib/hotels/schema";
import { createRoomBlock, listRoomBlocks } from "@/lib/hotels/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels");
  if (denied) return denied;

  const edition = await getCurrentEdition();
  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotelId") ?? undefined;
  const rows = await listRoomBlocks({ editionId: edition.id, hotelId });
  return Response.json({ roomBlocks: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = roomBlockInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const edition = await getCurrentEdition();
  const created = await createRoomBlock(
    edition.id,
    roomBlockToDbValues(parsed.data)
  );
  return Response.json({ roomBlock: created }, { status: 201 });
}
