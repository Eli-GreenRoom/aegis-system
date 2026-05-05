import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { flights, groundTransportPickups } from "@/db/schema";
import { resolvePeople, type Person } from "@/lib/people";

export interface ArrivalToday {
  flight: typeof flights.$inferSelect;
  person: Person | null;
  /** Linked pickup, if one exists. Helps the Arrivals screen surface the
   *  "flight landed but pickup still scheduled" coral case. */
  linkedPickup: typeof groundTransportPickups.$inferSelect | null;
}

/**
 * Inbound flights with `scheduledDt` falling on the given date (UTC day).
 * Each row is self-contained: includes the resolved person + the linked
 * pickup so the festival-day Arrivals screen can render without further
 * joins.
 *
 * Spec: docs/OPERATIONS-FLOW.md §4.
 */
export async function getArrivalsToday(
  editionId: string,
  date: string
): Promise<ArrivalToday[]> {
  // Treat `date` as a UTC calendar day. Match scheduledDt in
  // [date 00:00:00, next-day 00:00:00).
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const flightRows = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.editionId, editionId),
        eq(flights.direction, "inbound"),
        gte(flights.scheduledDt, start),
        lt(flights.scheduledDt, end)
      )
    )
    .orderBy(asc(flights.scheduledDt));

  if (flightRows.length === 0) return [];

  const flightIds = flightRows.map((f) => f.id);

  // Pickups linked to any of these flights.
  const linkedPickupRows = await db
    .select()
    .from(groundTransportPickups)
    .where(eq(groundTransportPickups.editionId, editionId));
  const pickupsByFlightId = new Map<
    string,
    typeof groundTransportPickups.$inferSelect
  >();
  for (const p of linkedPickupRows) {
    if (p.linkedFlightId && flightIds.includes(p.linkedFlightId)) {
      pickupsByFlightId.set(p.linkedFlightId, p);
    }
  }

  const people = await resolvePeople(
    flightRows.map((f) => ({ kind: f.personKind, id: f.personId }))
  );

  return flightRows.map((flight) => ({
    flight,
    person: people.get(`${flight.personKind}:${flight.personId}`) ?? null,
    linkedPickup: pickupsByFlightId.get(flight.id) ?? null,
  }));
}
