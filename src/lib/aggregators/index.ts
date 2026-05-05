/**
 * Cross-table aggregators that power festival-day mode and the Cmd+K
 * agent. Each is a pure function over the DB client; they take filters
 * (editionId / day / time window) and return denormalised rows the UI
 * can render without further joins.
 *
 * Spec: docs/OPERATIONS-FLOW.md §4.
 *
 * Each function has a unit test in tests/unit/aggregators.test.ts with
 * a mocked DB so no aggregator hits Neon during `npm run check`.
 */

export { getArtistRoadsheet } from "./artist-roadsheet";
export type { ArtistRoadsheet } from "./artist-roadsheet";

export { getOpenIssues } from "./open-issues";
export type {
  OpenIssue,
  IssueSeverity,
  OpenIssuesScope,
} from "./open-issues";

export { getPickupsInWindow } from "./pickups-in-window";
export type { PickupInWindow } from "./pickups-in-window";

export { getNowAndNext } from "./now-and-next";
export type { NowAndNext } from "./now-and-next";

export { getArrivalsToday } from "./arrivals-today";
export type { ArrivalToday } from "./arrivals-today";

export { getCurrentlyActiveBookings } from "./currently-active-bookings";
export type { ActiveBooking } from "./currently-active-bookings";
