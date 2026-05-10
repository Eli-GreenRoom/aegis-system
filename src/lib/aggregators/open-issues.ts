import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  artists,
  contracts,
  flights,
  groundTransportPickups,
  guestlistEntries,
  hotelBookings,
  payments,
  riders,
  sets,
  slots,
} from "@/db/schema";

export type IssueSeverity = "high" | "medium" | "low";
export type OpenIssuesScope = "today" | "week" | "all";

export interface OpenIssue {
  /** Stable identifier so the UI can link to the offending entity. */
  key: string;
  severity: IssueSeverity;
  rule: string;
  message: string;
  /** ISO timestamp the issue is "anchored to" (set start, flight time,
   *  pickup time...). Used for chronological-proximity sort within
   *  severity. May be null. */
  at: string | null;
  /** Pointer to the entity in question for one-tap navigation. */
  entityType:
    | "set"
    | "flight"
    | "pickup"
    | "hotel_booking"
    | "guestlist"
    | "payment";
  entityId: string;
}

interface Scope {
  start: Date;
  end: Date;
}

/**
 * Open issues across the festival. Severity-sorted, then chronologically
 * sorted within severity (closer = earlier in the list).
 *
 * Scope:
 *  - 'today': anchor between [now, now+24h)
 *  - 'week':  anchor between [now, now+7d)
 *  - 'all':   no time filter (everything that could be an issue today)
 *
 * Spec: docs/OPERATIONS-FLOW.md -4 (rule list).
 */
export async function getOpenIssues(
  editionId: string,
  scope: OpenIssuesScope,
  now: Date = new Date(),
): Promise<OpenIssue[]> {
  const rules = makeScope(scope, now);

  const [
    confirmedSets,
    contractRows,
    riderRows,
    inboundFlightsInScope,
    pickupRowsForFlights,
    paymentsForArtists,
    bookingsActiveToday,
    guestlistTodayPending,
    completedPickupsRecent,
    bookingsBookedAfterPickup,
  ] = await Promise.all([
    // Confirmed sets in scope (with their slot times).
    db
      .select({ set: sets, slot: slots })
      .from(sets)
      .innerJoin(slots, eq(sets.slotId, slots.id))
      .where(and(eq(slots.editionId, editionId), eq(sets.status, "confirmed"))),

    // All contracts for this edition - to figure out which sets have
    // an associated contract for their artist.
    db.select().from(contracts).where(eq(contracts.editionId, editionId)),

    // All riders. Riders link to artist, not edition; we'll filter by
    // edition-scoped artists below.
    db.select().from(riders),

    // Inbound flights scheduled in scope.
    rules
      ? db
          .select()
          .from(flights)
          .where(
            and(
              eq(flights.editionId, editionId),
              eq(flights.direction, "inbound"),
              gte(flights.scheduledDt, rules.start),
              lt(flights.scheduledDt, rules.end),
            ),
          )
      : db
          .select()
          .from(flights)
          .where(
            and(
              eq(flights.editionId, editionId),
              eq(flights.direction, "inbound"),
            ),
          ),

    // All pickups for this edition - we'll match by linkedFlightId.
    db
      .select()
      .from(groundTransportPickups)
      .where(eq(groundTransportPickups.editionId, editionId)),

    // All payments for this edition.
    db.select().from(payments).where(eq(payments.editionId, editionId)),

    // Bookings active on each day in scope (we'll dedupe).
    db.select().from(hotelBookings),

    // Guestlist entries with day in scope and invite not yet sent.
    rules
      ? db
          .select()
          .from(guestlistEntries)
          .where(
            and(
              eq(guestlistEntries.editionId, editionId),
              eq(guestlistEntries.inviteSent, false),
            ),
          )
      : db
          .select()
          .from(guestlistEntries)
          .where(eq(guestlistEntries.editionId, editionId)),

    // Pickups completed in the last 60 minutes - candidates for the
    // "where did they go?" rule.
    rules
      ? db
          .select()
          .from(groundTransportPickups)
          .where(
            and(
              eq(groundTransportPickups.editionId, editionId),
              eq(groundTransportPickups.status, "completed"),
              gte(
                groundTransportPickups.completedAt,
                new Date(now.getTime() - 60 * 60 * 1000),
              ),
              lt(groundTransportPickups.completedAt, now),
            ),
          )
      : db
          .select()
          .from(groundTransportPickups)
          .where(
            and(
              eq(groundTransportPickups.editionId, editionId),
              eq(groundTransportPickups.status, "completed"),
            ),
          ),

    // Hotel bookings still in 'booked' status - cross-reference with
    // completedPickupsRecent below.
    db.select().from(hotelBookings).where(eq(hotelBookings.status, "booked")),
  ]);

  // Index helpers.
  const contractByArtistId = new Map<string, typeof contracts.$inferSelect>();
  for (const c of contractRows) {
    contractByArtistId.set(c.artistId, c);
  }
  const ridersByArtistId = new Map<string, (typeof riders.$inferSelect)[]>();
  for (const r of riderRows) {
    const list = ridersByArtistId.get(r.artistId) ?? [];
    list.push(r);
    ridersByArtistId.set(r.artistId, list);
  }
  const pickupsByFlightId = new Map<
    string,
    typeof groundTransportPickups.$inferSelect
  >();
  for (const p of pickupRowsForFlights) {
    if (p.linkedFlightId) pickupsByFlightId.set(p.linkedFlightId, p);
  }

  // Edition-scope the artist filter so rider absence doesn't fire on
  // artists from other editions (riders aren't edition-scoped directly).
  const editionArtists = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.editionId, editionId));
  const editionArtistIds = new Set(editionArtists.map((a) => a.id));

  const issues: OpenIssue[] = [];

  // Rule 1: confirmed set + no contract uploaded - high.
  for (const { set, slot } of confirmedSets) {
    if (!inScope(slot.startTime, slot.day, rules, now)) continue;
    const c = contractByArtistId.get(set.artistId);
    const hasUploadedContract = !!c && (!!c.fileUrl || !!c.signedFileUrl);
    if (!hasUploadedContract) {
      issues.push({
        key: `set-${set.id}-no-contract`,
        severity: "high",
        rule: "confirmed-set-no-contract",
        message: "Confirmed set with no contract uploaded",
        at: anchor(slot, rules, now),
        entityType: "set",
        entityId: set.id,
      });
    }
  }

  // Rule 2: confirmed set + no rider received - medium.
  for (const { set, slot } of confirmedSets) {
    if (!inScope(slot.startTime, slot.day, rules, now)) continue;
    const list = ridersByArtistId.get(set.artistId) ?? [];
    const anyReceived = list.some((r) => !!r.fileUrl || r.confirmed);
    if (!anyReceived && editionArtistIds.has(set.artistId)) {
      issues.push({
        key: `set-${set.id}-no-rider`,
        severity: "medium",
        rule: "confirmed-set-no-rider",
        message: "Confirmed set with no rider received",
        at: anchor(slot, rules, now),
        entityType: "set",
        entityId: set.id,
      });
    }
  }

  // Rule 3: inbound flight in scope + no linked pickup scheduled - high.
  for (const f of inboundFlightsInScope) {
    const pickup = pickupsByFlightId.get(f.id);
    if (!pickup) {
      issues.push({
        key: `flight-${f.id}-no-pickup`,
        severity: "high",
        rule: "inbound-flight-no-pickup",
        message: `Inbound ${f.flightNumber ?? "flight"} with no pickup scheduled`,
        at: f.scheduledDt?.toISOString() ?? null,
        entityType: "flight",
        entityId: f.id,
      });
    }
  }

  // Rule 4: confirmed set today/in-scope + payment not paid - high.
  const paymentsByArtistId = new Map<
    string,
    (typeof payments.$inferSelect)[]
  >();
  for (const p of paymentsForArtists) {
    if (!p.artistId) continue;
    const list = paymentsByArtistId.get(p.artistId) ?? [];
    list.push(p);
    paymentsByArtistId.set(p.artistId, list);
  }
  for (const { set, slot } of confirmedSets) {
    if (!inScope(slot.startTime, slot.day, rules, now)) continue;
    const list = paymentsByArtistId.get(set.artistId) ?? [];
    const anyUnpaid = list.some(
      (p) => p.status !== "paid" && p.status !== "void",
    );
    const noPayments = list.length === 0;
    if (anyUnpaid || noPayments) {
      issues.push({
        key: `set-${set.id}-unpaid`,
        severity: "high",
        rule: "set-unpaid",
        message: noPayments
          ? "Set in scope with no payment recorded"
          : "Set in scope with unpaid balance",
        at: anchor(slot, rules, now),
        entityType: "set",
        entityId: set.id,
      });
    }
  }

  // Rule 5: hotel booking active in scope + no room block link - medium.
  const scopedBookings = bookingsActiveToday.filter((b) =>
    bookingActiveInScope(b, rules, now),
  );
  for (const b of scopedBookings) {
    if (b.roomBlockId === null) {
      issues.push({
        key: `booking-${b.id}-no-block`,
        severity: "medium",
        rule: "booking-no-block",
        message: "Hotel booking active with no room block link (walk-up)",
        at: `${b.checkin}T00:00:00.000Z`,
        entityType: "hotel_booking",
        entityId: b.id,
      });
    }
  }

  // Rule 6: guestlist entry day in scope + invite not sent - low.
  const scopedGuests = guestlistTodayPending.filter((g) =>
    guestlistInScope(g.day, rules, now),
  );
  for (const g of scopedGuests) {
    issues.push({
      key: `guest-${g.id}-no-invite`,
      severity: "low",
      rule: "guestlist-no-invite",
      message: `Guestlist entry pending invite: ${g.name}`,
      at: null,
      entityType: "guestlist",
      entityId: g.id,
    });
  }

  // Rule 7: pickup completed 60min ago + linked hotel still 'booked' -
  // medium ("where did they go?"). Match by personKind + personId.
  for (const p of completedPickupsRecent) {
    if (p.routeTo !== "hotel") continue; // only relevant when destination is a hotel
    const stillBooked = bookingsBookedAfterPickup.find(
      (b) =>
        b.personKind === p.personKind &&
        b.personId === p.personId &&
        bookingActiveOn(b, p.completedAt ?? now),
    );
    if (stillBooked) {
      issues.push({
        key: `pickup-${p.id}-no-checkin`,
        severity: "medium",
        rule: "pickup-completed-not-checked-in",
        message: "Pickup delivered to hotel but booking not checked in",
        at: p.completedAt?.toISOString() ?? null,
        entityType: "pickup",
        entityId: p.id,
      });
    }
  }

  return sortIssues(issues);
}

// -- Helpers -------------------------------------------------------------

function makeScope(scope: OpenIssuesScope, now: Date): Scope | null {
  if (scope === "all") return null;
  const start = new Date(now);
  const end = new Date(now);
  if (scope === "today") {
    end.setUTCHours(end.getUTCHours() + 24);
  } else {
    end.setUTCDate(end.getUTCDate() + 7);
  }
  return { start, end };
}

/**
 * Approximate "is this slot in scope" check. Slot times are HH:MM
 * strings + a day-of-week enum, not absolute datetimes - so we treat
 * "today" as "the slot's day matches today's day name OR is one of the
 * three festival days within the next 7 if scope is week". For 'all'
 * we accept everything. This is a coarse filter; UI does the final
 * sort by the slot's start time.
 */
function inScope(
  _slotStartTime: string,
  slotDay: string,
  scope: Scope | null,
  now: Date,
): boolean {
  if (!scope) return true;
  // Map JS day name -> our enum.
  const todayName = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  if (scope === null) return true;
  const dayMs = 24 * 60 * 60 * 1000;
  const hours = (scope.end.getTime() - scope.start.getTime()) / 3600000;
  if (hours <= 24) {
    return slotDay === todayName;
  }
  // 'week' scope: any of the festival days that fall within the window.
  // Without the edition's start date in this aggregator we can't pin
  // each festival day to a calendar date, so we accept all three. The
  // chronological sort downstream handles ordering.
  void dayMs;
  return ["friday", "saturday", "sunday"].includes(slotDay);
}

function anchor(
  slot: typeof slots.$inferSelect,
  scope: Scope | null,
  now: Date,
): string | null {
  // Best-effort: combine today's date with the slot start time so the
  // sort gets something stable. Only meaningful for 'today' scope; for
  // 'week' / 'all' the slot day enum is the strongest hint.
  if (!scope) return null;
  const [hh, mm] = slot.startTime.split(":").map(Number);
  const a = new Date(now);
  a.setHours(hh, mm, 0, 0);
  return a.toISOString();
}

function bookingActiveInScope(
  b: typeof hotelBookings.$inferSelect,
  scope: Scope | null,
  now: Date,
): boolean {
  if (!scope) return true;
  // Booking covers any moment in [scope.start, scope.end).
  const checkin = new Date(`${b.checkin}T00:00:00.000Z`);
  const checkout = new Date(`${b.checkout}T00:00:00.000Z`);
  void now;
  return checkin < scope.end && checkout > scope.start;
}

function bookingActiveOn(
  b: typeof hotelBookings.$inferSelect,
  at: Date,
): boolean {
  const checkin = new Date(`${b.checkin}T00:00:00.000Z`);
  const checkout = new Date(`${b.checkout}T00:00:00.000Z`);
  return checkin <= at && at < checkout;
}

function guestlistInScope(
  guestDay: string | null,
  scope: Scope | null,
  now: Date,
): boolean {
  if (!scope) return true;
  if (!guestDay) return true; // unknown day - flag anyway
  const todayName = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const hours = (scope.end.getTime() - scope.start.getTime()) / 3600000;
  if (hours <= 24) return guestDay === todayName;
  return ["friday", "saturday", "sunday"].includes(guestDay);
}

function sortIssues(issues: OpenIssue[]): OpenIssue[] {
  const sevRank: Record<IssueSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...issues].sort((a, b) => {
    if (sevRank[a.severity] !== sevRank[b.severity])
      return sevRank[a.severity] - sevRank[b.severity];
    // chronological proximity within severity
    if (a.at && b.at) return a.at.localeCompare(b.at);
    if (a.at) return -1;
    if (b.at) return 1;
    return a.key.localeCompare(b.key);
  });
}
