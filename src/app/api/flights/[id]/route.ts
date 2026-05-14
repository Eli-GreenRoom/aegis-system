import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { flightPatchSchema, flightToDbPatchValues } from "@/lib/flights/schema";
import {
  buildUpdateFlight,
  deleteFlight,
  getFlight,
  updateFlight,
} from "@/lib/flights/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const flight = await getFlight(id);
  if (!flight) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ flight });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = flightPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getFlight(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = flightToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch &&
    patch.status !== undefined &&
    patch.status !== existing.status;

  if (statusChanged) {
    const [rows] = await db.batch([
      buildUpdateFlight(id, patch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "flight", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ flight: rows[0] ?? null });
  }

  const updated = await updateFlight(id, patch);
  return Response.json({ flight: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteFlight(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ flight: row });
}
