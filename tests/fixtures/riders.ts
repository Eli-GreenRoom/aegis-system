import type { Rider } from "@/lib/riders/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_RIDER_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

export const fixtureRider: Rider = {
  id: FIXTURE_RIDER_ID,
  artistId: FIXTURE_ARTIST_ID,
  kind: "hospitality",
  fileUrl: null,
  parsedItems: null,
  receivedAt: null,
  confirmed: false,
  createdAt: new Date("2026-04-01T00:00:00Z"),
};
