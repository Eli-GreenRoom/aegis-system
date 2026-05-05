import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { pickupPatchSchema, pickupToDbPatchValues } from "@/lib/ground/schema";
import {
  buildUpdatePickup,
  deletePickup,
  getPickup,
  updatePickup,
} from "@/lib/ground/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";

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

  const patch = pickupToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch && patch.status !== undefined && patch.status !== existing.status;

  if (statusChanged) {
    const [rows] = await db.batch([
      buildUpdatePickup(id, patch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "pickup", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ pickup: rows[0] ?? null });
  }

  const updated = await updatePickup(id, patch);
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
