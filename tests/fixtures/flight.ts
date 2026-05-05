import type { Flight } from "@/lib/flights/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_FLIGHT_ID = "77777777-7777-4777-8777-777777777777";

export const fixtureFlight: Flight = {
  id: FIXTURE_FLIGHT_ID,
  editionId: FIXTURE_EDITION_ID,
  personKind: "artist",
  personId: FIXTURE_ARTIST_ID,
  direction: "inbound",
  fromAirport: "CDG",
  toAirport: "BEY",
  airline: "MEA",
  flightNumber: "ME202",
  scheduledDt: new Date("2026-08-13T14:30:00Z"),
  actualDt: null,
  status: "scheduled",
  delayMinutes: null,
  pnr: "ABC123",
  ticketUrl: null,
  confirmationEmailUrl: null,
  seat: "14A",
  comments: null,
  createdAt: new Date("2026-05-04T00:00:00Z"),
};
