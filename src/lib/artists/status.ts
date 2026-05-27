import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import {
  artists,
  contracts,
  flights,
  groundTransportPickups,
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
  groundStatus: string | null;
  outstandingPayments: number;
  ridersReady: boolean | null;
  // Logistics requirement flags from the artists table
  needsFlight: boolean;
  needsHotel: boolean;
  needsGround: boolean;
  needsContract: boolean;
  needsPayment: boolean;
  needsRider: boolean;
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
    groundStatus: null,
    outstandingPayments: 0,
    ridersReady: null,
    needsFlight: true,
    needsHotel: true,
    needsGround: true,
    needsContract: true,
    needsPayment: true,
    needsRider: true,
  });

  const map = new Map<string, ArtistStatusSummary>(
    artistIds.map((id) => [id, empty()]),
  );

  const [
    needsRows,
    setRows,
    contractRows,
    flightRows,
    hotelRows,
    groundRows,
    paymentRows,
    riderRows,
  ] = await Promise.all([
    // Fetch the needs_* flags for each artist
    db
      .select({
        id: artists.id,
        needsFlight: artists.needsFlight,
        needsHotel: artists.needsHotel,
        needsGround: artists.needsGround,
        needsContract: artists.needsContract,
        needsPayment: artists.needsPayment,
        needsRider: artists.needsRider,
      })
      .from(artists)
      .where(inArray(artists.id, artistIds)),
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
      .select({
        personId: groundTransportPickups.personId,
        status: groundTransportPickups.status,
      })
      .from(groundTransportPickups)
      .where(
        and(
          eq(groundTransportPickups.personKind, "artist"),
          inArray(groundTransportPickups.personId, artistIds),
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

  // Apply needs_* flags first
  for (const r of needsRows) {
    const s = map.get(r.id);
    if (!s) continue;
    s.needsFlight = r.needsFlight;
    s.needsHotel = r.needsHotel;
    s.needsGround = r.needsGround;
    s.needsContract = r.needsContract;
    s.needsPayment = r.needsPayment;
    s.needsRider = r.needsRider;
  }

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

  for (const r of groundRows) {
    const s = map.get(r.personId);
    if (s && !s.groundStatus) s.groundStatus = r.status;
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

/**
 * Returns true if the artist has any actionable gap - i.e. a module they
 * need but haven't completed yet. Respects needs_* flags so N/A modules
 * don't count as gaps.
 */
export function hasGap(s: ArtistStatusSummary): boolean {
  if (!s.setStatus) return true;
  if (s.needsContract && !s.contractStatus) return true;
  if (s.needsPayment && s.outstandingPayments > 0) return true;
  if (s.needsFlight && (!s.inboundFlight || !s.outboundFlight)) return true;
  if (s.needsHotel && !s.hotelStatus) return true;
  if (s.needsGround && !s.groundStatus) return true;
  if (s.needsRider && s.ridersReady === null) return true;
  return false;
}
