import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_FLIGHT_ID,
  fixtureFlight,
} from "../fixtures/flight";
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

vi.mock("@/lib/flights/repo", () => ({
  listFlights: vi.fn(async () => [fixtureFlight]),
  listFlightsForPerson: vi.fn(async () => [fixtureFlight]),
  getFlight: vi.fn(async () => fixtureFlight),
  createFlight: vi.fn(async (_editionId, input) => ({
    ...fixtureFlight,
    ...input,
    id: FIXTURE_FLIGHT_ID,
  })),
  updateFlight: vi.fn(async (_id, input) => ({ ...fixtureFlight, ...input })),
  buildUpdateFlight: vi.fn((_id, input) => ({
    __updateBuilder: "flight",
    input,
  })),
  deleteFlight: vi.fn(async () => fixtureFlight),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/flights/repo";
import * as audit from "@/lib/audit";
import { GET as listGET, POST as createPOST } from "@/app/api/flights/route";
import {
  GET as oneGET,
  PATCH as onePATCH,
  DELETE as oneDELETE,
} from "@/app/api/flights/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
  audit: vi.mocked(audit),
};

const validInput = {
  personKind: "artist",
  personId: FIXTURE_ARTIST_ID,
  direction: "inbound",
  airline: "MEA",
  flightNumber: "ME202",
  scheduledDt: "2026-08-13T14:30:00Z",
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
  batchImpl.mockReset();
  batchImpl.mockImplementation(async (queries: unknown[]) => {
    if (queries.length === 2) return [[fixtureFlight], [{}]];
    return [];
  });
  mocks.audit.recordTransition.mockClear();
});

describe("GET /api/flights", () => {
  it("returns the list", async () => {
    const res = await listGET(jsonReq("http://test/api/flights", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flights).toHaveLength(1);
  });

  it("threads filters", async () => {
    await listGET(
      jsonReq(
        `http://test/api/flights?direction=inbound&status=scheduled&personKind=artist&personId=${FIXTURE_ARTIST_ID}&search=ME202`,
        "GET",
      ),
    );
    expect(mocks.repo.listFlights).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: "ME202",
      direction: "inbound",
      status: "scheduled",
      personKind: "artist",
      personId: FIXTURE_ARTIST_ID,
    });
  });

  it("ignores invalid direction/status", async () => {
    await listGET(
      jsonReq(
        "http://test/api/flights?direction=sideways&status=teleported",
        "GET",
      ),
    );
    expect(mocks.repo.listFlights).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: undefined,
      direction: undefined,
      status: undefined,
      personKind: undefined,
      personId: undefined,
    });
  });

  it("rejects unauthenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(jsonReq("http://test/api/flights", "GET"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/flights", () => {
  it("creates with valid input", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", validInput),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createFlight).toHaveBeenCalled();
  });

  it("400 missing personId", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", {
        ...validInput,
        personId: undefined,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 bad direction", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", {
        ...validInput,
        direction: "sideways",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 bad URL", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", {
        ...validInput,
        ticketUrl: "not a url",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 bad scheduledDt", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", {
        ...validInput,
        scheduledDt: "not a date",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 malformed JSON", async () => {
    const req = new NextRequest("http://test/api/flights", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });

  it("accepts delayMinutes on create", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", {
        ...validInput,
        status: "delayed",
        delayMinutes: 45,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createFlight).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ status: "delayed", delayMinutes: 45 }),
    );
  });

  it("rejects negative delayMinutes", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/flights", "POST", {
        ...validInput,
        delayMinutes: -10,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.fieldErrors.delayMinutes).toBeDefined();
  });

  it("defaults delayMinutes to null when omitted on create", async () => {
    await createPOST(jsonReq("http://test/api/flights", "POST", validInput));
    expect(mocks.repo.createFlight).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ delayMinutes: null }),
    );
  });
});

describe("/api/flights/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_FLIGHT_ID }) };

  it("GET returns the flight", async () => {
    const res = await oneGET(jsonReq("http://test/api/flights/x", "GET"), ctx);
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getFlight.mockResolvedValueOnce(null);
    const res = await oneGET(
      jsonReq("http://test/api/flights/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PATCH status change goes via db.batch and records the transition", async () => {
    const res = await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", { status: "landed" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(batchImpl).toHaveBeenCalledTimes(1);
    expect(mocks.repo.buildUpdateFlight).toHaveBeenCalledWith(
      FIXTURE_FLIGHT_ID,
      { status: "landed" },
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: "u1",
        entity: { type: "flight", id: FIXTURE_FLIGHT_ID },
        diff: { field: "status", from: "scheduled", to: "landed" },
      },
    );
    expect(mocks.repo.updateFlight).not.toHaveBeenCalled();
  });

  it("PATCH non-status field uses updateFlight directly", async () => {
    await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", { airline: "MEA" }),
      ctx,
    );
    expect(batchImpl).not.toHaveBeenCalled();
    expect(mocks.audit.recordTransition).not.toHaveBeenCalled();
    expect(mocks.repo.updateFlight).toHaveBeenCalledWith(FIXTURE_FLIGHT_ID, {
      airline: "MEA",
    });
  });

  it("PATCH where db.batch rejects propagates the error", async () => {
    batchImpl.mockRejectedValueOnce(new Error("constraint violation"));
    await expect(
      onePATCH(
        jsonReq("http://test/api/flights/x", "PATCH", { status: "landed" }),
        ctx,
      ),
    ).rejects.toThrow("constraint violation");
  });

  it("PATCH normalises empty pnr to null", async () => {
    await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", { pnr: "" }),
      ctx,
    );
    expect(mocks.repo.updateFlight).toHaveBeenCalledWith(FIXTURE_FLIGHT_ID, {
      pnr: null,
    });
  });

  it("PATCH normalises empty datetime to null", async () => {
    await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", { actualDt: "" }),
      ctx,
    );
    expect(mocks.repo.updateFlight).toHaveBeenCalledWith(FIXTURE_FLIGHT_ID, {
      actualDt: null,
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("PATCH sets delayMinutes", async () => {
    await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", { delayMinutes: 30 }),
      ctx,
    );
    expect(mocks.repo.updateFlight).toHaveBeenCalledWith(FIXTURE_FLIGHT_ID, {
      delayMinutes: 30,
    });
  });

  it("PATCH clears delayMinutes when explicitly null", async () => {
    await onePATCH(
      jsonReq("http://test/api/flights/x", "PATCH", { delayMinutes: null }),
      ctx,
    );
    expect(mocks.repo.updateFlight).toHaveBeenCalledWith(FIXTURE_FLIGHT_ID, {
      delayMinutes: null,
    });
  });

  it("DELETE removes", async () => {
    const res = await oneDELETE(
      jsonReq("http://test/api/flights/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq("http://test/api/flights/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
