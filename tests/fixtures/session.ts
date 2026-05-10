import type { AppSession } from "@/lib/session";

export const FIXTURE_WORKSPACE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const FIXTURE_MEMBER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const FIXTURE_USER_ID = "u1";

/** Owner-level session for use in unit test mocks. */
export const fakeOwnerSession: AppSession = {
  user: {
    id: FIXTURE_USER_ID,
    email: "booking@aegisfestival.com",
    name: "Eli",
  },
  workspaceId: FIXTURE_WORKSPACE_ID,
  memberId: FIXTURE_MEMBER_ID,
  role: "owner",
  permissions: Object.fromEntries(
    // Every key true for owner.
    [
      "lineup.view",
      "lineup.edit",
      "lineup.publish",
      "artists.view",
      "artists.edit",
      "artists.delete",
      "crew.view",
      "crew.edit",
      "crew.delete",
      "flights.view",
      "flights.edit",
      "hotels.view",
      "hotels.edit",
      "ground.view",
      "ground.edit",
      "riders.view",
      "riders.edit",
      "contracts.view",
      "contracts.edit",
      "contracts.send",
      "payments.view",
      "payments.edit",
      "guestlist.view",
      "guestlist.edit",
      "documents.view",
      "documents.upload",
      "festival.settings",
      "festival.create",
      "festival.delete",
      "workspace.settings",
      "workspace.team",
    ].map((k) => [k, true]),
  ) as AppSession["permissions"],
  // Bridge alias kept for routes that still read session.ownerId.
  ownerId: FIXTURE_WORKSPACE_ID,
};
