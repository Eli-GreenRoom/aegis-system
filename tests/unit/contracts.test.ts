import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_CONTRACT_ID,
  FIXTURE_EDITION_ID,
  fixtureContract,
} from "../fixtures/contracts";
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

vi.mock("@/lib/contracts/repo", () => ({
  listContracts: vi.fn(async () => [fixtureContract]),
  listContractsForArtist: vi.fn(async () => [fixtureContract]),
  getContract: vi.fn(async () => fixtureContract),
  createContract: vi.fn(async (_editionId, input) => ({
    ...fixtureContract,
    ...input,
    id: FIXTURE_CONTRACT_ID,
  })),
  updateContract: vi.fn(async (_id, input) => ({
    ...fixtureContract,
    ...input,
  })),
  buildUpdateContract: vi.fn((_id, input) => ({
    __updateBuilder: "contract",
    input,
  })),
  deleteContract: vi.fn(async () => fixtureContract),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/contracts/repo";
import * as audit from "@/lib/audit";
import { GET as listGET, POST as createPOST } from "@/app/api/contracts/route";
import {
  GET as oneGET,
  PATCH as onePATCH,
  DELETE as oneDELETE,
} from "@/app/api/contracts/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
  audit: vi.mocked(audit),
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
    if (queries.length === 2) return [[fixtureContract], [{}]];
    return [];
  });
  mocks.audit.recordTransition.mockClear();
});

describe("/api/contracts", () => {
  it("GET returns the list", async () => {
    const res = await listGET(jsonReq("http://test/api/contracts", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contracts).toHaveLength(1);
  });

  it("GET threads filters", async () => {
    await listGET(
      jsonReq(
        `http://test/api/contracts?artistId=${FIXTURE_ARTIST_ID}&status=signed`,
        "GET",
      ),
    );
    expect(mocks.repo.listContracts).toHaveBeenCalledWith({
      festivalId: FIXTURE_EDITION_ID,
      artistId: FIXTURE_ARTIST_ID,
      status: "signed",
    });
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(jsonReq("http://test/api/contracts", "GET"));
    expect(res.status).toBe(401);
  });

  const validInput = { artistId: FIXTURE_ARTIST_ID };

  it("POST creates with valid input + default status=draft", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/contracts", "POST", validInput),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createContract).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({ artistId: FIXTURE_ARTIST_ID, status: "draft" }),
    );
  });

  it("POST 400 missing artistId", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/contracts", "POST", {}),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 invalid status", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/contracts", "POST", {
        ...validInput,
        status: "almost",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad URL", async () => {
    const res = await createPOST(
      jsonReq("http://test/api/contracts", "POST", {
        ...validInput,
        fileUrl: "not a url",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/contracts/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_CONTRACT_ID }) };

  it("GET returns the contract", async () => {
    const res = await oneGET(
      jsonReq("http://test/api/contracts/x", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getContract.mockResolvedValueOnce(null);
    const res = await oneGET(
      jsonReq("http://test/api/contracts/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PATCH non-status field uses updateContract directly", async () => {
    await onePATCH(
      jsonReq("http://test/api/contracts/x", "PATCH", { notes: "Negotiating" }),
      ctx,
    );
    expect(batchImpl).not.toHaveBeenCalled();
    expect(mocks.audit.recordTransition).not.toHaveBeenCalled();
    expect(mocks.repo.updateContract).toHaveBeenCalledWith(
      FIXTURE_CONTRACT_ID,
      {
        notes: "Negotiating",
      },
    );
  });

  it("PATCH status to sent records audit and stamps sentAt", async () => {
    const res = await onePATCH(
      jsonReq("http://test/api/contracts/x", "PATCH", { status: "sent" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(batchImpl).toHaveBeenCalledTimes(1);
    expect(mocks.repo.buildUpdateContract).toHaveBeenCalledWith(
      FIXTURE_CONTRACT_ID,
      expect.objectContaining({ status: "sent", sentAt: expect.any(Date) }),
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: "u1",
        entity: { type: "contract", id: FIXTURE_CONTRACT_ID },
        diff: { field: "status", from: "draft", to: "sent" },
      },
    );
  });

  it("PATCH status to signed records audit and stamps signedAt", async () => {
    mocks.repo.getContract.mockResolvedValueOnce({
      ...fixtureContract,
      status: "sent",
      sentAt: new Date("2026-04-15T10:00:00Z"),
    });
    await onePATCH(
      jsonReq("http://test/api/contracts/x", "PATCH", { status: "signed" }),
      ctx,
    );
    expect(mocks.repo.buildUpdateContract).toHaveBeenCalledWith(
      FIXTURE_CONTRACT_ID,
      expect.objectContaining({
        status: "signed",
        signedAt: expect.any(Date),
      }),
    );
  });

  it("PATCH status to sent honours an explicit sentAt", async () => {
    const explicit = "2026-04-10T09:00:00Z";
    await onePATCH(
      jsonReq("http://test/api/contracts/x", "PATCH", {
        status: "sent",
        sentAt: explicit,
      }),
      ctx,
    );
    const call = mocks.repo.buildUpdateContract.mock.calls.at(-1);
    const passed = call?.[1] as { sentAt: Date };
    expect(passed.sentAt.toISOString()).toBe("2026-04-10T09:00:00.000Z");
  });

  it("PATCH status to sent does NOT re-stamp when sentAt already set", async () => {
    mocks.repo.getContract.mockResolvedValueOnce({
      ...fixtureContract,
      sentAt: new Date("2026-04-01T09:00:00Z"),
    });
    await onePATCH(
      jsonReq("http://test/api/contracts/x", "PATCH", { status: "sent" }),
      ctx,
    );
    const call = mocks.repo.buildUpdateContract.mock.calls.at(-1);
    const passed = call?.[1] as { status: string; sentAt?: Date };
    expect(passed.status).toBe("sent");
    expect("sentAt" in passed).toBe(false);
  });

  it("PATCH where db.batch rejects propagates the error", async () => {
    batchImpl.mockRejectedValueOnce(new Error("constraint violation"));
    await expect(
      onePATCH(
        jsonReq("http://test/api/contracts/x", "PATCH", { status: "sent" }),
        ctx,
      ),
    ).rejects.toThrow("constraint violation");
  });

  it("PATCH 400 empty body", async () => {
    const res = await onePATCH(
      jsonReq("http://test/api/contracts/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await oneDELETE(
      jsonReq("http://test/api/contracts/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      jsonReq("http://test/api/contracts/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
