import type { ArtistRoadsheet } from "@/lib/aggregators";

/** What sheet should the cockpit open when "Add X" is clicked. */
export type SheetKind =
  | "contract"
  | "flight_inbound"
  | "flight_outbound"
  | "hotel"
  | "pickup"
  | "rider_tech"
  | "rider_hosp"
  | "payment";

/** A single gap in an artist's prep, ordered by operational priority. */
export type CockpitGap =
  | "set"
  | "contract"
  | "inbound_flight"
  | "hotel"
  | "pickup"
  | "payment";

export interface NextAction {
  gap: CockpitGap;
  title: string;
  reason: string;
  ctaLabel: string;
  /** Which side sheet to open. `null` means navigate (e.g. lineup page). */
  sheet: SheetKind | null;
  /** Fallback link when no sheet (used for set: navigate to /lineup). */
  href: string | null;
}

export interface CockpitProgress {
  totalSteps: number;
  doneSteps: number;
  /** Empty when nothing is missing. */
  gaps: CockpitGap[];
  /** The single most-important next action, or null when fully prepped. */
  next: NextAction | null;
}

/**
 * Derive the artist cockpit's progress + next-action from the roadsheet
 * (no extra DB queries). Pure function -- used by the artist detail page.
 *
 * Operational order (matches how an artist actually gets prepped):
 *  1. set        -- must be confirmed before anything else makes sense
 *  2. contract   -- signed contract before booking travel
 *  3. flight in  -- book inbound first; outbound usually settles later
 *  4. hotel      -- needs to land somewhere
 *  5. pickup     -- needs a ride from airport
 *  6. payment    -- settle balance
 *
 * Outbound flight, riders, and crew are tracked separately on the progress
 * rail but not surfaced as the primary "next action" -- they're rarely the
 * blocker that prevents an artist from showing up.
 */
export function getNextAction(sheet: ArtistRoadsheet): CockpitProgress {
  const gaps: CockpitGap[] = [];

  const setStatus = sheet.set?.set.status;
  const setOk =
    setStatus === "confirmed" || setStatus === "live" || setStatus === "done";
  if (!setOk) gaps.push("set");

  const contractOk = sheet.contract?.status === "signed";
  if (!contractOk) gaps.push("contract");

  const inbound = sheet.inboundFlight;
  const inboundOk =
    inbound != null &&
    inbound.status !== "cancelled" &&
    inbound.status !== "not_needed";
  const inboundOpted = inbound != null && inbound.status === "not_needed";
  if (!inboundOk && !inboundOpted) gaps.push("inbound_flight");

  const hotelOk =
    sheet.hotel != null &&
    sheet.hotel.booking.status !== "cancelled" &&
    sheet.hotel.booking.status !== "no_show" &&
    sheet.hotel.booking.status !== "not_needed";
  const hotelOpted =
    sheet.hotel != null && sheet.hotel.booking.status === "not_needed";
  if (!hotelOk && !hotelOpted) gaps.push("hotel");

  if (sheet.pickups.length === 0) gaps.push("pickup");

  const anyOutstanding = sheet.payments.some(
    (p) => p.status !== "paid" && p.status !== "void",
  );
  if (anyOutstanding || sheet.payments.length === 0) gaps.push("payment");

  const totalSteps = 6;
  const doneSteps = totalSteps - gaps.length;

  const next: NextAction | null =
    gaps.length === 0 ? null : buildAction(gaps[0]!, sheet);

  return { totalSteps, doneSteps, gaps, next };
}

function buildAction(gap: CockpitGap, sheet: ArtistRoadsheet): NextAction {
  const artistId = sheet.artist.id;
  switch (gap) {
    case "set":
      return {
        gap,
        title: "Schedule a set",
        reason:
          "This artist isn't on the lineup yet -- add a confirmed slot before booking travel.",
        ctaLabel: "Open lineup",
        sheet: null,
        href: "/lineup",
      };
    case "contract":
      return {
        gap,
        title: "Send the contract",
        reason: sheet.contract
          ? `Contract is ${sheet.contract.status} -- chase to signed before booking travel.`
          : "No contract on file. Draft and send before booking travel.",
        ctaLabel: sheet.contract ? "Open contract" : "Add contract",
        sheet: sheet.contract ? null : "contract",
        href: sheet.contract ? `/contracts/${sheet.contract.id}` : null,
      };
    case "inbound_flight":
      return {
        gap,
        title: "Book inbound flight",
        reason: setReasonForTravel(sheet, "inbound"),
        ctaLabel: "Add flight",
        sheet: "flight_inbound",
        href: null,
      };
    case "hotel":
      return {
        gap,
        title: "Book hotel",
        reason: setReasonForTravel(sheet, "hotel"),
        ctaLabel: "Add booking",
        sheet: "hotel",
        href: null,
      };
    case "pickup":
      return {
        gap,
        title: "Schedule pickup",
        reason: sheet.inboundFlight
          ? "Inbound flight is booked. Assign a vehicle to get them from the airport."
          : "No pickup scheduled -- needed even without a flight if they're driving in.",
        ctaLabel: "Add pickup",
        sheet: "pickup",
        href: null,
      };
    case "payment":
      return {
        gap,
        title: "Settle payment",
        reason:
          sheet.payments.length === 0
            ? "No payment recorded yet."
            : `${sheet.payments.filter((p) => p.status !== "paid" && p.status !== "void").length} payment(s) outstanding.`,
        ctaLabel: sheet.payments.length === 0 ? "Add payment" : "View payments",
        sheet: sheet.payments.length === 0 ? "payment" : null,
        href: sheet.payments.length === 0 ? null : `/artists/${artistId}`,
      };
  }
}

function setReasonForTravel(
  sheet: ArtistRoadsheet,
  kind: "inbound" | "hotel",
): string {
  if (!sheet.set) {
    return kind === "inbound"
      ? "Confirm a set first -- flight dates depend on it."
      : "Confirm a set first -- hotel dates depend on it.";
  }
  const day = sheet.set.slot.date;
  const start = sheet.set.slot.startTime;
  return kind === "inbound"
    ? `Set is ${day} at ${start}. Inbound flight should land the day of or day before.`
    : `Set is ${day} at ${start}. Hotel needs to cover at least the night of.`;
}
