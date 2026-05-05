import type { Contract } from "@/lib/contracts/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_CONTRACT_ID = "12121212-1212-4121-8121-121212121212";

export const fixtureContract: Contract = {
  id: FIXTURE_CONTRACT_ID,
  artistId: FIXTURE_ARTIST_ID,
  editionId: FIXTURE_EDITION_ID,
  status: "draft",
  sentAt: null,
  signedAt: null,
  fileUrl: null,
  signedFileUrl: null,
  notes: null,
  createdAt: new Date("2026-04-01T00:00:00Z"),
};
