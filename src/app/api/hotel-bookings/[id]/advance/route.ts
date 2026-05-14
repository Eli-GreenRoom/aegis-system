import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { buildUpdateBooking, getBooking } from "@/lib/hotels/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";
import type { HotelBookingStatus } from "@/lib/hotels/schema";

interface Ctx {
  params: Promise<{ id: string }>;
}

const NEXT_FORWARD: Partial<Record<HotelBookingStatus, HotelBookingStatus>> = {
  tentative: "booked",
  booked: "checked_in",
  checked_in: "checked_out",
};

/**
 * POST /api/hotel-bookings/[id]/advance
 *
 * One-tap forward state advance:
 *   tentative -> booked -> checked_in -> checked_out
 * `checkedInAt` and `checkedOutAt` are stamped server-side on the
 * matching transition. Audit row written atomically via db.batch.
 *
 * 409 when the booking is already at a terminal forward state
 * (`checked_out` / `no_show` / `cancelled`).
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = await getBooking(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const next = NEXT_FORWARD[existing.status];
  if (!next) {
    return Response.json(
      {
        error: `Booking is already at terminal status '${existing.status}'. Use the planning UI to revise.`,
      },
      { status: 409 },
    );
  }

  const patch: Parameters<typeof buildUpdateBooking>[1] = { status: next };
  const now = new Date();
  if (next === "checked_in" && !existing.checkedInAt) patch.checkedInAt = now;
  if (next === "checked_out" && !existing.checkedOutAt)
    patch.checkedOutAt = now;

  const [rows] = await db.batch([
    buildUpdateBooking(id, patch),
    recordTransition(db, {
      actorId: session.user.id,
      entity: { type: "hotel_booking", id },
      diff: { field: "status", from: existing.status, to: next },
    }),
  ]);

  return Response.json({ booking: rows[0] ?? null });
}
