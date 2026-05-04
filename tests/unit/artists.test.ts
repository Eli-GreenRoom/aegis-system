import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  fixtureArtist,
} from "../fixtures/artist";

// ── Mocks ────────────────────────────────────────────────────────────────

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

vi.mock("@/lib/artists/repo", () => ({
  listArtists: vi.fn(async () => [fixtureArtist]),
  listAgencies: vi.fn(async () => ["WME"]),
  getArtist: vi.fn(async () => fixtureArtist),
  getArtistBySlug: vi.fn(async () => null),
  createArtist: vi.fn(async (_editionId, input) => ({
    ...fixtureArtist,
    ...input,
    id: FIXTURE_ARTIST_ID,
  })),
  updateArtist: vi.fn(async (_id, input) => ({ ...fixtureArtist, ...input })),
  archiveArtist: vi.fn(async () => ({
    ...fixtureArtist,
    archivedAt: new Date(),
  })),
  unarchiveArtist: vi.fn(async () => ({ ...fixtureArtist, archivedAt: null })),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/artists/repo";
import { GET as listGET, POST as createPOST } from "@/app/api/artists/route";
import {
  GET as oneGET,
  PATCH as onePATCH,
  DELETE as oneDELETE,
} from "@/app/api/artists/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
};

const fakeSession = {
  user: { id: "u1", email: "booking@aegisfestival.com", name: "Eli" },
  ownerId: "u1",
  isOwner: true,
  role: "owner" as const,
  permissions: { artists: true },
};

const validInput = {
  name: "Hiroko",
  slug: "hiroko",
  email: "hiroko@example.com",
  agency: "WME",
};

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeSession);
  mocks.session.requirePermission.mockReturnValue(null);
});

// ── /api/artists ────────────────────────────────────────────────────────

describe("GET /api/artists", () => {
  it("returns the list for the current edition", async () => {
    const res = await listGET(jsonReq("http://test/api/artists", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.artists).toHaveLength(1);
    expect(body.artists[0].slug).toBe("hiroko");
    expect(mocks.repo.listArtists).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: undefined,
      agency: undefined,
      archived: "active",
    });
  });

  it("threads search/agency/archived params", async () => {
    await listGET(
      jsonReq(
        "http://test/api/artists?search=hir&agency=WME&archived=archived",
        "GET"
      )
    );
    expect(mocks.repo.listArtists).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: "hir",
      agency: "WME",
      archived: "archived",
    });
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(jsonReq("http://test/api/artists", "GET"));
    expect(res.status).toBe(401);
  });

  it("rejects when permission is denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 })
    );
    const res = await listGET(jsonReq("http://test/api/artists", "GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/artists", () => {
  it("creates with valid input", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/artists", "POST", validInput)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.artist.slug).toBe("hiroko");
    expect(mocks.repo.createArtist).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ slug: "hiroko", name: "Hiroko" })
    );
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await createPOST(
      jsonReq("http://test/api/artists", "POST", validInput)
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid slug", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/artists", "POST", {
        ...validInput,
        slug: "Has Spaces",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues.fieldErrors.slug).toBeDefined();
  });

  it("rejects empty name", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/artists", "POST", { ...validInput, name: "" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate slug", async () => {
    mocks.repo.getArtistBySlug.mockResolvedValueOnce(fixtureArtist);
    const res = await createPOST(
      jsonReq("http://test/api/artists", "POST", validInput)
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new NextRequest("http://test/api/artists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

// ── /api/artists/[id] ────────────────────────────────────────────────────

describe("GET /api/artists/[id]", () => {
  it("returns the artist", async () => {
    const res = await oneGET(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "GET"),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.artist.id).toBe(FIXTURE_ARTIST_ID);
  });

  it("returns 404 when not found", async () => {
    mocks.repo.getArtist.mockResolvedValueOnce(null);
    const res = await oneGET(
      jsonReq("http://test/api/artists/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneGET(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "GET"),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/artists/[id]", () => {
  it("updates with valid input", async () => {
    const res = await onePATCH(
      jsonReq(
        `http://test/api/artists/${FIXTURE_ARTIST_ID}`,
        "PATCH",
        { ...validInput, name: "Hiroko (renamed)" }
      ),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.updateArtist).toHaveBeenCalled();
  });

  it("returns 409 when changing slug to one taken by another artist", async () => {
    mocks.repo.getArtistBySlug.mockResolvedValueOnce({
      ...fixtureArtist,
      id: "different-id",
    });
    const res = await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", {
        ...validInput,
        slug: "taken-slug",
      }),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(409);
  });

  it("returns 404 when artist missing", async () => {
    mocks.repo.getArtist.mockResolvedValueOnce(null);
    const res = await onePATCH(
      jsonReq("http://test/api/artists/missing", "PATCH", validInput),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects validation failure", async () => {
    const res = await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", {
        ...validInput,
        slug: "Bad Slug",
      }),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", validInput),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("partial body only sends provided keys to the repo", async () => {
    await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", {
        name: "Just a rename",
      }),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(mocks.repo.updateArtist).toHaveBeenCalledWith(FIXTURE_ARTIST_ID, {
      name: "Just a rename",
    });
  });

  it("partial body that omits slug skips the slug-conflict check", async () => {
    await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", {
        agency: "New Agency",
      }),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(mocks.repo.getArtistBySlug).not.toHaveBeenCalled();
    expect(mocks.repo.updateArtist).toHaveBeenCalledWith(FIXTURE_ARTIST_ID, {
      agency: "New Agency",
    });
  });

  it("rejects an empty body", async () => {
    const res = await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", {}),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(400);
    expect(mocks.repo.updateArtist).not.toHaveBeenCalled();
  });

  it("normalises empty string in optional field to null", async () => {
    await onePATCH(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "PATCH", {
        agency: "",
      }),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(mocks.repo.updateArtist).toHaveBeenCalledWith(FIXTURE_ARTIST_ID, {
      agency: null,
    });
  });
});

describe("DELETE /api/artists/[id]", () => {
  it("archives by default", async () => {
    const res = await oneDELETE(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "DELETE"),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.archiveArtist).toHaveBeenCalledWith(FIXTURE_ARTIST_ID);
  });

  it("unarchives when action=unarchive", async () => {
    const res = await oneDELETE(
      jsonReq(
        `http://test/api/artists/${FIXTURE_ARTIST_ID}?action=unarchive`,
        "DELETE"
      ),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.unarchiveArtist).toHaveBeenCalledWith(FIXTURE_ARTIST_ID);
  });

  it("returns 404 when missing", async () => {
    mocks.repo.archiveArtist.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq("http://test/api/artists/missing", "DELETE"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq(`http://test/api/artists/${FIXTURE_ARTIST_ID}`, "DELETE"),
      { params: Promise.resolve({ id: FIXTURE_ARTIST_ID }) }
    );
    expect(res.status).toBe(401);
  });
});
