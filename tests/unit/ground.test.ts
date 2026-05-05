import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_PICKUP_ID,
  FIXTURE_VENDOR_ID,
  fixturePickup,
  fixtureVendor,
} from "../fixtures/ground";

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

vi.mock("@/lib/ground/repo", () => ({
  // vendors
  listVendors: vi.fn(async () => [fixtureVendor]),
  getVendor: vi.fn(async () => fixtureVendor),
  createVendor: vi.fn(async (input) => ({
    ...fixtureVendor,
    ...input,
    id: FIXTURE_VENDOR_ID,
  })),
  updateVendor: vi.fn(async (_id, input) => ({ ...fixtureVendor, ...input })),
  deleteVendor: vi.fn(async () => fixtureVendor),
  // pickups
  listPickups: vi.fn(async () => [fixturePickup]),
  getPickup: vi.fn(async () => fixturePickup),
  createPickup: vi.fn(async (_editionId, input) => ({
    ...fixturePickup,
    ...input,
    id: FIXTURE_PICKUP_ID,
  })),
  updatePickup: vi.fn(async (_id, input) => ({ ...fixturePickup, ...input })),
  deletePickup: vi.fn(async () => fixturePickup),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/ground/repo";
import {
  GET as vendorsListGET,
  POST as vendorsPOST,
} from "@/app/api/vendors/route";
import {
  GET as vendorGET,
  PATCH as vendorPATCH,
  DELETE as vendorDELETE,
} from "@/app/api/vendors/[id]/route";
import {
  GET as pickupsListGET,
  POST as pickupsPOST,
} from "@/app/api/pickups/route";
import {
  GET as pickupGET,
  PATCH as pickupPATCH,
  DELETE as pickupDELETE,
} from "@/app/api/pickups/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
};

const fakeSession = {
  user: { id: "u1", email: "booking@aegisfestival.com", name: "Eli" },
  ownerId: "u1",
  isOwner: true,
  role: "owner" as const,
  permissions: { ground: true },
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

// ── Vendors ──────────────────────────────────────────────────────────

describe("/api/vendors", () => {
  it("GET returns the list", async () => {
    const res = await vendorsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vendors).toHaveLength(1);
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await vendorsListGET();
    expect(res.status).toBe(401);
  });

  it("POST creates", async () => {
    const res = await vendorsPOST(
      jsonReq("http://test/api/vendors", "POST", {
        name: "LuxCars",
        service: "Car service",
      })
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createVendor).toHaveBeenCalled();
  });

  it("POST 400 missing service", async () => {
    const res = await vendorsPOST(
      jsonReq("http://test/api/vendors", "POST", { name: "X" })
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad email", async () => {
    const res = await vendorsPOST(
      jsonReq("http://test/api/vendors", "POST", {
        name: "X",
        service: "Taxi",
        contactEmail: "not-an-email",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/vendors/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_VENDOR_ID }) };

  it("GET returns vendor", async () => {
    const res = await vendorGET(jsonReq("http://test/api/vendors/x", "GET"), ctx);
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getVendor.mockResolvedValueOnce(null);
    const res = await vendorGET(
      jsonReq("http://test/api/vendors/x", "GET"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("PATCH partial only sends provided keys", async () => {
    await vendorPATCH(
      jsonReq("http://test/api/vendors/x", "PATCH", { name: "Renamed" }),
      ctx
    );
    expect(mocks.repo.updateVendor).toHaveBeenCalledWith(FIXTURE_VENDOR_ID, {
      name: "Renamed",
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await vendorPATCH(
      jsonReq("http://test/api/vendors/x", "PATCH", {}),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("PATCH normalises empty contactPhone to null", async () => {
    await vendorPATCH(
      jsonReq("http://test/api/vendors/x", "PATCH", { contactPhone: "" }),
      ctx
    );
    expect(mocks.repo.updateVendor).toHaveBeenCalledWith(FIXTURE_VENDOR_ID, {
      contactPhone: null,
    });
  });

  it("DELETE removes", async () => {
    const res = await vendorDELETE(
      jsonReq("http://test/api/vendors/x", "DELETE"),
      ctx
    );
    expect(res.status).toBe(200);
  });
});

// ── Pickups ──────────────────────────────────────────────────────────

describe("/api/pickups", () => {
  it("GET filters by status + route", async () => {
    await pickupsListGET(
      jsonReq(
        `http://test/api/pickups?status=scheduled&routeFrom=airport&routeTo=hotel&vendorId=${FIXTURE_VENDOR_ID}`,
        "GET"
      )
    );
    expect(mocks.repo.listPickups).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      search: undefined,
      status: "scheduled",
      routeFrom: "airport",
      routeTo: "hotel",
      personKind: undefined,
      personId: undefined,
      vendorId: FIXTURE_VENDOR_ID,
    });
  });

  it("GET ignores invalid status", async () => {
    await pickupsListGET(
      jsonReq("http://test/api/pickups?status=bogus", "GET")
    );
    expect(mocks.repo.listPickups).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined })
    );
  });

  it("POST creates", async () => {
    const res = await pickupsPOST(
      jsonReq("http://test/api/pickups", "POST", {
        personKind: "artist",
        personId: FIXTURE_ARTIST_ID,
        routeFrom: "airport",
        routeTo: "hotel",
        pickupDt: "2026-08-13T15:00:00Z",
      })
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createPickup).toHaveBeenCalled();
  });

  it("POST 400 bad route enum", async () => {
    const res = await pickupsPOST(
      jsonReq("http://test/api/pickups", "POST", {
        personKind: "artist",
        personId: FIXTURE_ARTIST_ID,
        routeFrom: "moon",
        routeTo: "hotel",
        pickupDt: "2026-08-13T15:00:00Z",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad date", async () => {
    const res = await pickupsPOST(
      jsonReq("http://test/api/pickups", "POST", {
        personKind: "artist",
        personId: FIXTURE_ARTIST_ID,
        routeFrom: "airport",
        routeTo: "hotel",
        pickupDt: "not-a-date",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/pickups/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_PICKUP_ID }) };

  it("PATCH partial only sends provided keys", async () => {
    await pickupPATCH(
      jsonReq("http://test/api/pickups/x", "PATCH", { status: "completed" }),
      ctx
    );
    expect(mocks.repo.updatePickup).toHaveBeenCalledWith(FIXTURE_PICKUP_ID, {
      status: "completed",
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await pickupPATCH(
      jsonReq("http://test/api/pickups/x", "PATCH", {}),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it("PATCH clears vendorId with empty string", async () => {
    await pickupPATCH(
      jsonReq("http://test/api/pickups/x", "PATCH", { vendorId: "" }),
      ctx
    );
    expect(mocks.repo.updatePickup).toHaveBeenCalledWith(FIXTURE_PICKUP_ID, {
      vendorId: null,
    });
  });

  it("PATCH updates pickupDt", async () => {
    await pickupPATCH(
      jsonReq("http://test/api/pickups/x", "PATCH", {
        pickupDt: "2026-08-14T10:00:00Z",
      }),
      ctx
    );
    expect(mocks.repo.updatePickup).toHaveBeenCalledWith(
      FIXTURE_PICKUP_ID,
      expect.objectContaining({ pickupDt: expect.any(Date) })
    );
  });

  it("DELETE removes", async () => {
    const res = await pickupDELETE(
      jsonReq("http://test/api/pickups/x", "DELETE"),
      ctx
    );
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getPickup.mockResolvedValueOnce(null);
    const res = await pickupGET(
      jsonReq("http://test/api/pickups/x", "GET"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await pickupGET(
      jsonReq("http://test/api/pickups/x", "GET"),
      ctx
    );
    expect(res.status).toBe(401);
  });
});
