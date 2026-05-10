import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_BOOKING_ID,
  FIXTURE_EDITION_ID,
  FIXTURE_HOTEL_ID,
  FIXTURE_ROOM_BLOCK_ID,
  fixtureBooking,
  fixtureHotel,
  fixtureRoomBlock,
} from "../fixtures/hotels";
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

vi.mock("@/lib/hotels/repo", () => ({
  // hotels
  listHotels: vi.fn(async () => [fixtureHotel]),
  getHotel: vi.fn(async () => fixtureHotel),
  createHotel: vi.fn(async (input) => ({
    ...fixtureHotel,
    ...input,
    id: FIXTURE_HOTEL_ID,
  })),
  updateHotel: vi.fn(async (_id, input) => ({ ...fixtureHotel, ...input })),
  deleteHotel: vi.fn(async () => fixtureHotel),
  // room blocks
  listRoomBlocks: vi.fn(async () => [fixtureRoomBlock]),
  getRoomBlock: vi.fn(async () => fixtureRoomBlock),
  createRoomBlock: vi.fn(async (_editionId, input) => ({
    ...fixtureRoomBlock,
    ...input,
    id: FIXTURE_ROOM_BLOCK_ID,
  })),
  updateRoomBlock: vi.fn(async (_id, input) => ({
    ...fixtureRoomBlock,
    ...input,
  })),
  deleteRoomBlock: vi.fn(async () => fixtureRoomBlock),
  getBlockCapacity: vi.fn(async () => ({
    reserved: 10,
    peakAssigned: 3,
    free: 7,
  })),
  // bookings
  listBookings: vi.fn(async () => [fixtureBooking]),
  getBooking: vi.fn(async () => fixtureBooking),
  createBooking: vi.fn(async (input) => ({
    ...fixtureBooking,
    ...input,
    id: FIXTURE_BOOKING_ID,
  })),
  updateBooking: vi.fn(async (_id, input) => ({ ...fixtureBooking, ...input })),
  buildUpdateBooking: vi.fn((_id, input) => ({
    __updateBuilder: "booking",
    input,
  })),
  deleteBooking: vi.fn(async () => fixtureBooking),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/hotels/repo";
import * as audit from "@/lib/audit";

import {
  GET as hotelsListGET,
  POST as hotelsPOST,
} from "@/app/api/hotels/route";
import {
  GET as hotelGET,
  PATCH as hotelPATCH,
  DELETE as hotelDELETE,
} from "@/app/api/hotels/[id]/route";

import {
  GET as blocksListGET,
  POST as blocksPOST,
} from "@/app/api/room-blocks/route";
import {
  GET as blockGET,
  PATCH as blockPATCH,
  DELETE as blockDELETE,
} from "@/app/api/room-blocks/[id]/route";

import {
  GET as bookingsListGET,
  POST as bookingsPOST,
} from "@/app/api/hotel-bookings/route";
import {
  GET as bookingGET,
  PATCH as bookingPATCH,
  DELETE as bookingDELETE,
} from "@/app/api/hotel-bookings/[id]/route";

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
    if (queries.length === 2) return [[fixtureBooking], [{}]];
    return [];
  });
  mocks.audit.recordTransition.mockClear();
});

// ── /api/hotels ─────────────────────────────────────────────────────────

describe("/api/hotels", () => {
  it("GET returns the list", async () => {
    const res = await hotelsListGET(jsonReq("http://test/api/hotels", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hotels).toHaveLength(1);
    expect(body.hotels[0].name).toBe("Byblos Sur Mer");
  });

  it("GET threads search param", async () => {
    await hotelsListGET(jsonReq("http://test/api/hotels?search=byblos", "GET"));
    expect(mocks.repo.listHotels).toHaveBeenCalledWith({ search: "byblos" });
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await hotelsListGET(jsonReq("http://test/api/hotels", "GET"));
    expect(res.status).toBe(401);
  });

  it("GET 403 when permission denied", async () => {
    mocks.session.requirePermission.mockReturnValueOnce(
      Response.json({ error: "Forbidden" }, { status: 403 }),
    );
    const res = await hotelsListGET(jsonReq("http://test/api/hotels", "GET"));
    expect(res.status).toBe(403);
  });

  it("POST creates with valid input", async () => {
    const res = await hotelsPOST(
      jsonReq("http://test/api/hotels", "POST", {
        name: "Aqua Resort",
        location: "Batroun",
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createHotel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Aqua Resort", location: "Batroun" }),
    );
  });

  it("POST normalises empty optional strings to null", async () => {
    await hotelsPOST(
      jsonReq("http://test/api/hotels", "POST", {
        name: "Aqua Resort",
        location: "",
        contactEmail: "",
      }),
    );
    expect(mocks.repo.createHotel).toHaveBeenCalledWith(
      expect.objectContaining({ location: null, contactEmail: null }),
    );
  });

  it("POST 400 missing name", async () => {
    const res = await hotelsPOST(
      jsonReq("http://test/api/hotels", "POST", { location: "Batroun" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad email", async () => {
    const res = await hotelsPOST(
      jsonReq("http://test/api/hotels", "POST", {
        name: "X",
        contactEmail: "not-email",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 malformed JSON", async () => {
    const req = new NextRequest("http://test/api/hotels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await hotelsPOST(req);
    expect(res.status).toBe(400);
  });
});

describe("/api/hotels/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_HOTEL_ID }) };

  it("GET returns the hotel", async () => {
    const res = await hotelGET(jsonReq("http://test/api/hotels/x", "GET"), ctx);
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getHotel.mockResolvedValueOnce(null);
    const res = await hotelGET(
      jsonReq("http://test/api/hotels/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PATCH updates the hotel", async () => {
    await hotelPATCH(
      jsonReq("http://test/api/hotels/x", "PATCH", { name: "Renamed" }),
      ctx,
    );
    expect(mocks.repo.updateHotel).toHaveBeenCalledWith(FIXTURE_HOTEL_ID, {
      name: "Renamed",
    });
  });

  it("PATCH 400 empty body", async () => {
    const res = await hotelPATCH(
      jsonReq("http://test/api/hotels/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("PATCH normalises empty optional to null", async () => {
    await hotelPATCH(
      jsonReq("http://test/api/hotels/x", "PATCH", { contactPhone: "" }),
      ctx,
    );
    expect(mocks.repo.updateHotel).toHaveBeenCalledWith(FIXTURE_HOTEL_ID, {
      contactPhone: null,
    });
  });

  it("DELETE removes", async () => {
    const res = await hotelDELETE(
      jsonReq("http://test/api/hotels/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 404 missing", async () => {
    mocks.repo.deleteHotel.mockResolvedValueOnce(null);
    const res = await hotelDELETE(
      jsonReq("http://test/api/hotels/missing", "DELETE"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await hotelDELETE(
      jsonReq("http://test/api/hotels/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});

// ── /api/room-blocks ────────────────────────────────────────────────────

describe("/api/room-blocks", () => {
  it("GET returns blocks for the current edition", async () => {
    const res = await blocksListGET(
      jsonReq("http://test/api/room-blocks", "GET"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roomBlocks).toHaveLength(1);
    expect(mocks.repo.listRoomBlocks).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      hotelId: undefined,
    });
  });

  it("GET threads hotelId filter", async () => {
    await blocksListGET(
      jsonReq(`http://test/api/room-blocks?hotelId=${FIXTURE_HOTEL_ID}`, "GET"),
    );
    expect(mocks.repo.listRoomBlocks).toHaveBeenCalledWith({
      editionId: FIXTURE_EDITION_ID,
      hotelId: FIXTURE_HOTEL_ID,
    });
  });

  it("POST creates with valid input", async () => {
    const res = await blocksPOST(
      jsonReq("http://test/api/room-blocks", "POST", {
        hotelId: FIXTURE_HOTEL_ID,
        label: "Crew - Standard",
        roomType: "Standard double",
        nights: 3,
        roomsReserved: 5,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createRoomBlock).toHaveBeenCalledWith(
      FIXTURE_EDITION_ID,
      expect.objectContaining({
        hotelId: FIXTURE_HOTEL_ID,
        label: "Crew - Standard",
        roomType: "Standard double",
        nights: 3,
        roomsReserved: 5,
      }),
    );
  });

  it("POST 400 missing roomType", async () => {
    const res = await blocksPOST(
      jsonReq("http://test/api/room-blocks", "POST", {
        hotelId: FIXTURE_HOTEL_ID,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 bad hotelId uuid", async () => {
    const res = await blocksPOST(
      jsonReq("http://test/api/room-blocks", "POST", {
        hotelId: "not-uuid",
        roomType: "Single",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400 negative roomsReserved", async () => {
    const res = await blocksPOST(
      jsonReq("http://test/api/room-blocks", "POST", {
        hotelId: FIXTURE_HOTEL_ID,
        roomType: "Single",
        roomsReserved: -1,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await blocksListGET(
      jsonReq("http://test/api/room-blocks", "GET"),
    );
    expect(res.status).toBe(401);
  });
});

describe("/api/room-blocks/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_ROOM_BLOCK_ID }) };

  it("GET returns the block", async () => {
    const res = await blockGET(
      jsonReq("http://test/api/room-blocks/x", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roomBlock.id).toBe(FIXTURE_ROOM_BLOCK_ID);
    expect(body.capacity).toBeUndefined();
  });

  it("GET ?capacity=1 includes capacity", async () => {
    const res = await blockGET(
      jsonReq("http://test/api/room-blocks/x?capacity=1", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capacity).toEqual({ reserved: 10, peakAssigned: 3, free: 7 });
    expect(mocks.repo.getBlockCapacity).toHaveBeenCalledWith(
      FIXTURE_ROOM_BLOCK_ID,
    );
  });

  it("PATCH partial only sends provided keys", async () => {
    await blockPATCH(
      jsonReq("http://test/api/room-blocks/x", "PATCH", { roomsReserved: 12 }),
      ctx,
    );
    expect(mocks.repo.updateRoomBlock).toHaveBeenCalledWith(
      FIXTURE_ROOM_BLOCK_ID,
      { roomsReserved: 12 },
    );
  });

  it("PATCH 400 empty body", async () => {
    const res = await blockPATCH(
      jsonReq("http://test/api/room-blocks/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("PATCH normalises empty label to null", async () => {
    await blockPATCH(
      jsonReq("http://test/api/room-blocks/x", "PATCH", { label: "" }),
      ctx,
    );
    expect(mocks.repo.updateRoomBlock).toHaveBeenCalledWith(
      FIXTURE_ROOM_BLOCK_ID,
      { label: null },
    );
  });

  it("DELETE removes", async () => {
    const res = await blockDELETE(
      jsonReq("http://test/api/room-blocks/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });
});

// ── /api/hotel-bookings ─────────────────────────────────────────────────

describe("/api/hotel-bookings", () => {
  it("GET defaults to current-edition scope", async () => {
    await bookingsListGET(jsonReq("http://test/api/hotel-bookings", "GET"));
    expect(mocks.repo.listBookings).toHaveBeenCalledWith(
      expect.objectContaining({ editionId: FIXTURE_EDITION_ID }),
    );
  });

  it("GET ?scope=all skips edition scope", async () => {
    await bookingsListGET(
      jsonReq("http://test/api/hotel-bookings?scope=all", "GET"),
    );
    expect(mocks.repo.listBookings).toHaveBeenCalledWith(
      expect.objectContaining({ editionId: undefined }),
    );
  });

  it("GET threads filters", async () => {
    await bookingsListGET(
      jsonReq(
        `http://test/api/hotel-bookings?roomBlockId=${FIXTURE_ROOM_BLOCK_ID}&personKind=artist&personId=${FIXTURE_ARTIST_ID}&status=booked&activeFrom=2026-08-13&activeTo=2026-08-16`,
        "GET",
      ),
    );
    expect(mocks.repo.listBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        roomBlockId: FIXTURE_ROOM_BLOCK_ID,
        personKind: "artist",
        personId: FIXTURE_ARTIST_ID,
        status: "booked",
        activeFrom: "2026-08-13",
        activeTo: "2026-08-16",
      }),
    );
  });

  it("GET ignores invalid status / personKind silently", async () => {
    await bookingsListGET(
      jsonReq(
        "http://test/api/hotel-bookings?status=teleported&personKind=alien&scope=all",
        "GET",
      ),
    );
    expect(mocks.repo.listBookings).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined, personKind: undefined }),
    );
  });

  const validBooking = {
    hotelId: FIXTURE_HOTEL_ID,
    roomBlockId: FIXTURE_ROOM_BLOCK_ID,
    personKind: "artist",
    personId: FIXTURE_ARTIST_ID,
    checkin: "2026-08-13",
    checkout: "2026-08-16",
  };

  it("POST creates with valid input", async () => {
    const res = await bookingsPOST(
      jsonReq("http://test/api/hotel-bookings", "POST", validBooking),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: FIXTURE_HOTEL_ID,
        personKind: "artist",
        checkin: "2026-08-13",
        checkout: "2026-08-16",
        status: "booked",
      }),
    );
  });

  it("POST 400 when checkout before checkin", async () => {
    const res = await bookingsPOST(
      jsonReq("http://test/api/hotel-bookings", "POST", {
        ...validBooking,
        checkin: "2026-08-16",
        checkout: "2026-08-13",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.fieldErrors.checkout).toBeDefined();
  });

  it("POST allows checkin === checkout (zero-night same-day booking)", async () => {
    const res = await bookingsPOST(
      jsonReq("http://test/api/hotel-bookings", "POST", {
        ...validBooking,
        checkin: "2026-08-13",
        checkout: "2026-08-13",
      }),
    );
    expect(res.status).toBe(201);
  });

  it("POST 400 bad checkin format", async () => {
    const res = await bookingsPOST(
      jsonReq("http://test/api/hotel-bookings", "POST", {
        ...validBooking,
        checkin: "Aug 13",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST allows walk-up (no roomBlockId)", async () => {
    const res = await bookingsPOST(
      jsonReq("http://test/api/hotel-bookings", "POST", {
        ...validBooking,
        roomBlockId: "",
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.repo.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ roomBlockId: null }),
    );
  });

  it("POST 400 missing personId", async () => {
    const { personId: _drop, ...rest } = validBooking;
    void _drop;
    const res = await bookingsPOST(
      jsonReq("http://test/api/hotel-bookings", "POST", rest),
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/hotel-bookings/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_BOOKING_ID }) };

  it("GET returns the booking", async () => {
    const res = await bookingGET(
      jsonReq("http://test/api/hotel-bookings/x", "GET"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("GET 404 missing", async () => {
    mocks.repo.getBooking.mockResolvedValueOnce(null);
    const res = await bookingGET(
      jsonReq("http://test/api/hotel-bookings/missing", "GET"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PATCH non-status field uses updateBooking directly", async () => {
    await bookingPATCH(
      jsonReq("http://test/api/hotel-bookings/x", "PATCH", {
        bookingNumber: "BSM-002",
      }),
      ctx,
    );
    expect(batchImpl).not.toHaveBeenCalled();
    expect(mocks.audit.recordTransition).not.toHaveBeenCalled();
    expect(mocks.repo.updateBooking).toHaveBeenCalledWith(FIXTURE_BOOKING_ID, {
      bookingNumber: "BSM-002",
    });
  });

  it("PATCH status change goes via db.batch and records the transition", async () => {
    const res = await bookingPATCH(
      jsonReq("http://test/api/hotel-bookings/x", "PATCH", {
        status: "checked_in",
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(batchImpl).toHaveBeenCalledTimes(1);
    expect(mocks.repo.buildUpdateBooking).toHaveBeenCalledWith(
      FIXTURE_BOOKING_ID,
      { status: "checked_in" },
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: "u1",
        entity: { type: "hotel_booking", id: FIXTURE_BOOKING_ID },
        diff: { field: "status", from: "booked", to: "checked_in" },
      },
    );
    expect(mocks.repo.updateBooking).not.toHaveBeenCalled();
  });

  it("PATCH accepts no_show as a status transition", async () => {
    await bookingPATCH(
      jsonReq("http://test/api/hotel-bookings/x", "PATCH", {
        status: "no_show",
      }),
      ctx,
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        diff: { field: "status", from: "booked", to: "no_show" },
      }),
    );
  });

  it("PATCH where db.batch rejects propagates the error", async () => {
    batchImpl.mockRejectedValueOnce(new Error("constraint violation"));
    await expect(
      bookingPATCH(
        jsonReq("http://test/api/hotel-bookings/x", "PATCH", {
          status: "checked_in",
        }),
        ctx,
      ),
    ).rejects.toThrow("constraint violation");
  });

  it("PATCH 400 when checkout precedes checkin in the same patch", async () => {
    const res = await bookingPATCH(
      jsonReq("http://test/api/hotel-bookings/x", "PATCH", {
        checkin: "2026-08-16",
        checkout: "2026-08-13",
      }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("PATCH 400 empty body", async () => {
    const res = await bookingPATCH(
      jsonReq("http://test/api/hotel-bookings/x", "PATCH", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes", async () => {
    const res = await bookingDELETE(
      jsonReq("http://test/api/hotel-bookings/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("DELETE 401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await bookingDELETE(
      jsonReq("http://test/api/hotel-bookings/x", "DELETE"),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
