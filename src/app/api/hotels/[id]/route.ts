import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { hotelPatchSchema, hotelToDbPatchValues } from "@/lib/hotels/schema";
import { deleteHotel, getHotel, updateHotel } from "@/lib/hotels/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getHotel(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ hotel: row });
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

  const parsed = hotelPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getHotel(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateHotel(id, hotelToDbPatchValues(parsed.data));
  return Response.json({ hotel: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteHotel(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ hotel: row });
}
