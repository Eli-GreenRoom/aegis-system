import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import {
  roomBlockPatchSchema,
  roomBlockToDbPatchValues,
} from "@/lib/hotels/schema";
import {
  deleteRoomBlock,
  getBlockCapacity,
  getRoomBlock,
  updateRoomBlock,
} from "@/lib/hotels/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getRoomBlock(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const includeCapacity = url.searchParams.get("capacity") === "1";
  if (includeCapacity) {
    const capacity = await getBlockCapacity(id);
    return Response.json({ roomBlock: row, capacity });
  }
  return Response.json({ roomBlock: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = roomBlockPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getRoomBlock(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateRoomBlock(
    id,
    roomBlockToDbPatchValues(parsed.data),
  );
  return Response.json({ roomBlock: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteRoomBlock(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ roomBlock: row });
}
