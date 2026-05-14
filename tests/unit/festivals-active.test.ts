import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { FIXTURE_WORKSPACE_ID, fakeOwnerSession } from "../fixtures/session";

const FIXTURE_FESTIVAL_ID = "f1f1f1f1-f1f1-4f1f-af1f-f1f1f1f1f1f1";

const fixtureFestival = {
  id: FIXTURE_FESTIVAL_ID,
  workspaceId: FIXTURE_WORKSPACE_ID,
  slug: "aegis-2026",
  name: "Aegis Festival 2026",
  startDate: "2026-08-14",
  endDate: "2026-08-16",
  location: null,
  description: null,
  tenantBrand: null,
  festivalModeActive: false,
  archivedAt: null,
  createdAt: new Date(),
};

const mockSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mockSet })),
}));

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
}));

vi.mock("@/lib/festivals", () => ({
  getFestival: vi.fn(),
}));

import { getAppSession } from "@/lib/session";
import { getFestival } from "@/lib/festivals";
import { POST } from "@/app/api/festivals/active/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAppSession).mockResolvedValue(fakeOwnerSession);
  vi.mocked(getFestival).mockResolvedValue(fixtureFestival);
});

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/festivals/active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/festivals/active", () => {
  it("sets cookie and returns ok", async () => {
    const res = await POST(makeReq({ festivalId: FIXTURE_FESTIVAL_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      "active_festival_id",
      FIXTURE_FESTIVAL_ID,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAppSession).mockResolvedValue(null);
    const res = await POST(makeReq({ festivalId: FIXTURE_FESTIVAL_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq({ festivalId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when festival not in workspace", async () => {
    vi.mocked(getFestival).mockResolvedValue(null);
    const res = await POST(makeReq({ festivalId: FIXTURE_FESTIVAL_ID }));
    expect(res.status).toBe(404);
  });
});
