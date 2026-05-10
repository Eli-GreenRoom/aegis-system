import { and, asc, eq, ilike, or, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { hotels, hotelRoomBlocks, hotelBookings } from "@/db/schema";
import type {
  HotelBookingDbValues,
  HotelBookingStatus,
  HotelDbValues,
  PersonKind,
  RoomBlockDbValues,
} from "./schema";

export type Hotel = typeof hotels.$inferSelect;
export type RoomBlock = typeof hotelRoomBlocks.$inferSelect;
export type Booking = typeof hotelBookings.$inferSelect;

// -- Hotels (venue catalogue, not edition-scoped) -------------------------

export interface ListHotelsParams {
  search?: string;
}

export async function listHotels({ search }: ListHotelsParams = {}): Promise<
  Hotel[]
> {
  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(hotels.name, q),
      ilike(hotels.location, q),
      ilike(hotels.address, q),
    );
    if (searchOr) {
      return db.select().from(hotels).where(searchOr).orderBy(asc(hotels.name));
    }
  }
  return db.select().from(hotels).orderBy(asc(hotels.name));
}

export async function getHotel(id: string): Promise<Hotel | null> {
  const [row] = await db
    .select()
    .from(hotels)
    .where(eq(hotels.id, id))
    .limit(1);
  return row ?? null;
}

export async function createHotel(input: HotelDbValues): Promise<Hotel> {
  const [row] = await db.insert(hotels).values(input).returning();
  return row;
}

export async function updateHotel(
  id: string,
  input: Partial<HotelDbValues>,
): Promise<Hotel | null> {
  if (Object.keys(input).length === 0) return getHotel(id);
  const [row] = await db
    .update(hotels)
    .set(input)
    .where(eq(hotels.id, id))
    .returning();
  return row ?? null;
}

export async function deleteHotel(id: string): Promise<Hotel | null> {
  const [row] = await db.delete(hotels).where(eq(hotels.id, id)).returning();
  return row ?? null;
}

// -- Room blocks (edition-scoped deals) -----------------------------------

export interface ListRoomBlocksParams {
  editionId: string;
  hotelId?: string;
}

export async function listRoomBlocks({
  editionId,
  hotelId,
}: ListRoomBlocksParams): Promise<RoomBlock[]> {
  const filters = [eq(hotelRoomBlocks.editionId, editionId)];
  if (hotelId) filters.push(eq(hotelRoomBlocks.hotelId, hotelId));
  return db
    .select()
    .from(hotelRoomBlocks)
    .where(and(...filters))
    .orderBy(asc(hotelRoomBlocks.hotelId), asc(hotelRoomBlocks.roomType));
}

export async function getRoomBlock(id: string): Promise<RoomBlock | null> {
  const [row] = await db
    .select()
    .from(hotelRoomBlocks)
    .where(eq(hotelRoomBlocks.id, id))
    .limit(1);
  return row ?? null;
}

export async function createRoomBlock(
  editionId: string,
  input: RoomBlockDbValues,
): Promise<RoomBlock> {
  const [row] = await db
    .insert(hotelRoomBlocks)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updateRoomBlock(
  id: string,
  input: Partial<RoomBlockDbValues>,
): Promise<RoomBlock | null> {
  if (Object.keys(input).length === 0) return getRoomBlock(id);
  const [row] = await db
    .update(hotelRoomBlocks)
    .set(input)
    .where(eq(hotelRoomBlocks.id, id))
    .returning();
  return row ?? null;
}

export async function deleteRoomBlock(id: string): Promise<RoomBlock | null> {
  const [row] = await db
    .delete(hotelRoomBlocks)
    .where(eq(hotelRoomBlocks.id, id))
    .returning();
  return row ?? null;
}

// -- Bookings (per-person assignments) ------------------------------------

export interface ListBookingsParams {
  editionId?: string;
  hotelId?: string;
  roomBlockId?: string;
  personKind?: PersonKind;
  personId?: string;
  status?: HotelBookingStatus;
  /** Date range filter: bookings active at any point in [from, to]. */
  activeFrom?: string;
  activeTo?: string;
}

export async function listBookings(
  params: ListBookingsParams = {},
): Promise<Booking[]> {
  const filters = [];
  if (params.hotelId) filters.push(eq(hotelBookings.hotelId, params.hotelId));
  if (params.roomBlockId)
    filters.push(eq(hotelBookings.roomBlockId, params.roomBlockId));
  if (params.personKind)
    filters.push(eq(hotelBookings.personKind, params.personKind));
  if (params.personId)
    filters.push(eq(hotelBookings.personId, params.personId));
  if (params.status) filters.push(eq(hotelBookings.status, params.status));

  // Overlap check: a booking is active in [from, to] when checkin <= to AND
  // checkout >= from. Both bounds are date strings; date comparisons work
  // because the column is `date`.
  if (params.activeFrom)
    filters.push(gte(hotelBookings.checkout, params.activeFrom));
  if (params.activeTo)
    filters.push(lte(hotelBookings.checkin, params.activeTo));

  // edition filter goes through the linked block. Bookings without a block
  // (walk-up) are scoped only by date / hotel.
  if (params.editionId) {
    const blockIds = await db
      .select({ id: hotelRoomBlocks.id })
      .from(hotelRoomBlocks)
      .where(eq(hotelRoomBlocks.editionId, params.editionId));
    const ids = blockIds.map((r) => r.id);
    if (ids.length === 0) {
      // No blocks for this edition - return only walk-up bookings (no block).
      filters.push(sql`${hotelBookings.roomBlockId} IS NULL`);
    } else {
      const blockFilter = or(
        inArray(hotelBookings.roomBlockId, ids),
        sql`${hotelBookings.roomBlockId} IS NULL`,
      );
      if (blockFilter) filters.push(blockFilter);
    }
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const q = db.select().from(hotelBookings);
  return where
    ? q.where(where).orderBy(asc(hotelBookings.checkin))
    : q.orderBy(asc(hotelBookings.checkin));
}

export async function getBooking(id: string): Promise<Booking | null> {
  const [row] = await db
    .select()
    .from(hotelBookings)
    .where(eq(hotelBookings.id, id))
    .limit(1);
  return row ?? null;
}

export async function createBooking(
  input: HotelBookingDbValues,
): Promise<Booking> {
  const [row] = await db.insert(hotelBookings).values(input).returning();
  return row;
}

export async function updateBooking(
  id: string,
  input: Partial<HotelBookingDbValues>,
): Promise<Booking | null> {
  if (Object.keys(input).length === 0) return getBooking(id);
  const [row] = await db
    .update(hotelBookings)
    .set(input)
    .where(eq(hotelBookings.id, id))
    .returning();
  return row ?? null;
}

/** Unawaited update builder for use inside `db.batch([..., recordTransition])`. */
export function buildUpdateBooking(
  id: string,
  input: Partial<HotelBookingDbValues>,
) {
  return db
    .update(hotelBookings)
    .set(input)
    .where(eq(hotelBookings.id, id))
    .returning();
}

export async function deleteBooking(id: string): Promise<Booking | null> {
  const [row] = await db
    .delete(hotelBookings)
    .where(eq(hotelBookings.id, id))
    .returning();
  return row ?? null;
}

// -- Capacity -------------------------------------------------------------

export interface BlockCapacity {
  reserved: number;
  /** Peak overlap count of non-cancelled bookings against this block. */
  peakAssigned: number;
  free: number;
}

/**
 * Capacity is computed by sweeping booking date ranges and tracking the
 * peak number of overlapping non-cancelled bookings. `free = reserved -
 * peak`. A negative `free` means Eli is overbooked - flag it in the UI.
 */
export async function getBlockCapacity(
  blockId: string,
): Promise<BlockCapacity> {
  const [block] = await db
    .select({ roomsReserved: hotelRoomBlocks.roomsReserved })
    .from(hotelRoomBlocks)
    .where(eq(hotelRoomBlocks.id, blockId))
    .limit(1);
  const reserved = block?.roomsReserved ?? 0;

  const rows = await db
    .select({
      checkin: hotelBookings.checkin,
      checkout: hotelBookings.checkout,
      status: hotelBookings.status,
    })
    .from(hotelBookings)
    .where(
      and(
        eq(hotelBookings.roomBlockId, blockId),
        sql`${hotelBookings.status} <> 'cancelled'`,
      ),
    );

  // Peak overlap via a sweep line over (date, +1/-1) events.
  type Ev = { date: string; delta: number };
  const events: Ev[] = [];
  for (const r of rows) {
    events.push({ date: r.checkin, delta: +1 });
    events.push({ date: r.checkout, delta: -1 });
  }
  events.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.delta - b.delta,
  );
  let cur = 0;
  let peak = 0;
  for (const e of events) {
    cur += e.delta;
    if (cur > peak) peak = cur;
  }

  return { reserved, peakAssigned: peak, free: reserved - peak };
}
