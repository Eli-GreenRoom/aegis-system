import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_RIDER_ID,
  fixtureRider,
} from "../fixtures/riders";
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

vi.mock("@/lib/riders/repo", () => ({
  listRiders: vi.fn(async () => [fixtureRider]),
  listRidersForArtist: vi.fn(async () => [fixtureRider]),
  getRider: vi.fn(async () => fixtureRider),
  createRider: vi.fn(async (input) => ({
    ...fixtureRider,
    ...input,
    id: FIXTURE_RIDER_ID,
  })),
  updateRider: vi.fn(async (_id, input) => ({ ...fixtureRider, ...input })),
  deleteRider: vi.fn(async () => fixtureRider),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/riders/repo";
import { GET as listGET, POST as createPOST } from "@/app/api/riders/route";
import {
  GET as oneGET,
  PATCH as onePATCH,
  DELETE as oneDELETE,
} from "@/app/api/riders/[id]/route";

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

describe("/api/riders", () => {
  it("GET returns the list", async () => {
    const res = await listGET(jsonReq("http://test/api/riders", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.riders).toHaveLength(1);
  });

  it("GET threads filters", async () => {
    await listGET(
      jsonReq(
        `http://test/api/riders?artistId=${FIXTURE_ARTIST_ID}&kind=technical&confirmed=true`,
        "GET",
      ),
    );
    expect(mocks.repo.listRiders).toHaveBeenCalledWith({
      festivalId: FIXTURE_EDITION_ID,
      artistId: FIXTURE_ARTIST_ID,
      kind: "technical",
      confirmed: true,
    });
  });

  it("GET ignores invalid kind", async () => {
    await listGET(jsonReq("http://test/api/riders?kind=weird", "GET"));
    expect(mocks.repo.listRiders).toHaveBeenCalledWith(
      expect.objectContaining({ kind: undefined }),
    );
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(jsonReq("http://test/api/riders", "GET"));
    expect(res.status).toBe(401);
  });

  it("GET 403 when permission denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 }),
    );
    const res = await listGET(jsonReq("http://test/api/riders", "GET"));
    expect(res.status).toBe(403);
  });

  const validInput = {
    artistId: FIXTURE_ARTIST_ID,
    kind: "hospitality",
  };

  it("POST creates with valid input", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/riders", "POST", validInput),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createRider).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: FIXTURE_ARTIST_ID,
        kind: "hospitality",
        confirmed: false,
      }),
    );
  });

  it("POST 400 missing artistId", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/riders", "POST", { kind: "hospitality" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid kind", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/riders", "POST", {
        artistId: FIXTURE_ARTIST_ID,
        kind: "drinks",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad fileUrl", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/riders", "POST", {
        ...validInput,
        fileUrl: "not a url",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 malformed JSON", async () => {
    const req = new NextRequest("http://test/api/riders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

describe("/api/riders/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_RIDER_ID }) };

  it("GET returns the rider", async () => {
    const res = await oneGET(jsonReq("http://test/api/riders/x", "GET"), ctx);
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getRider.mockResolvedValueOnce(null);
    const res = await oneGET(jsonReq("http://test/api/riders/missing", "GET"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH partial only sends provided keys", async () => {
    await onePATCH(
      jsonReq("http://test/api/riders/x", "PATCH", { confirmed: true }),
      ctx,
    );
    expect(mocks.repo.updateRider).toHaveBeenCalledWith(FIXTURE_RIDER_ID, {
      confirmed: true,
    });
  });

  it("PATCH normalises empty fileUrl to null", async () => {
    await onePATCH(
      jsonReq("http://test/api/riders/x", "PATCH", { fileUrl: "" }),
      ctx,
    );
    expect(mocks.repo.updateRider).toHaveBeenCalledWith(FIXTURE_RIDER_ID, {
      fileUrl: null,
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await onePATCH(
      jsonReq("http://test/api/riders/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await oneDELETE(
      jsonReq("http://test/api/riders/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq("http://test/api/riders/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
