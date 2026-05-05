import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture Drizzle calls so we can stub `select(...).from(...).where(...)`
// chains separately for the block-lookup query and the bookings query.
// Typed as any so we can re-implement per-test with different return
// shapes (block-lookup ends in .limit(); bookings list is awaited at
// .where()) without fighting the hoisted vi.fn signature.
const { selectMock } = vi.hoisted(() => {
  const select = vi.fn() as ReturnType<typeof vi.fn>;
  return { selectMock: select };
});

vi.mock("@/db/client", () => ({
  db: { select: selectMock },
  schema: {},
}));

vi.mock("@/db/schema", () => ({
  hotelRoomBlocks: { id: "id", roomsReserved: "roomsReserved" },
  hotelBookings: {
    roomBlockId: "roomBlockId",
    checkin: "checkin",
    checkout: "checkout",
    status: "status",
  },
  hotels: {},
}));

import { getBlockCapacity } from "@/lib/hotels/repo";

beforeEach(() => {
  selectMock.mockReset();
});

/**
 * Wire up the two queries `getBlockCapacity` makes:
 *   1. block lookup -> [{ roomsReserved }]   (chain ends in .limit())
 *   2. bookings list -> array of rows         (chain ends in .where())
 */
function setupCapacityQueries(
  reserved: number | null,
  bookings: Array<{ checkin: string; checkout: string; status: string }>
) {
  // First query: select.from.where.limit (block).
  // Second query: select.from.where (bookings - awaited directly).
  let call = 0;
  selectMock.mockImplementation(() => {
    call += 1;
    if (call === 1) {
      // block lookup ends in .limit()
      return {
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve(reserved == null ? [] : [{ roomsReserved: reserved }]),
          }),
        }),
      };
    }
    // bookings list - the where() return is awaited directly
    return {
      from: () => ({
        where: () => Promise.resolve(bookings),
      }),
    };
  });
}

describe("getBlockCapacity", () => {
  it("returns reserved=0 when block missing", async () => {
    setupCapacityQueries(null, []);
    const cap = await getBlockCapacity("missing");
    expect(cap).toEqual({ reserved: 0, peakAssigned: 0, free: 0 });
  });

  it("zero bookings -> peak 0, full free", async () => {
    setupCapacityQueries(10, []);
    const cap = await getBlockCapacity("b1");
    expect(cap).toEqual({ reserved: 10, peakAssigned: 0, free: 10 });
  });

  it("non-overlapping bookings -> peak 1", async () => {
    setupCapacityQueries(10, [
      { checkin: "2026-08-13", checkout: "2026-08-15", status: "booked" },
      { checkin: "2026-08-16", checkout: "2026-08-18", status: "booked" },
    ]);
    const cap = await getBlockCapacity("b1");
    expect(cap.peakAssigned).toBe(1);
    expect(cap.free).toBe(9);
  });

  it("fully-overlapping bookings -> peak == count", async () => {
    setupCapacityQueries(10, [
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
    ]);
    const cap = await getBlockCapacity("b1");
    expect(cap.peakAssigned).toBe(3);
    expect(cap.free).toBe(7);
  });

  it("partially-overlapping bookings -> peak at the overlap window", async () => {
    setupCapacityQueries(5, [
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
      { checkin: "2026-08-15", checkout: "2026-08-18", status: "booked" },
    ]);
    const cap = await getBlockCapacity("b1");
    expect(cap.peakAssigned).toBe(2);
    expect(cap.free).toBe(3);
  });

  it("touching boundaries (out=in same day) do NOT overlap", async () => {
    // Booking A checks out 08-15, booking B checks in 08-15 -> different
    // people share the room across the same calendar date but the room
    // itself only holds one at a time. Sweep treats checkout as -1 first
    // for ties (events sorted by date then by delta), giving peak 1.
    setupCapacityQueries(1, [
      { checkin: "2026-08-13", checkout: "2026-08-15", status: "booked" },
      { checkin: "2026-08-15", checkout: "2026-08-17", status: "booked" },
    ]);
    const cap = await getBlockCapacity("b1");
    expect(cap.peakAssigned).toBe(1);
    expect(cap.free).toBe(0);
  });

  it("overbooked block reports negative free", async () => {
    setupCapacityQueries(2, [
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
      { checkin: "2026-08-13", checkout: "2026-08-16", status: "booked" },
    ]);
    const cap = await getBlockCapacity("b1");
    expect(cap.peakAssigned).toBe(3);
    expect(cap.free).toBe(-1);
  });
});
