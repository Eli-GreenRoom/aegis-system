import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { buildUpdatePickup, getPickup } from "@/lib/ground/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";
import type { PickupStatus } from "@/lib/ground/schema";

interface Ctx {
  params: Promise<{ id: string }>;
}

const NEXT_FORWARD: Partial<Record<PickupStatus, PickupStatus>> = {
  scheduled: "dispatched",
  dispatched: "in_transit",
  in_transit: "completed",
};

/**
 * POST /api/pickups/[id]/advance
 *
 * One-tap forward state advance. The current status determines the next:
 *   scheduled -> dispatched -> in_transit -> completed
 * Click time is stamped to the matching column server-side
 * (`dispatchedAt`, `inTransitAt`, `completedAt`). Audit row written
 * atomically via db.batch.
 *
 * 409 when the pickup is already at a terminal forward state
 * (`completed` / `cancelled`).
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = await getPickup(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const next = NEXT_FORWARD[existing.status];
  if (!next) {
    return Response.json(
      {
        error: `Pickup is already at terminal status '${existing.status}'. Use the planning UI to revise.`,
      },
      { status: 409 },
    );
  }

  const patch: Parameters<typeof buildUpdatePickup>[1] = { status: next };
  const now = new Date();
  if (next === "dispatched" && !existing.dispatchedAt) patch.dispatchedAt = now;
  if (next === "in_transit" && !existing.inTransitAt) patch.inTransitAt = now;
  if (next === "completed" && !existing.completedAt) patch.completedAt = now;

  const [rows] = await db.batch([
    buildUpdatePickup(id, patch),
    recordTransition(db, {
      actorId: session.user.id,
      entity: { type: "pickup", id },
      diff: { field: "status", from: existing.status, to: next },
    }),
  ]);

  return Response.json({ pickup: rows[0] ?? null });
}
