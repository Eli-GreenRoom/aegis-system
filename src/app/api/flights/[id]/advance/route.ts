import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { buildUpdateFlight, getFlight } from "@/lib/flights/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";
import type { FlightStatus } from "@/lib/flights/schema";

interface Ctx {
  params: Promise<{ id: string }>;
}

const NEXT_FORWARD: Partial<Record<FlightStatus, FlightStatus>> = {
  scheduled: "boarded",
  boarded: "in_air",
  in_air: "landed",
};

/**
 * POST /api/flights/[id]/advance
 *
 * One-tap forward state advance. The current status determines the next:
 *   scheduled -> boarded -> in_air -> landed
 * On `landed` the server stamps `actualDt = now()` (per
 * docs/OPERATIONS-FLOW.md -5: never trust user-typed timestamps on a
 * phone in a field). Audit row is written atomically via db.batch.
 *
 * No-op (returns the row unchanged) if the flight is already at a
 * terminal forward state (`landed` / `delayed` / `cancelled`).
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights");
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = await getFlight(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const next = NEXT_FORWARD[existing.status];
  if (!next) {
    return Response.json(
      {
        error: `Flight is already at terminal status '${existing.status}'. Use the planning UI to revise.`,
      },
      { status: 409 },
    );
  }

  const patch: Parameters<typeof buildUpdateFlight>[1] = { status: next };
  if (next === "landed" && !existing.actualDt) {
    patch.actualDt = new Date();
  }

  const [rows] = await db.batch([
    buildUpdateFlight(id, patch),
    recordTransition(db, {
      actorId: session.user.id,
      entity: { type: "flight", id },
      diff: { field: "status", from: existing.status, to: next },
    }),
  ]);

  return Response.json({ flight: rows[0] ?? null });
}
