import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import {
  hotelBookingPatchSchema,
  hotelBookingToDbPatchValues,
} from "@/lib/hotels/schema";
import {
  buildUpdateBooking,
  deleteBooking,
  getBooking,
  updateBooking,
} from "@/lib/hotels/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";

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
  const row = await getBooking(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ booking: row });
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

  const parsed = hotelBookingPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getBooking(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = hotelBookingToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch &&
    patch.status !== undefined &&
    patch.status !== existing.status;

  if (statusChanged) {
    const [rows] = await db.batch([
      buildUpdateBooking(id, patch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "hotel_booking", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ booking: rows[0] ?? null });
  }

  const updated = await updateBooking(id, patch);
  return Response.json({ booking: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteBooking(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ booking: row });
}
