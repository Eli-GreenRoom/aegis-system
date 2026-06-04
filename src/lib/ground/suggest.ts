import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { flights, hotelBookings, hotels, sets, slots, artists } from "@/db/schema";

export interface SuggestedPickup {
  routeFrom: "airport" | "hotel" | "stage";
  routeTo: "airport" | "hotel" | "stage";
  pickupDtLocal: string;
  label: string;
  linkedFlightId?: string;
  reason: string;
}

function toLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMins(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60_000);
}

function slotDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00Z`);
}

export async function suggestPickupsForPerson(
  festivalId: string,
  personId: string,
  personKind: "artist" | "crew",
  arrivalBufferMins: number,
): Promise<{ suggestions: SuggestedPickup[]; hotelName: string | null }> {
  const suggestions: SuggestedPickup[] = [];

  const [inboundFlight] = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.festivalId, festivalId),
        eq(flights.personId, personId),
        eq(flights.personKind, personKind),
        eq(flights.direction, "inbound"),
      ),
    )
    .orderBy(flights.scheduledDt)
    .limit(1);

  const [booking] = await db
    .select({ hotelId: hotelBookings.hotelId })
    .from(hotelBookings)
    .where(
      and(
        eq(hotelBookings.personId, personId),
        eq(hotelBookings.personKind, personKind),
      ),
    )
    .limit(1);

  let hotel: (typeof hotels.$inferSelect) | null = null;
  if (booking?.hotelId) {
    const [h] = await db.select().from(hotels).where(eq(hotels.id, booking.hotelId)).limit(1);
    hotel = h ?? null;
  }

  const minsFromAirport = hotel?.minsFromAirport ?? 30;
  const minsToVenue = hotel?.minsToVenue ?? 30;
  const minsToAirport = hotel?.minsToAirport ?? 30;

  if (inboundFlight) {
    const landingDt = inboundFlight.actualDt
      ? new Date(inboundFlight.actualDt)
      : inboundFlight.scheduledDt
        ? new Date(inboundFlight.scheduledDt)
        : null;
    if (landingDt) {
      suggestions.push({
        routeFrom: "airport",
        routeTo: "hotel",
        pickupDtLocal: toLocal(addMins(landingDt, 20)),
        label: "Airport → Hotel",
        linkedFlightId: inboundFlight.id,
        reason: `after flight ${inboundFlight.flightNumber ?? inboundFlight.id.slice(0, 8)} lands (+20 min)`,
      });
    }
  }

  if (personKind === "artist") {
    const [artist] = await db.select({ id: artists.id }).from(artists).where(eq(artists.id, personId)).limit(1);
    if (artist) {
      const artistSets = await db
        .select({ date: slots.date, startTime: slots.startTime, endTime: slots.endTime })
        .from(sets)
        .innerJoin(slots, eq(sets.slotId, slots.id))
        .where(and(eq(sets.artistId, artist.id), eq(slots.festivalId, festivalId)))
        .orderBy(slots.date, slots.startTime)
        .limit(1);

      for (const s of artistSets) {
        const setStart = slotDateTime(s.date, s.startTime);
        const setEnd = slotDateTime(s.date, s.endTime);

        suggestions.push({
          routeFrom: "hotel",
          routeTo: "stage",
          pickupDtLocal: toLocal(addMins(setStart, -(arrivalBufferMins + minsToVenue))),
          label: "Hotel → Venue",
          reason: `arrive ${arrivalBufferMins} min before set at ${s.startTime} (+${minsToVenue} min drive)`,
        });

        suggestions.push({
          routeFrom: "stage",
          routeTo: "hotel",
          pickupDtLocal: toLocal(addMins(setEnd, 30)),
          label: "Venue → Hotel",
          reason: `30 min after set ends at ${s.endTime}`,
        });
      }
    }
  }

  const [outboundFlight] = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.festivalId, festivalId),
        eq(flights.personId, personId),
        eq(flights.personKind, personKind),
        eq(flights.direction, "outbound"),
      ),
    )
    .orderBy(flights.scheduledDt)
    .limit(1);

  if (outboundFlight?.scheduledDt) {
    const departureDt = new Date(outboundFlight.scheduledDt);
    suggestions.push({
      routeFrom: "hotel",
      routeTo: "airport",
      pickupDtLocal: toLocal(addMins(departureDt, -(minsToAirport + 120))),
      label: "Hotel → Airport",
      linkedFlightId: outboundFlight.id,
      reason: `flight ${outboundFlight.flightNumber ?? ""} departs ${new Date(outboundFlight.scheduledDt).toISOString().slice(11, 16)} (-2h check-in, -${minsToAirport} min drive)`,
    });
  }

  return { suggestions, hotelName: hotel?.name ?? null };
}
