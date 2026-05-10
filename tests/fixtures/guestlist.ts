import type { GuestlistEntry } from "@/lib/guestlist/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_GUEST_ID = "13131313-1313-4131-8131-131313131313";

export const fixtureGuest: GuestlistEntry = {
  id: FIXTURE_GUEST_ID,
  workspaceId: null,
  editionId: FIXTURE_EDITION_ID,
  category: "dj_guest",
  hostArtistId: FIXTURE_ARTIST_ID,
  name: "Yuki Tanaka",
  email: "yuki@example.com",
  phone: null,
  day: "saturday",
  inviteSent: false,
  checkedIn: false,
  comments: null,
  createdAt: new Date("2026-04-01T00:00:00Z"),
};
