import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import {
  contracts,
  flights,
  hotelBookings,
  payments,
  riders,
  sets,
} from "@/db/schema";

export interface ArtistStatusSummary {
  setStatus: string | null;
  contractStatus: string | null;
  inboundFlight: string | null;
  outboundFlight: string | null;
  hotelStatus: string | null;
  outstandingPayments: number;
  ridersReady: boolean | null;
}

export async function getArtistStatusMap(
  artistIds: string[],
): Promise<Map<string, ArtistStatusSummary>> {
  if (artistIds.length === 0) return new Map();

  const empty = (): ArtistStatusSummary => ({
    setStatus: null,
    contractStatus: null,
    inboundFlight: null,
    outboundFlight: null,
    hotelStatus: null,
    outstandingPayments: 0,
    ridersReady: null,
  });

  const map = new Map<string, ArtistStatusSummary>(
    artistIds.map((id) => [id, empty()]),
  );

  const [setRows, contractRows, flightRows, hotelRows, paymentRows, riderRows] =
    await Promise.all([
      db
        .select({ artistId: sets.artistId, status: sets.status })
        .from(sets)
        .where(inArray(sets.artistId, artistIds)),
      db
        .select({ artistId: contracts.artistId, status: contracts.status })
        .from(contracts)
        .where(inArray(contracts.artistId, artistIds)),
      db
        .select({
          personId: flights.personId,
          direction: flights.direction,
          status: flights.status,
        })
        .from(flights)
        .where(
          and(
            eq(flights.personKind, "artist"),
            inArray(flights.personId, artistIds),
          ),
        ),
      db
        .select({
          personId: hotelBookings.personId,
          status: hotelBookings.status,
        })
        .from(hotelBookings)
        .where(
          and(
            eq(hotelBookings.personKind, "artist"),
            inArray(hotelBookings.personId, artistIds),
          ),
        ),
      db
        .select({ artistId: payments.artistId, status: payments.status })
        .from(payments)
        .where(
          and(
            inArray(payments.artistId, artistIds),
            ne(payments.status, "paid"),
            ne(payments.status, "void"),
          ),
        ),
      db
        .select({
          artistId: riders.artistId,
          confirmed: riders.confirmed,
        })
        .from(riders)
        .where(inArray(riders.artistId, artistIds)),
    ]);

  for (const r of setRows) {
    const s = map.get(r.artistId);
    if (s && !s.setStatus) s.setStatus = r.status;
  }

  // Pick the most-advanced contract status per artist.
  const contractRank = ["signed", "sent", "draft"];
  for (const r of contractRows) {
    const s = map.get(r.artistId);
    if (!s) continue;
    if (
      !s.contractStatus ||
      contractRank.indexOf(r.status) < contractRank.indexOf(s.contractStatus)
    ) {
      s.contractStatus = r.status;
    }
  }

  for (const r of flightRows) {
    const s = map.get(r.personId);
    if (!s) continue;
    if (r.direction === "inbound" && !s.inboundFlight)
      s.inboundFlight = r.status;
    if (r.direction === "outbound" && !s.outboundFlight)
      s.outboundFlight = r.status;
  }

  for (const r of hotelRows) {
    const s = map.get(r.personId);
    if (s && !s.hotelStatus) s.hotelStatus = r.status;
  }

  for (const r of paymentRows) {
    if (!r.artistId) continue;
    const s = map.get(r.artistId);
    if (s) s.outstandingPayments++;
  }

  // ridersReady: null = no riders, true = all confirmed, false = any unconfirmed
  for (const r of riderRows) {
    const s = map.get(r.artistId);
    if (!s) continue;
    if (s.ridersReady === null) s.ridersReady = r.confirmed ?? false;
    else s.ridersReady = s.ridersReady && (r.confirmed ?? false);
  }

  return map;
}
