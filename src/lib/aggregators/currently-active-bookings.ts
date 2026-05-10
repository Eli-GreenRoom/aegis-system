import { and, asc, eq, gt, lte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { hotelBookings, hotelRoomBlocks, hotels } from "@/db/schema";
import { resolvePeople, type Person } from "@/lib/people";

export interface ActiveBooking {
  booking: typeof hotelBookings.$inferSelect;
  hotel: { id: string; name: string };
  person: Person | null;
}

/**
 * Hotel bookings active on `date`: `checkin <= date < checkout`. Powers
 * the festival-day "who's where right now" view.
 *
 * Edition scope is enforced via the linked room block (the same path the
 * hotels module uses). Walk-up bookings (no `roomBlockId`) are included
 * regardless of edition since they can't be otherwise scoped.
 *
 * Spec: docs/OPERATIONS-FLOW.md -4.
 */
export async function getCurrentlyActiveBookings(
  editionId: string,
  date: string,
): Promise<ActiveBooking[]> {
  // Limit to bookings whose linked block is in this edition (or no block).
  const blockRows = await db
    .select({ id: hotelRoomBlocks.id })
    .from(hotelRoomBlocks)
    .where(eq(hotelRoomBlocks.editionId, editionId));
  const editionBlockIds = blockRows.map((b) => b.id);

  const bookingRows = await db
    .select()
    .from(hotelBookings)
    .where(
      and(lte(hotelBookings.checkin, date), gt(hotelBookings.checkout, date)),
    )
    .orderBy(asc(hotelBookings.checkin));

  const scoped = bookingRows.filter(
    (b) => b.roomBlockId === null || editionBlockIds.includes(b.roomBlockId),
  );

  if (scoped.length === 0) return [];

  const hotelIds = [...new Set(scoped.map((b) => b.hotelId))];
  const hotelRows = await db
    .select({ id: hotels.id, name: hotels.name })
    .from(hotels)
    .where(inArray(hotels.id, hotelIds));
  const hotelsById = new Map(hotelRows.map((h) => [h.id, h]));

  const people = await resolvePeople(
    scoped.map((b) => ({ kind: b.personKind, id: b.personId })),
  );

  return scoped
    .filter((b) => hotelsById.has(b.hotelId))
    .map((booking) => ({
      booking,
      hotel: hotelsById.get(booking.hotelId)!,
      person: people.get(`${booking.personKind}:${booking.personId}`) ?? null,
    }));
}
