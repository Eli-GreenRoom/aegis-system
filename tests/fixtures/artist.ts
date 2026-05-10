import type { Artist } from "@/lib/artists/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-1111-1111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-2222-2222-222222222222";

export const fixtureArtist: Artist = {
  id: FIXTURE_ARTIST_ID,
  workspaceId: null,
  editionId: FIXTURE_EDITION_ID,
  slug: "hiroko",
  name: "Hiroko",
  legalName: null,
  nationality: "JP",
  email: "hiroko@example.com",
  phone: null,
  agency: "WME",
  agentEmail: null,
  instagram: null,
  soundcloud: null,
  color: null,
  local: false,
  comments: null,
  visaStatus: null,
  pressKitUrl: null,
  passportFileUrl: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  archivedAt: null,
};
