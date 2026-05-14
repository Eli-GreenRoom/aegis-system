import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_EDITION_ID,
  FIXTURE_STAGE_ID,
  FIXTURE_SLOT_ID,
  fixtureStage,
  fixtureSlot,
} from "../fixtures/lineup";
import { FIXTURE_WORKSPACE_ID, fakeOwnerSession } from "../fixtures/session";

// ── Shared fixture ────────────────────────────────────────────────────────

const fixtureFestival = {
  id: FIXTURE_EDITION_ID,
  workspaceId: FIXTURE_WORKSPACE_ID,
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
};

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

vi.mock("@/lib/festivals", () => ({
  getActiveFestival: vi.fn(async () => fixtureFestival),
}));

const dbSelectImpl = vi.fn();
const dbUpdateImpl = vi.fn();

vi.mock("@/db/client", () => ({
  db: {
    select: () => dbSelectImpl(),
    update: () => dbUpdateImpl(),
  },
  schema: {},
}));

vi.mock("@/lib/lineup/repo", () => ({
  listStages: vi.fn(async () => [fixtureStage]),
  getStage: vi.fn(async () => fixtureStage),
  getStageBySlug: vi.fn(async () => null),
  createStage: vi.fn(async (input) => ({ ...fixtureStage, ...input })),
  updateStage: vi.fn(async (_id, input) => ({ ...fixtureStage, ...input })),
  deleteStage: vi.fn(async () => fixtureStage),
  listSlots: vi.fn(async () => [fixtureSlot]),
  getSlot: vi.fn(async () => fixtureSlot),
  createSlot: vi.fn(async (_fid, input) => ({
    ...fixtureSlot,
    ...input,
    id: FIXTURE_SLOT_ID,
  })),
  updateSlot: vi.fn(async (_id, input) => ({ ...fixtureSlot, ...input })),
  deleteSlot: vi.fn(async () => fixtureSlot),
  reorderSlots: vi.fn(async () => ({ updated: 1 })),
}));

import { getAppSession, requirePermission } from "@/lib/session";
import { getStage } from "@/lib/lineup/repo";

// ── Helpers ───────────────────────────────────────────────────────────────

function req(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Festival [id] route ────────────────────────────────────────────────────

describe("GET /api/festivals/[id]", () => {
  beforeEach(() => {
    vi.mocked(getAppSession).mockResolvedValue(fakeOwnerSession);
    vi.mocked(requirePermission).mockReturnValue(null);
    dbSelectImpl.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([fixtureFestival]),
        }),
      }),
    });
  });

  it("returns the festival for the workspace", async () => {
    const { GET } = await import("@/app/api/festivals/[id]/route");
    const res = await GET(
      req("GET", "http://t/api/festivals/" + FIXTURE_EDITION_ID),
      makeCtx(FIXTURE_EDITION_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.festival.id).toBe(FIXTURE_EDITION_ID);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAppSession).mockResolvedValue(null);
    const { GET } = await import("@/app/api/festivals/[id]/route");
    const res = await GET(
      req("GET", "http://t/api/festivals/" + FIXTURE_EDITION_ID),
      makeCtx(FIXTURE_EDITION_ID),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when festival not in workspace", async () => {
    dbSelectImpl.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
    const { GET } = await import("@/app/api/festivals/[id]/route");
    const res = await GET(
      req("GET", "http://t/api/festivals/other-id"),
      makeCtx("other-id"),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/festivals/[id]", () => {
  beforeEach(() => {
    vi.mocked(getAppSession).mockResolvedValue(fakeOwnerSession);
    vi.mocked(requirePermission).mockReturnValue(null);
    dbSelectImpl.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([fixtureFestival]),
        }),
      }),
    });
    dbUpdateImpl.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () =>
            Promise.resolve([{ ...fixtureFestival, name: "Updated Name" }]),
        }),
      }),
    });
  });

  it("updates the festival name", async () => {
    const { PATCH } = await import("@/app/api/festivals/[id]/route");
    const res = await PATCH(
      req("PATCH", "http://t/api/festivals/" + FIXTURE_EDITION_ID, {
        name: "Updated Name",
      }),
      makeCtx(FIXTURE_EDITION_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.festival.name).toBe("Updated Name");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAppSession).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/festivals/[id]/route");
    const res = await PATCH(
      req("PATCH", "http://t/api/festivals/" + FIXTURE_EDITION_ID, {
        name: "x",
      }),
      makeCtx(FIXTURE_EDITION_ID),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on empty body", async () => {
    const { PATCH } = await import("@/app/api/festivals/[id]/route");
    const res = await PATCH(
      req("PATCH", "http://t/api/festivals/" + FIXTURE_EDITION_ID, {}),
      makeCtx(FIXTURE_EDITION_ID),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when endDate < startDate", async () => {
    const { PATCH } = await import("@/app/api/festivals/[id]/route");
    const res = await PATCH(
      req("PATCH", "http://t/api/festivals/" + FIXTURE_EDITION_ID, {
        startDate: "2026-08-16",
        endDate: "2026-08-14",
      }),
      makeCtx(FIXTURE_EDITION_ID),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when festival not in workspace", async () => {
    dbSelectImpl.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
    const { PATCH } = await import("@/app/api/festivals/[id]/route");
    const res = await PATCH(
      req("PATCH", "http://t/api/festivals/other", { name: "x" }),
      makeCtx("other"),
    );
    expect(res.status).toBe(404);
  });
});

// ── Slot activeDates guard ─────────────────────────────────────────────────

describe("POST /api/slots — activeDates guard", () => {
  beforeEach(() => {
    vi.mocked(getAppSession).mockResolvedValue(fakeOwnerSession);
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  const validSlotBody = {
    stageId: FIXTURE_STAGE_ID,
    date: "2026-08-15",
    startTime: "22:00",
    endTime: "23:30",
  };

  it("allows slot when activeDates is empty (all dates ok)", async () => {
    vi.mocked(getStage).mockResolvedValue({ ...fixtureStage, activeDates: [] });
    const { POST } = await import("@/app/api/slots/route");
    const res = await POST(req("POST", "http://t/api/slots", validSlotBody));
    expect(res.status).toBe(201);
  });

  it("allows slot when activeDates is null", async () => {
    vi.mocked(getStage).mockResolvedValue({
      ...fixtureStage,
      activeDates: null,
    });
    const { POST } = await import("@/app/api/slots/route");
    const res = await POST(req("POST", "http://t/api/slots", validSlotBody));
    expect(res.status).toBe(201);
  });

  it("allows slot when date is in activeDates", async () => {
    vi.mocked(getStage).mockResolvedValue({
      ...fixtureStage,
      activeDates: ["2026-08-14", "2026-08-15"],
    });
    const { POST } = await import("@/app/api/slots/route");
    const res = await POST(req("POST", "http://t/api/slots", validSlotBody));
    expect(res.status).toBe(201);
  });

  it("rejects slot when date is NOT in activeDates", async () => {
    vi.mocked(getStage).mockResolvedValue({
      ...fixtureStage,
      activeDates: ["2026-08-14"],
    });
    const { POST } = await import("@/app/api/slots/route");
    const res = await POST(
      req("POST", "http://t/api/slots", {
        ...validSlotBody,
        date: "2026-08-15",
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/not active/i);
  });
});
