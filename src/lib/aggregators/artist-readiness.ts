import { and, eq, isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  artists,
  contracts,
  flights,
  groundTransportPickups,
  hotelBookings,
  payments,
  sets,
  slots,
} from "@/db/schema";

/** A single missing logistics item for one artist. */
export type ReadinessGap =
  | "set"
  | "contract"
  | "inbound_flight"
  | "hotel"
  | "pickup"
  | "payment";

export interface ArtistReadiness {
  artistId: string;
  artistName: string;
  agency: string | null;
  /** Items still missing (or in a non-final state) for this artist. */
  gaps: ReadinessGap[];
  /** Modules this artist actually needs (denominator for progress). */
  totalRequired: number;
  /** totalRequired - gaps.length */
  doneCount: number;
  /** gaps.length */
  missingCount: number;
}

export interface FestivalReadiness {
  totalArtists: number;
  /** Artists whose gaps array is empty. */
  fullyPrepped: number;
  /** 0..100, integer. 0 when totalArtists is 0. */
  percent: number;
  /** Per-artist breakdown, sorted by missingCount desc then name asc. */
  byArtist: ArtistReadiness[];
}

/**
 * Returns "what is missing" per active artist for the festival.
 * Respects needs_* flags: modules marked N/A are excluded from gaps and
 * do not count against the artist's readiness score.
 *
 * "Fully prepped" = no gaps remaining across all required modules.
 */
export async function getFestivalReadiness(
  festivalId: string,
): Promise<FestivalReadiness> {
  const [
    artistRows,
    setRows,
    contractRows,
    inboundFlightRows,
    bookingRows,
    pickupRows,
    paymentRows,
  ] = await Promise.all([
    db
      .select({
        id: artists.id,
        name: artists.name,
        agency: artists.agency,
        needsContract: artists.needsContract,
        needsFlight: artists.needsFlight,
        needsHotel: artists.needsHotel,
        needsGround: artists.needsGround,
        needsPayment: artists.needsPayment,
      })
      .from(artists)
      .where(
        and(eq(artists.festivalId, festivalId), isNull(artists.archivedAt)),
      )
      .orderBy(asc(artists.name)),

    // Confirmed sets only - joined to slots to scope by festival.
    db
      .select({ artistId: sets.artistId })
      .from(sets)
      .innerJoin(slots, eq(sets.slotId, slots.id))
      .where(
        and(eq(slots.festivalId, festivalId), eq(sets.status, "confirmed")),
      ),

    db
      .select({ artistId: contracts.artistId, status: contracts.status })
      .from(contracts)
      .where(eq(contracts.festivalId, festivalId)),

    db
      .select({
        personId: flights.personId,
        personKind: flights.personKind,
        status: flights.status,
      })
      .from(flights)
      .where(
        and(
          eq(flights.festivalId, festivalId),
          eq(flights.direction, "inbound"),
        ),
      ),

    db
      .select({
        personId: hotelBookings.personId,
        personKind: hotelBookings.personKind,
        status: hotelBookings.status,
      })
      .from(hotelBookings),

    db
      .select({
        personId: groundTransportPickups.personId,
        personKind: groundTransportPickups.personKind,
      })
      .from(groundTransportPickups)
      .where(eq(groundTransportPickups.festivalId, festivalId)),

    db
      .select({ artistId: payments.artistId, status: payments.status })
      .from(payments)
      .where(eq(payments.festivalId, festivalId)),
  ]);

  // Index everything by artistId / personId for O(1) lookup.
  const confirmedSetArtists = new Set(setRows.map((r) => r.artistId));

  const contractByArtist = new Map<string, string>();
  for (const c of contractRows) contractByArtist.set(c.artistId, c.status);

  const inboundByArtist = new Map<string, string[]>();
  for (const f of inboundFlightRows) {
    if (f.personKind !== "artist") continue;
    const list = inboundByArtist.get(f.personId) ?? [];
    list.push(f.status);
    inboundByArtist.set(f.personId, list);
  }

  const hotelByArtist = new Map<string, string[]>();
  for (const b of bookingRows) {
    if (b.personKind !== "artist") continue;
    const list = hotelByArtist.get(b.personId) ?? [];
    list.push(b.status);
    hotelByArtist.set(b.personId, list);
  }

  const pickupArtists = new Set<string>();
  for (const p of pickupRows) {
    if (p.personKind === "artist") pickupArtists.add(p.personId);
  }

  const paymentsByArtist = new Map<string, string[]>();
  for (const p of paymentRows) {
    if (!p.artistId) continue;
    const list = paymentsByArtist.get(p.artistId) ?? [];
    list.push(p.status);
    paymentsByArtist.set(p.artistId, list);
  }

  const byArtist: ArtistReadiness[] = artistRows.map((a) => {
    const gaps: ReadinessGap[] = [];
    let totalRequired = 1; // set is always required

    // -- Set (always required) ---------------------------------------------
    if (!confirmedSetArtists.has(a.id)) gaps.push("set");

    // -- Contract ----------------------------------------------------------
    if (a.needsContract) {
      totalRequired++;
      if (contractByArtist.get(a.id) !== "signed") gaps.push("contract");
    }

    // -- Inbound flight ----------------------------------------------------
    if (a.needsFlight) {
      totalRequired++;
      const inbounds = inboundByArtist.get(a.id) ?? [];
      const hasUsable = inbounds.some((s) => s !== "cancelled");
      if (!hasUsable) gaps.push("inbound_flight");
    }

    // -- Hotel -------------------------------------------------------------
    if (a.needsHotel) {
      totalRequired++;
      const hotels = hotelByArtist.get(a.id) ?? [];
      const hasUsable = hotels.some(
        (s) => s !== "cancelled" && s !== "no_show",
      );
      if (!hasUsable) gaps.push("hotel");
    }

    // -- Ground transport --------------------------------------------------
    if (a.needsGround) {
      totalRequired++;
      if (!pickupArtists.has(a.id)) gaps.push("pickup");
    }

    // -- Payment -----------------------------------------------------------
    if (a.needsPayment) {
      totalRequired++;
      const pays = paymentsByArtist.get(a.id) ?? [];
      const anyOutstanding = pays.some((s) => s !== "paid" && s !== "void");
      if (anyOutstanding || pays.length === 0) gaps.push("payment");
    }

    return {
      artistId: a.id,
      artistName: a.name,
      agency: a.agency,
      gaps,
      totalRequired,
      doneCount: totalRequired - gaps.length,
      missingCount: gaps.length,
    };
  });

  // Sort: most-missing first, then alphabetical.
  byArtist.sort((a, b) => {
    if (a.missingCount !== b.missingCount)
      return b.missingCount - a.missingCount;
    return a.artistName.localeCompare(b.artistName);
  });

  const totalArtists = byArtist.length;
  const fullyPrepped = byArtist.filter((a) => a.gaps.length === 0).length;
  const percent =
    totalArtists === 0 ? 0 : Math.round((fullyPrepped / totalArtists) * 100);

  return { totalArtists, fullyPrepped, percent, byArtist };
}

/** Human label for a gap, matched to the artist page logistics labels. */
export const GAP_LABEL: Record<ReadinessGap, string> = {
  set: "set",
  contract: "contract",
  inbound_flight: "inbound flight",
  hotel: "hotel",
  pickup: "pickup",
  payment: "payment",
};

/** CSS utility class for each gap's pill. */
export const GAP_PILL: Record<ReadinessGap, string> = {
  set: "pill-amber",
  contract: "pill-emerald",
  inbound_flight: "pill-sky",
  hotel: "pill-violet",
  pickup: "pill-amber",
  payment: "pill-emerald",
};
