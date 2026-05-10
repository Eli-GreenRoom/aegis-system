import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { fixtureFlight, FIXTURE_FLIGHT_ID } from "../fixtures/flight";
import { fixturePickup, FIXTURE_PICKUP_ID } from "../fixtures/ground";
import { fixtureBooking, FIXTURE_BOOKING_ID } from "../fixtures/hotels";
import { fakeOwnerSession } from "../fixtures/session";

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

const batchImpl = vi.fn(async (_q: unknown[]): Promise<unknown[]> => []);

vi.mock("@/db/client", () => ({
  db: { batch: (q: unknown[]) => batchImpl(q) },
  schema: {},
}));

vi.mock("@/lib/audit", () => ({
  recordTransition: vi.fn(() => ({ __auditBuilder: true })),
}));

vi.mock("@/lib/flights/repo", () => ({
  getFlight: vi.fn(),
  buildUpdateFlight: vi.fn((id, input) => ({ __builder: "flight", id, input })),
}));
vi.mock("@/lib/ground/repo", () => ({
  getPickup: vi.fn(),
  buildUpdatePickup: vi.fn((id, input) => ({ __builder: "pickup", id, input })),
}));
vi.mock("@/lib/hotels/repo", () => ({
  getBooking: vi.fn(),
  buildUpdateBooking: vi.fn((id, input) => ({
    __builder: "booking",
    id,
    input,
  })),
}));

import * as session from "@/lib/session";
import * as flightsRepo from "@/lib/flights/repo";
import * as groundRepo from "@/lib/ground/repo";
import * as hotelsRepo from "@/lib/hotels/repo";
import * as audit from "@/lib/audit";
import { POST as advanceFlight } from "@/app/api/flights/[id]/advance/route";
import { POST as advancePickup } from "@/app/api/pickups/[id]/advance/route";
import { POST as advanceBooking } from "@/app/api/hotel-bookings/[id]/advance/route";

const mocks = {
  session: vi.mocked(session),
  flights: vi.mocked(flightsRepo),
  ground: vi.mocked(groundRepo),
  hotels: vi.mocked(hotelsRepo),
  audit: vi.mocked(audit),
};

function postReq(url: string): NextRequest {
  return new NextRequest(url, { method: "POST" });
}

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeOwnerSession);
  mocks.session.requirePermission.mockReturnValue(null);
  batchImpl.mockReset();
  batchImpl.mockResolvedValue([[fixtureFlight], [{}]]);
  mocks.audit.recordTransition.mockClear();
});

// ── /api/flights/[id]/advance ───────────────────────────────────────────

describe("POST /api/flights/[id]/advance", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_FLIGHT_ID }) };

  it("scheduled -> boarded, no actualDt stamp", async () => {
    mocks.flights.getFlight.mockResolvedValueOnce({
      ...fixtureFlight,
      status: "scheduled",
    });
    const res = await advanceFlight(postReq("http://t/x"), ctx);
    expect(res.status).toBe(200);
    expect(mocks.flights.buildUpdateFlight).toHaveBeenCalledWith(
      FIXTURE_FLIGHT_ID,
      { status: "boarded" },
    );
    expect(mocks.audit.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        diff: { field: "status", from: "scheduled", to: "boarded" },
      }),
    );
  });

  it("in_air -> landed stamps actualDt", async () => {
    mocks.flights.getFlight.mockResolvedValueOnce({
      ...fixtureFlight,
      status: "in_air",
      actualDt: null,
    });
    await advanceFlight(postReq("http://t/x"), ctx);
    const call = mocks.flights.buildUpdateFlight.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ status: "landed" });
    expect((call?.[1] as { actualDt?: Date }).actualDt).toBeInstanceOf(Date);
  });

  it("in_air -> landed does NOT overwrite an existing actualDt", async () => {
    const existingActual = new Date("2026-08-15T10:00:00Z");
    mocks.flights.getFlight.mockResolvedValueOnce({
      ...fixtureFlight,
      status: "in_air",
      actualDt: existingActual,
    });
    await advanceFlight(postReq("http://t/x"), ctx);
    const call = mocks.flights.buildUpdateFlight.mock.calls.at(-1);
    expect("actualDt" in (call?.[1] ?? {})).toBe(false);
  });

  it("409 when at terminal status (landed)", async () => {
    mocks.flights.getFlight.mockResolvedValueOnce({
      ...fixtureFlight,
      status: "landed",
    });
    const res = await advanceFlight(postReq("http://t/x"), ctx);
    expect(res.status).toBe(409);
    expect(mocks.flights.buildUpdateFlight).not.toHaveBeenCalled();
  });

  it("409 when delayed", async () => {
    mocks.flights.getFlight.mockResolvedValueOnce({
      ...fixtureFlight,
      status: "delayed",
    });
    const res = await advanceFlight(postReq("http://t/x"), ctx);
    expect(res.status).toBe(409);
  });

  it("404 missing", async () => {
    mocks.flights.getFlight.mockResolvedValueOnce(null);
    const res = await advanceFlight(postReq("http://t/x"), ctx);
    expect(res.status).toBe(404);
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await advanceFlight(postReq("http://t/x"), ctx);
    expect(res.status).toBe(401);
  });
});

// ── /api/pickups/[id]/advance ───────────────────────────────────────────

describe("POST /api/pickups/[id]/advance", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_PICKUP_ID }) };

  it("scheduled -> dispatched stamps dispatchedAt", async () => {
    mocks.ground.getPickup.mockResolvedValueOnce({
      ...fixturePickup,
      status: "scheduled",
    });
    batchImpl.mockResolvedValueOnce([[fixturePickup], [{}]]);
    await advancePickup(postReq("http://t/x"), ctx);
    const call = mocks.ground.buildUpdatePickup.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ status: "dispatched" });
    expect((call?.[1] as { dispatchedAt?: Date }).dispatchedAt).toBeInstanceOf(
      Date,
    );
  });

  it("dispatched -> in_transit stamps inTransitAt", async () => {
    mocks.ground.getPickup.mockResolvedValueOnce({
      ...fixturePickup,
      status: "dispatched",
      dispatchedAt: new Date(),
    });
    batchImpl.mockResolvedValueOnce([[fixturePickup], [{}]]);
    await advancePickup(postReq("http://t/x"), ctx);
    const call = mocks.ground.buildUpdatePickup.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ status: "in_transit" });
    expect((call?.[1] as { inTransitAt?: Date }).inTransitAt).toBeInstanceOf(
      Date,
    );
  });

  it("in_transit -> completed stamps completedAt", async () => {
    mocks.ground.getPickup.mockResolvedValueOnce({
      ...fixturePickup,
      status: "in_transit",
    });
    batchImpl.mockResolvedValueOnce([[fixturePickup], [{}]]);
    await advancePickup(postReq("http://t/x"), ctx);
    const call = mocks.ground.buildUpdatePickup.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ status: "completed" });
    expect((call?.[1] as { completedAt?: Date }).completedAt).toBeInstanceOf(
      Date,
    );
  });

  it("409 when at completed", async () => {
    mocks.ground.getPickup.mockResolvedValueOnce({
      ...fixturePickup,
      status: "completed",
    });
    const res = await advancePickup(postReq("http://t/x"), ctx);
    expect(res.status).toBe(409);
  });

  it("404 missing", async () => {
    mocks.ground.getPickup.mockResolvedValueOnce(null);
    const res = await advancePickup(postReq("http://t/x"), ctx);
    expect(res.status).toBe(404);
  });
});

// ── /api/hotel-bookings/[id]/advance ────────────────────────────────────

describe("POST /api/hotel-bookings/[id]/advance", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_BOOKING_ID }) };

  it("booked -> checked_in stamps checkedInAt", async () => {
    mocks.hotels.getBooking.mockResolvedValueOnce({
      ...fixtureBooking,
      status: "booked",
      checkedInAt: null,
    });
    batchImpl.mockResolvedValueOnce([[fixtureBooking], [{}]]);
    await advanceBooking(postReq("http://t/x"), ctx);
    const call = mocks.hotels.buildUpdateBooking.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ status: "checked_in" });
    expect((call?.[1] as { checkedInAt?: Date }).checkedInAt).toBeInstanceOf(
      Date,
    );
  });

  it("checked_in -> checked_out stamps checkedOutAt", async () => {
    mocks.hotels.getBooking.mockResolvedValueOnce({
      ...fixtureBooking,
      status: "checked_in",
      checkedInAt: new Date(),
    });
    batchImpl.mockResolvedValueOnce([[fixtureBooking], [{}]]);
    await advanceBooking(postReq("http://t/x"), ctx);
    const call = mocks.hotels.buildUpdateBooking.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ status: "checked_out" });
    expect((call?.[1] as { checkedOutAt?: Date }).checkedOutAt).toBeInstanceOf(
      Date,
    );
  });

  it("409 when no_show", async () => {
    mocks.hotels.getBooking.mockResolvedValueOnce({
      ...fixtureBooking,
      status: "no_show",
    });
    const res = await advanceBooking(postReq("http://t/x"), ctx);
    expect(res.status).toBe(409);
  });

  it("404 missing", async () => {
    mocks.hotels.getBooking.mockResolvedValueOnce(null);
    const res = await advanceBooking(postReq("http://t/x"), ctx);
    expect(res.status).toBe(404);
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await advanceBooking(postReq("http://t/x"), ctx);
    expect(res.status).toBe(401);
  });
});
