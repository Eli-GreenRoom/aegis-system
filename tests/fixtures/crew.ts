import type { CrewMember } from "@/lib/crew/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-1111-1111-111111111111";
export const FIXTURE_CREW_ID = "33333333-3333-3333-3333-333333333333";

export const fixtureCrew: CrewMember = {
  id: FIXTURE_CREW_ID,
  workspaceId: null,
  festivalId: FIXTURE_EDITION_ID,
  name: "Mira",
  role: "Tour manager",
  email: "mira@example.com",
  phone: null,
  nationality: null,
  days: ["Friday", "Saturday"],
  comments: null,
  visaStatus: null,
  pressKitUrl: null,
  passportFileUrl: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  archivedAt: null,
};
