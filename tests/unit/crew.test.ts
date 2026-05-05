import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_CREW_ID,
  FIXTURE_EDITION_ID,
  fixtureCrew,
} from "../fixtures/crew";

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

vi.mock("@/lib/crew/repo", () => ({
  listCrew: vi.fn(async () => [fixtureCrew]),
  listCrewRoles: vi.fn(async () => ["Stage manager"]),
  getCrewMember: vi.fn(async () => fixtureCrew),
  createCrewMember: vi.fn(async (_editionId, input) => ({
    ...fixtureCrew,
    ...input,
    id: FIXTURE_CREW_ID,
  })),
  updateCrewMember: vi.fn(async (_id, input) => ({ ...fixtureCrew, ...input })),
  archiveCrewMember: vi.fn(async () => ({
    ...fixtureCrew,
    archivedAt: new Date(),
  })),
  unarchiveCrewMember: vi.fn(async () => ({ ...fixtureCrew, archivedAt: null })),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/crew/repo";
import { GET as listGET, POST as createPOST } from "@/app/api/crew/route";
import {
  GET as oneGET,
  PATCH as onePATCH,
  DELETE as oneDELETE,
} from "@/app/api/crew/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
};

const fakeSession = {
  user: { id: "u1", email: "booking@aegisfestival.com", name: "Eli" },
  ownerId: "u1",
  isOwner: true,
  role: "owner" as const,
  permissions: { crew: true },
};

const validInput = {
  name: "Mira",
  role: "Tour manager",
  email: "mira@example.com",
  days: ["Friday"],
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

// ── /api/crew ──────────────────────────────────────────────────────────

describe("GET /api/crew", () => {
  it("returns the list for the current edition", async () => {
    const res = await listGET(jsonReq("http://test/api/crew", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crew).toHaveLength(1);
    expect(body.crew[0].name).toBe("Mira");
    expect(mocks.repo.listCrew).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: undefined,
      role: undefined,
      archived: "active",
    });
  });

  it("threads search/role/archived params", async () => {
    await listGET(
      jsonReq(
        "http://test/api/crew?search=mira&role=Tour%20manager&archived=archived",
        "GET"
      )
    );
    expect(mocks.repo.listCrew).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: "mira",
      role: "Tour manager",
      archived: "archived",
    });
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(jsonReq("http://test/api/crew", "GET"));
    expect(res.status).toBe(401);
  });

  it("rejects when permission is denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 })
    );
    const res = await listGET(jsonReq("http://test/api/crew", "GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/crew", () => {
  it("creates with valid input", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", validInput)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.crew.name).toBe("Mira");
    expect(mocks.repo.createCrewMember).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ name: "Mira", role: "Tour manager" })
    );
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", validInput)
    );
    expect(res.status).toBe(401);
  });

  it("rejects empty name", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", { ...validInput, name: "" })
    );
    expect(res.status).toBe(400);
  });

  it("rejects empty role", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", { ...validInput, role: "" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new NextRequest("http://test/api/crew", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });

  it("accepts the new parity fields (nationality, visa, press kit, passport)", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", {
        ...validInput,
        nationality: "FR",
        visaStatus: "approved",
        pressKitUrl: "https://drive.google.com/crew",
        passportFileUrl: "https://example.com/p.pdf",
      })
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createCrewMember).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        nationality: "FR",
        visaStatus: "approved",
        pressKitUrl: "https://drive.google.com/crew",
        passportFileUrl: "https://example.com/p.pdf",
      })
    );
  });

  it("rejects malformed passportFileUrl", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", {
        ...validInput,
        passportFileUrl: "not a url",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.fieldErrors.passportFileUrl).toBeDefined();
  });

  it("rejects unknown visaStatus", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/crew", "POST", {
        ...validInput,
        visaStatus: "maybe",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.fieldErrors.visaStatus).toBeDefined();
  });
});

// ── /api/crew/[id] ─────────────────────────────────────────────────────

describe("GET /api/crew/[id]", () => {
  it("returns the crew member", async () => {
    const res = await oneGET(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "GET"),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crew.id).toBe(FIXTURE_CREW_ID);
  });

  it("returns 404 when not found", async () => {
    mocks.repo.getCrewMember.mockResolvedValueOnce(null);
    const res = await oneGET(
      jsonReq("http://test/api/crew/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneGET(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "GET"),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/crew/[id]", () => {
  it("updates with valid input", async () => {
    const res = await onePATCH(
      jsonReq(
        `http://test/api/crew/${FIXTURE_CREW_ID}`,
        "PATCH",
        { name: "Sami (renamed)" }
      ),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.updateCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID, {
      name: "Sami (renamed)",
    });
  });

  it("returns 404 when crew missing", async () => {
    mocks.repo.getCrewMember.mockResolvedValueOnce(null);
    const res = await onePATCH(
      jsonReq("http://test/api/crew/missing", "PATCH", { name: "X" }),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects empty body", async () => {
    const res = await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", {}),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(400);
    expect(mocks.repo.updateCrewMember).not.toHaveBeenCalled();
  });

  it("normalises empty string in optional field to null", async () => {
    await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", { phone: "" }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(mocks.repo.updateCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID, {
      phone: null,
    });
  });

  it("normalises empty array in days to null", async () => {
    await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", { days: [] }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(mocks.repo.updateCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID, {
      days: null,
    });
  });

  it("rejects validation failure", async () => {
    const res = await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", { role: "" }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", { name: "X" }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("partial PATCH sets nationality and clears pressKitUrl", async () => {
    await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", {
        nationality: "DE",
        pressKitUrl: "",
      }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(mocks.repo.updateCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID, {
      nationality: "DE",
      pressKitUrl: null,
    });
  });

  it("partial PATCH sets visaStatus to pending", async () => {
    await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", {
        visaStatus: "pending",
      }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(mocks.repo.updateCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID, {
      visaStatus: "pending",
    });
  });

  it("partial PATCH with visaStatus empty string clears it to null", async () => {
    await onePATCH(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "PATCH", {
        visaStatus: "",
      }),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(mocks.repo.updateCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID, {
      visaStatus: null,
    });
  });
});

describe("DELETE /api/crew/[id]", () => {
  it("archives by default", async () => {
    const res = await oneDELETE(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "DELETE"),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.archiveCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID);
  });

  it("unarchives when action=unarchive", async () => {
    const res = await oneDELETE(
      jsonReq(
        `http://test/api/crew/${FIXTURE_CREW_ID}?action=unarchive`,
        "DELETE"
      ),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.unarchiveCrewMember).toHaveBeenCalledWith(FIXTURE_CREW_ID);
  });

  it("returns 404 when missing", async () => {
    mocks.repo.archiveCrewMember.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq("http://test/api/crew/missing", "DELETE"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq(`http://test/api/crew/${FIXTURE_CREW_ID}`, "DELETE"),
      { params: Promise.resolve({ id: FIXTURE_CREW_ID }) }
    );
    expect(res.status).toBe(401);
  });
});
