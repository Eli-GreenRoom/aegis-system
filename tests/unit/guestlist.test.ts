import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_GUEST_ID,
  fixtureGuest,
} from "../fixtures/guestlist";
import { fakeOwnerSession } from "../fixtures/session";

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

vi.mock("@/lib/edition", () => ({
  getCurrentEdition: vi.fn(async () => ({
    id: FIXTURE_EDITION_ID,
    year: 2026,
    name: "Aegis Festival 2026",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    location: "Aranoon Village, Batroun",
    festivalModeActive: false,
    createdAt: new Date(),
  })),
}));

vi.mock("@/lib/festivals", () => ({
  getActiveFestival: vi.fn(async () => ({
    id: FIXTURE_EDITION_ID,
    workspaceId: null,
    slug: "aegis-2026",
    name: "Aegis Festival 2026",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    location: "Aranoon Village, Batroun",
    description: null,
    tenantBrand: null,
    festivalModeActive: false,
    archivedAt: null,
    createdAt: new Date(),
  })),
  festivalDates: vi.fn(() => ["2026-08-14", "2026-08-15", "2026-08-16"]),
}));

vi.mock("@/db/client", () => ({
  db: { batch: vi.fn() },
  schema: {},
}));

vi.mock("@/lib/guestlist/repo", () => ({
  listGuestlist: vi.fn(async () => [fixtureGuest]),
  getGuestlistEntry: vi.fn(async () => fixtureGuest),
  createGuestlistEntry: vi.fn(async (_editionId, input) => ({
    ...fixtureGuest,
    ...input,
    id: FIXTURE_GUEST_ID,
  })),
  updateGuestlistEntry: vi.fn(async (_id, input) => ({
    ...fixtureGuest,
    ...input,
  })),
  deleteGuestlistEntry: vi.fn(async () => fixtureGuest),
  getGuestlistSummary: vi.fn(),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/guestlist/repo";
import { GET as listGET, POST as createPOST } from "@/app/api/guestlist/route";
import {
  GET as oneGET,
  PATCH as onePATCH,
  DELETE as oneDELETE,
} from "@/app/api/guestlist/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
};

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeOwnerSession);
  mocks.session.requirePermission.mockReturnValue(null);
});

describe("/api/guestlist", () => {
  it("GET returns the list", async () => {
    const res = await listGET(jsonReq("http://test/api/guestlist", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(1);
  });

  it("GET threads filters", async () => {
    await listGET(
      jsonReq(
        `http://test/api/guestlist?search=yuki&category=dj_guest&hostArtistId=${FIXTURE_ARTIST_ID}&day=saturday&inviteSent=true&checkedIn=false`,
        "GET",
      ),
    );
    expect(mocks.repo.listGuestlist).toHaveBeenCalledWith({
      festivalId: FIXTURE_EDITION_ID,
      search: "yuki",
      category: "dj_guest",
      hostArtistId: FIXTURE_ARTIST_ID,
      day: "saturday",
      inviteSent: true,
      checkedIn: false,
    });
  });

  it("GET ignores invalid category", async () => {
    await listGET(
      jsonReq("http://test/api/guestlist?category=teleported", "GET"),
    );
    expect(mocks.repo.listGuestlist).toHaveBeenCalledWith(
      expect.objectContaining({ category: undefined }),
    );
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(jsonReq("http://test/api/guestlist", "GET"));
    expect(res.status).toBe(401);
  });

  const validInput = {
    category: "dj_guest",
    name: "Yuki Tanaka",
    day: "saturday",
  };

  it("POST creates with valid input", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/guestlist", "POST", validInput),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createGuestlistEntry).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        category: "dj_guest",
        name: "Yuki Tanaka",
        day: "saturday",
        inviteSent: false,
        checkedIn: false,
      }),
    );
  });

  it("POST 400 missing category", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/guestlist", "POST", { name: "Yuki" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid category", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/guestlist", "POST", {
        ...validInput,
        category: "vip",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid day", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/guestlist", "POST", {
        ...validInput,
        day: "monday",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid email", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/guestlist", "POST", {
        ...validInput,
        email: "not-email",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST allows blank hostArtistId", async () => {
    await createPOST(
      jsonReq("http://test/api/guestlist", "POST", {
        ...validInput,
        hostArtistId: "",
      }),
    );
    expect(mocks.repo.createGuestlistEntry).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ hostArtistId: null }),
    );
  });
});

describe("/api/guestlist/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_GUEST_ID }) };

  it("GET returns the entry", async () => {
    const res = await oneGET(
      jsonReq("http://test/api/guestlist/x", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("PATCH inviteSent flag only", async () => {
    await onePATCH(
      jsonReq("http://test/api/guestlist/x", "PATCH", { inviteSent: true }),
      ctx,
    );
    expect(mocks.repo.updateGuestlistEntry).toHaveBeenCalledWith(
      FIXTURE_GUEST_ID,
      { inviteSent: true },
    );
  });

  it("PATCH checkedIn flag only", async () => {
    await onePATCH(
      jsonReq("http://test/api/guestlist/x", "PATCH", { checkedIn: true }),
      ctx,
    );
    expect(mocks.repo.updateGuestlistEntry).toHaveBeenCalledWith(
      FIXTURE_GUEST_ID,
      { checkedIn: true },
    );
  });

  it("PATCH normalises empty hostArtistId to null", async () => {
    await onePATCH(
      jsonReq("http://test/api/guestlist/x", "PATCH", { hostArtistId: "" }),
      ctx,
    );
    expect(mocks.repo.updateGuestlistEntry).toHaveBeenCalledWith(
      FIXTURE_GUEST_ID,
      { hostArtistId: null },
    );
  });

  it("PATCH 400 empty body", async () => {
    const res = await onePATCH(
      jsonReq("http://test/api/guestlist/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await oneDELETE(
      jsonReq("http://test/api/guestlist/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq("http://test/api/guestlist/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
