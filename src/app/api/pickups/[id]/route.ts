import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { pickupPatchSchema, pickupToDbPatchValues } from "@/lib/ground/schema";
import { deletePickup, getPickup, updatePickup } from "@/lib/ground/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const { id } = await ctx.params;
  const pickup = await getPickup(id);
  if (!pickup) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ pickup });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pickupPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await getPickup(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updatePickup(id, pickupToDbPatchValues(parsed.data));
  return Response.json({ pickup: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deletePickup(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ pickup: row });
}
