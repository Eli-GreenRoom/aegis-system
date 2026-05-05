import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_SET_ID,
  FIXTURE_SLOT_ID,
  FIXTURE_STAGE_ID,
  fixtureSet,
  fixtureSlot,
  fixtureStage,
} from "../fixtures/lineup";

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

// db.batch returns whatever batchImpl is set to before the call. Tests that
// exercise a status transition install a fake that returns `[[updatedRow]]`.
const batchImpl = vi.fn(async (_queries: unknown[]): Promise<unknown[]> => []);

vi.mock("@/db/client", () => ({
  db: {
    batch: (queries: unknown[]) => batchImpl(queries),
  },
  schema: {},
}));

vi.mock("@/lib/audit", () => ({
  recordTransition: vi.fn(() => ({ __auditBuilder: true })),
}));

vi.mock("@/lib/lineup/repo", () => ({
  // stages
  listStages: vi.fn(async () => [fixtureStage]),
  getStage: vi.fn(async () => fixtureStage),
  getStageBySlug: vi.fn(async () => null),
  createStage: vi.fn(async (input) => ({ ...fixtureStage, ...input })),
  updateStage: vi.fn(async (_id, input) => ({ ...fixtureStage, ...input })),
  deleteStage: vi.fn(async () => fixtureStage),
  // slots
  listSlots: vi.fn(async () => [fixtureSlot]),
  getSlot: vi.fn(async () => fixtureSlot),
  createSlot: vi.fn(async (_editionId, input) => ({
    ...fixtureSlot,
    ...input,
    id: FIXTURE_SLOT_ID,
  })),
  updateSlot: vi.fn(async (_id, input) => ({ ...fixtureSlot, ...input })),
  deleteSlot: vi.fn(async () => fixtureSlot),
  reorderSlots: vi.fn(async () => ({ updated: 2 })),
  // sets
  listSetsForSlot: vi.fn(async () => [fixtureSet]),
  listSetsForArtist: vi.fn(async () => [fixtureSet]),
  getSet: vi.fn(async () => fixtureSet),
  createSet: vi.fn(async (input) => ({
    ...fixtureSet,
    ...input,
    id: FIXTURE_SET_ID,
  })),
  updateSet: vi.fn(async (_id, input) => ({ ...fixtureSet, ...input })),
  buildUpdateSet: vi.fn((_id, input) => ({ __updateBuilder: "set", input })),
  deleteSet: vi.fn(async () => fixtureSet),
  // grid (not exercised in unit tests; LineupBoard isn't a route)
  getLineupGrid: vi.fn(async () => []),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/lineup/repo";
import * as audit from "@/lib/audit";

import {
  GET as stagesListGET,
  POST as stagesPOST,
} from "@/app/api/stages/route";
import {
  GET as stageGET,
  PATCH as stagePATCH,
  DELETE as stageDELETE,
} from "@/app/api/stages/[id]/route";

import {
  GET as slotsListGET,
  POST as slotsPOST,
} from "@/app/api/slots/route";
import {
  GET as slotGET,
  PATCH as slotPATCH,
  DELETE as slotDELETE,
} from "@/app/api/slots/[id]/route";
import { POST as slotsReorderPOST } from "@/app/api/slots/reorder/route";

import {
  GET as setsListGET,
  POST as setsPOST,
} from "@/app/api/sets/route";
import {
  GET as setGET,
  PATCH as setPATCH,
  DELETE as setDELETE,
} from "@/app/api/sets/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
  audit: vi.mocked(audit),
};

const fakeSession = {
  user: { id: "u1", email: "booking@aegisfestival.com", name: "Eli" },
  ownerId: "u1",
  isOwner: true,
  role: "owner" as const,
  permissions: { lineup: true },
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
  // Default: db.batch returns [[updatedRow], [auditRow]]. Tests that need
  // failure (rollback, partial result) override per-test.
  batchImpl.mockReset();
  batchImpl.mockImplementation(async (queries: unknown[]) => {
    if (queries.length === 2) return [[fixtureSet], [{}]];
    return [];
  });
  mocks.audit.recordTransition.mockClear();
});

// ── stages ───────────────────────────────────────────────────────────────

describe("/api/stages", () => {
  it("GET returns the list", async () => {
    const res = await stagesListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages).toHaveLength(1);
  });

  it("GET 401 unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await stagesListGET();
    expect(res.status).toBe(401);
  });

  it("POST creates with valid input", async () => {
    const res = await stagesPOST(
      jsonReq("http://test/api/stages", "POST", {
        name: "Beach",
        slug: "beach",
        color: "#7C9EFF",
        sortOrder: 4,
      })
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createStage).toHaveBeenCalled();
  });

  it("POST 409 duplicate slug", async () => {
    mocks.repo.getStageBySlug.mockResolvedValueOnce(fixtureStage);
    const res = await stagesPOST(
      jsonReq("http://test/api/stages", "POST", {
        name: "Main",
        slug: "main",
      })
    );
    expect(res.status).toBe(409);
  });

  it("POST 400 bad slug", async () => {
    const res = await stagesPOST(
      jsonReq("http://test/api/stages", "POST", {
        name: "X",
        slug: "Has Spaces",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/stages/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_STAGE_ID }) };

  it("GET returns the stage", async () => {
    const res = await stageGET(jsonReq("http://test/api/stages/x", "GET"), ctx);
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getStage.mockResolvedValueOnce(null);
    const res = await stageGET(
      jsonReq("http://test/api/stages/x", "GET"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("PATCH partial only sends provided keys", async () => {
    await stagePATCH(
      jsonReq("http://test/api/stages/x", "PATCH", { name: "Renamed" }),
      ctx
    );
    expect(mocks.repo.updateStage).toHaveBeenCalledWith(FIXTURE_STAGE_ID, {
      name: "Renamed",
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await stagePATCH(
      jsonReq("http://test/api/stages/x", "PATCH", {}),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("PATCH 409 slug taken", async () => {
    mocks.repo.getStageBySlug.mockResolvedValueOnce({
      ...fixtureStage,
      id: "different",
    });
    const res = await stagePATCH(
      jsonReq("http://test/api/stages/x", "PATCH", { slug: "taken" }),
      ctx
    );
    expect(res.status).toBe(409);
  });

  it("DELETE removes", async () => {
    const res = await stageDELETE(
      jsonReq("http://test/api/stages/x", "DELETE"),
      ctx
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.deleteStage).toHaveBeenCalled();
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await stageDELETE(
      jsonReq("http://test/api/stages/x", "DELETE"),
      ctx
    );
    expect(res.status).toBe(401);
  });
});

// ── slots ────────────────────────────────────────────────────────────────

describe("/api/slots", () => {
  it("GET filters by day", async () => {
    await slotsListGET(jsonReq("http://test/api/slots?day=saturday", "GET"));
    expect(mocks.repo.listSlots).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      day: "saturday",
      stageId: undefined,
    });
  });

  it("GET ignores invalid day", async () => {
    await slotsListGET(jsonReq("http://test/api/slots?day=bogus", "GET"));
    expect(mocks.repo.listSlots).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      day: undefined,
      stageId: undefined,
    });
  });

  it("POST creates", async () => {
    const res = await slotsPOST(
      jsonReq("http://test/api/slots", "POST", {
        stageId: FIXTURE_STAGE_ID,
        day: "friday",
        startTime: "22:00",
        endTime: "23:30",
      })
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createSlot).toHaveBeenCalled();
  });

  it("POST 400 bad time format", async () => {
    const res = await slotsPOST(
      jsonReq("http://test/api/slots", "POST", {
        stageId: FIXTURE_STAGE_ID,
        day: "friday",
        startTime: "10pm",
        endTime: "11pm",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 same start and end", async () => {
    const res = await slotsPOST(
      jsonReq("http://test/api/slots", "POST", {
        stageId: FIXTURE_STAGE_ID,
        day: "friday",
        startTime: "22:00",
        endTime: "22:00",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/slots/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_SLOT_ID }) };

  it("PATCH partial", async () => {
    await slotPATCH(
      jsonReq("http://test/api/slots/x", "PATCH", { startTime: "21:00" }),
      ctx
    );
    expect(mocks.repo.updateSlot).toHaveBeenCalledWith(FIXTURE_SLOT_ID, {
      startTime: "21:00",
    });
  });

  it("PATCH 400 empty", async () => {
    const res = await slotPATCH(
      jsonReq("http://test/api/slots/x", "PATCH", {}),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("PATCH 400 collision start=end", async () => {
    const res = await slotPATCH(
      jsonReq("http://test/api/slots/x", "PATCH", {
        startTime: "22:00",
        endTime: "22:00",
      }),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await slotDELETE(
      jsonReq("http://test/api/slots/x", "DELETE"),
      ctx
    );
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getSlot.mockResolvedValueOnce(null);
    const res = await slotGET(
      jsonReq("http://test/api/slots/x", "GET"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });
});

// ── sets ─────────────────────────────────────────────────────────────────

describe("/api/sets", () => {
  it("GET requires slotId or artistId", async () => {
    const res = await setsListGET(jsonReq("http://test/api/sets", "GET"));
    expect(res.status).toBe(400);
  });

  it("GET by slotId", async () => {
    const res = await setsListGET(
      jsonReq(`http://test/api/sets?slotId=${FIXTURE_SLOT_ID}`, "GET")
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.listSetsForSlot).toHaveBeenCalledWith(FIXTURE_SLOT_ID);
  });

  it("GET by artistId", async () => {
    const res = await setsListGET(
      jsonReq(`http://test/api/sets?artistId=${FIXTURE_ARTIST_ID}`, "GET")
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.listSetsForArtist).toHaveBeenCalledWith(FIXTURE_ARTIST_ID);
  });

  it("POST creates with default status=option", async () => {
    const res = await setsPOST(
      jsonReq("http://test/api/sets", "POST", {
        slotId: FIXTURE_SLOT_ID,
        artistId: FIXTURE_ARTIST_ID,
      })
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "option" })
    );
  });

  it("POST 400 bad status", async () => {
    const res = await setsPOST(
      jsonReq("http://test/api/sets", "POST", {
        slotId: FIXTURE_SLOT_ID,
        artistId: FIXTURE_ARTIST_ID,
        status: "wat",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad uuid", async () => {
    const res = await setsPOST(
      jsonReq("http://test/api/sets", "POST", {
        slotId: "not-a-uuid",
        artistId: FIXTURE_ARTIST_ID,
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/sets/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_SET_ID }) };

  it("PATCH status change goes via db.batch and records the transition", async () => {
    const res = await setPATCH(
      jsonReq("http://test/api/sets/x", "PATCH", { status: "confirmed" }),
      ctx
    );
    expect(res.status).toBe(200);
    expect(batchImpl).toHaveBeenCalledTimes(1);
    expect(mocks.repo.buildUpdateSet).toHaveBeenCalledWith(FIXTURE_SET_ID, {
      status: "confirmed",
    });
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: "u1",
        entity: { type: "set", id: FIXTURE_SET_ID },
        diff: { field: "status", from: "option", to: "confirmed" },
      }
    );
    // The transition path skips the awaited updateSet helper.
    expect(mocks.repo.updateSet).not.toHaveBeenCalled();
  });

  it("PATCH accepts the new festival-day statuses", async () => {
    for (const status of ["live", "done", "withdrawn"] as const) {
      mocks.repo.buildUpdateSet.mockClear();
      mocks.audit.recordTransition.mockClear();
      await setPATCH(
        jsonReq("http://test/api/sets/x", "PATCH", { status }),
        ctx
      );
      expect(mocks.repo.buildUpdateSet).toHaveBeenCalledWith(FIXTURE_SET_ID, {
        status,
      });
      expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          diff: { field: "status", from: "option", to: status },
        })
      );
    }
  });

  it("PATCH with no status change skips audit and uses updateSet directly", async () => {
    await setPATCH(
      jsonReq("http://test/api/sets/x", "PATCH", { announceBatch: "Batch 1" }),
      ctx
    );
    expect(batchImpl).not.toHaveBeenCalled();
    expect(mocks.audit.recordTransition).not.toHaveBeenCalled();
    expect(mocks.repo.updateSet).toHaveBeenCalledWith(FIXTURE_SET_ID, {
      announceBatch: "Batch 1",
    });
  });

  it("PATCH where db.batch rejects propagates the error (no partial commit)", async () => {
    batchImpl.mockRejectedValueOnce(new Error("constraint violation"));
    await expect(
      setPATCH(
        jsonReq("http://test/api/sets/x", "PATCH", { status: "confirmed" }),
        ctx
      )
    ).rejects.toThrow("constraint violation");
  });

  it("PATCH normalises empty announceBatch to null", async () => {
    await setPATCH(
      jsonReq("http://test/api/sets/x", "PATCH", { announceBatch: "" }),
      ctx
    );
    expect(mocks.repo.updateSet).toHaveBeenCalledWith(FIXTURE_SET_ID, {
      announceBatch: null,
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await setPATCH(
      jsonReq("http://test/api/sets/x", "PATCH", {}),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await setDELETE(
      jsonReq("http://test/api/sets/x", "DELETE"),
      ctx
    );
    expect(res.status).toBe(200);
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await setGET(jsonReq("http://test/api/sets/x", "GET"), ctx);
    expect(res.status).toBe(401);
  });
});

// ── /api/slots/reorder ────────────────────────────────────────────────

describe("POST /api/slots/reorder", () => {
  const validBody = {
    stageId: FIXTURE_STAGE_ID,
    day: "friday",
    slotIds: [FIXTURE_SLOT_ID, "55555555-5555-4555-8555-aaaaaaaaaaaa"],
  };

  it("calls reorderSlots with current edition + body", async () => {
    const res = await slotsReorderPOST(
      jsonReq("http://test/api/slots/reorder", "POST", validBody)
    );
    expect(res.status).toBe(200);
    expect(mocks.repo.reorderSlots).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      FIXTURE_STAGE_ID,
      "friday",
      validBody.slotIds
    );
  });

  it("400 when slotIds empty", async () => {
    const res = await slotsReorderPOST(
      jsonReq("http://test/api/slots/reorder", "POST", {
        ...validBody,
        slotIds: [],
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.repo.reorderSlots).not.toHaveBeenCalled();
  });

  it("400 when day invalid", async () => {
    const res = await slotsReorderPOST(
      jsonReq("http://test/api/slots/reorder", "POST", {
        ...validBody,
        day: "monday",
      })
    );
    expect(res.status).toBe(400);
  });

  it("400 when stageId not a uuid", async () => {
    const res = await slotsReorderPOST(
      jsonReq("http://test/api/slots/reorder", "POST", {
        ...validBody,
        stageId: "not-a-uuid",
      })
    );
    expect(res.status).toBe(400);
  });

  it("400 when repo signals stage/day mismatch", async () => {
    mocks.repo.reorderSlots.mockResolvedValueOnce(null);
    const res = await slotsReorderPOST(
      jsonReq("http://test/api/slots/reorder", "POST", validBody)
    );
    expect(res.status).toBe(400);
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await slotsReorderPOST(
      jsonReq("http://test/api/slots/reorder", "POST", validBody)
    );
    expect(res.status).toBe(401);
  });

  it("400 malformed JSON", async () => {
    const req = new NextRequest("http://test/api/slots/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await slotsReorderPOST(req);
    expect(res.status).toBe(400);
  });
});
