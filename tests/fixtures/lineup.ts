import type { SetRow, Slot, Stage } from "@/lib/lineup/repo";

// Real-looking UUIDs (v4-shape: third group starts with 4, fourth with 8/9/a/b).
// Zod 4's `.uuid()` enforces RFC 4122 variant and version nibbles.
export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_STAGE_ID   = "44444444-4444-4444-8444-444444444444";
export const FIXTURE_SLOT_ID    = "55555555-5555-4555-8555-555555555555";
export const FIXTURE_SET_ID     = "66666666-6666-4666-8666-666666666666";
export const FIXTURE_ARTIST_ID  = "22222222-2222-4222-8222-222222222222";

export const fixtureStage: Stage = {
  id: FIXTURE_STAGE_ID,
  name: "Main Stage",
  slug: "main",
  color: "#E5B85A",
  sortOrder: 0,
};

export const fixtureSlot: Slot = {
  id: FIXTURE_SLOT_ID,
  editionId: FIXTURE_EDITION_ID,
  stageId: FIXTURE_STAGE_ID,
  day: "friday",
  startTime: "22:00",
  endTime: "23:30",
  sortOrder: 0,
};

export const fixtureSet: SetRow = {
  id: FIXTURE_SET_ID,
  slotId: FIXTURE_SLOT_ID,
  artistId: FIXTURE_ARTIST_ID,
  status: "option",
  announceBatch: null,
  feeAmountCents: null,
  feeCurrency: null,
  agency: null,
  comments: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};
