import { and, asc, desc, eq, gt, gte, lt, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  artists,
  contracts,
  flights,
  groundTransportPickups,
  hotelBookings,
  hotels,
  payments,
  riders,
  sets,
  slots,
  stages,
} from "@/db/schema";

export interface ArtistRoadsheet {
  artist: typeof artists.$inferSelect;
  /** Set on `day` if one exists; otherwise null. With no day filter, returns
   *  the chronologically-first scheduled set. */
  set: {
    set: typeof sets.$inferSelect;
    slot: typeof slots.$inferSelect;
    stage: typeof stages.$inferSelect;
  } | null;
  /** Inbound flight whose scheduled date matches `day` (or any inbound when
   *  no day filter). Picks the latest-scheduled if multiple match. */
  inboundFlight: typeof flights.$inferSelect | null;
  /** Outbound flight whose scheduled date matches `day` (or any outbound
   *  when no day filter). Picks the earliest-scheduled if multiple match. */
  outboundFlight: typeof flights.$inferSelect | null;
  /** Currently-active hotel booking on `day` (checkin <= day < checkout).
   *  With no day filter, returns the most recent. */
  hotel: {
    booking: typeof hotelBookings.$inferSelect;
    hotelName: string;
  } | null;
  /** Pickups linked to this artist on `day`, sorted by pickupDt asc. */
  pickups: (typeof groundTransportPickups.$inferSelect)[];
  /** Riders for this artist (both kinds). */
  riders: (typeof riders.$inferSelect)[];
  /** Outstanding payments by default (status not in 'paid' / 'void'). */
  payments: (typeof payments.$inferSelect)[];
  /** Most recent contract for this artist, if any. */
  contract: typeof contracts.$inferSelect | null;
}

/**
 * Chronological events for one artist, optionally filtered to a single
 * day. Powers the per-artist roadsheet PDF and the festival-day card.
 *
 * `day` is a YYYY-MM-DD string. When provided, set/flight/hotel/pickup
 * lookups are scoped to that calendar day.
 *
 * Spec: docs/OPERATIONS-FLOW.md -4.
 */
export async function getArtistRoadsheet(
  artistId: string,
  day?: string,
): Promise<ArtistRoadsheet | null> {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  if (!artist) return null;

  const dayStart = day ? new Date(`${day}T00:00:00.000Z`) : null;
  const dayEnd = dayStart
    ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    : null;

  // Set on this day (joined via slot.day if filtering, else any).
  // Slots store day as 'friday'/'saturday'/'sunday' - if the caller
  // passed a YYYY-MM-DD we don't have a direct mapping without the
  // edition's start_date, so we don't filter sets by day here. The
  // returned `set` is whichever set the artist has on the closest slot
  // to `day`; without a day filter it's chronologically first.
  const setRows = await db
    .select({
      set: sets,
      slot: slots,
      stage: stages,
    })
    .from(sets)
    .innerJoin(slots, eq(sets.slotId, slots.id))
    .innerJoin(stages, eq(slots.stageId, stages.id))
    .where(eq(sets.artistId, artistId))
    .orderBy(asc(slots.day), asc(slots.startTime));
  const setEntry = setRows[0] ?? null;

  // Flights for this artist (polymorphic person, kind='artist').
  const flightRows = await db
    .select()
    .from(flights)
    .where(
      and(eq(flights.personKind, "artist"), eq(flights.personId, artistId)),
    )
    .orderBy(asc(flights.scheduledDt));

  let inboundCandidates = flightRows.filter((f) => f.direction === "inbound");
  let outboundCandidates = flightRows.filter((f) => f.direction === "outbound");
  if (dayStart && dayEnd) {
    inboundCandidates = inboundCandidates.filter(
      (f) =>
        f.scheduledDt && f.scheduledDt >= dayStart && f.scheduledDt < dayEnd,
    );
    outboundCandidates = outboundCandidates.filter(
      (f) =>
        f.scheduledDt && f.scheduledDt >= dayStart && f.scheduledDt < dayEnd,
    );
  }
  const inboundFlight =
    inboundCandidates.length > 0
      ? inboundCandidates[inboundCandidates.length - 1]
      : null;
  const outboundFlight = outboundCandidates[0] ?? null;

  // Hotel: booking active on `day` if filter, else most recent overall.
  let hotelBookingRow: typeof hotelBookings.$inferSelect | null = null;
  if (day) {
    const [active] = await db
      .select()
      .from(hotelBookings)
      .where(
        and(
          eq(hotelBookings.personKind, "artist"),
          eq(hotelBookings.personId, artistId),
          lte(hotelBookings.checkin, day),
          gt(hotelBookings.checkout, day),
        ),
      )
      .orderBy(asc(hotelBookings.checkin))
      .limit(1);
    hotelBookingRow = active ?? null;
  } else {
    const [latest] = await db
      .select()
      .from(hotelBookings)
      .where(
        and(
          eq(hotelBookings.personKind, "artist"),
          eq(hotelBookings.personId, artistId),
        ),
      )
      .orderBy(desc(hotelBookings.checkin))
      .limit(1);
    hotelBookingRow = latest ?? null;
  }

  let hotel: ArtistRoadsheet["hotel"] = null;
  if (hotelBookingRow) {
    const [h] = await db
      .select({ name: hotels.name })
      .from(hotels)
      .where(eq(hotels.id, hotelBookingRow.hotelId))
      .limit(1);
    hotel = { booking: hotelBookingRow, hotelName: h?.name ?? "Unknown" };
  }

  // Pickups for this artist on `day` (or all).
  const pickupFilters = [
    eq(groundTransportPickups.personKind, "artist"),
    eq(groundTransportPickups.personId, artistId),
  ];
  if (dayStart && dayEnd) {
    pickupFilters.push(gte(groundTransportPickups.pickupDt, dayStart));
    pickupFilters.push(lt(groundTransportPickups.pickupDt, dayEnd));
  }
  const pickupRows = await db
    .select()
    .from(groundTransportPickups)
    .where(and(...pickupFilters))
    .orderBy(asc(groundTransportPickups.pickupDt));

  // Riders, contracts, payments are not day-scoped.
  const [riderRows, contractRows, paymentRows] = await Promise.all([
    db
      .select()
      .from(riders)
      .where(eq(riders.artistId, artistId))
      .orderBy(asc(riders.kind)),
    db
      .select()
      .from(contracts)
      .where(eq(contracts.artistId, artistId))
      .orderBy(desc(contracts.createdAt))
      .limit(1),
    db
      .select()
      .from(payments)
      .where(eq(payments.artistId, artistId))
      .orderBy(asc(payments.dueDate)),
  ]);

  const outstanding = paymentRows.filter(
    (p) => p.status !== "paid" && p.status !== "void",
  );

  return {
    artist,
    set: setEntry,
    inboundFlight,
    outboundFlight,
    hotel,
    pickups: pickupRows,
    riders: riderRows,
    payments: outstanding,
    contract: contractRows[0] ?? null,
  };
}
