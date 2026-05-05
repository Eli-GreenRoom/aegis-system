/**
 * Aggregator unit tests. Each aggregator builds a Drizzle select chain
 * which we shape into "queries that resolve to fixture rows" via a
 * lazy mock of `@/db/client`. We don't assert SQL — only that the
 * aggregator's post-processing (filtering, denormalising, ranking)
 * produces the expected output shape from a controlled input.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted query queue: each aggregator call expects N queries to fire
// in a deterministic order. Tests push fixture results into this queue
// before invoking the aggregator. The mocked Drizzle chain returns
// whatever's at the front of the queue.
const { queue, peopleResolver } = vi.hoisted(() => {
  const q: unknown[][] = [];
  // resolvePeople is mocked at the module boundary; tests push into
  // this Map keyed by `kind:id`.
  const r = new Map<string, { kind: string; id: string; name: string; agency: string | null }>();
  return { queue: q, peopleResolver: r };
});

function pushQueryResult(rows: unknown[]) {
  queue.push(rows);
}

vi.mock("@/db/client", () => {
  // Build a chain that always yields a thenable returning the next
  // queue entry. Each step returns `this` so chained calls collapse
  // to one terminal await on the chain itself or on .limit(N).
  function makeChain() {
    const chain: Record<string, unknown> = {};
    const step = () => chain;
    // All Drizzle builder verbs that the aggregators use:
    for (const verb of [
      "from",
      "innerJoin",
      "leftJoin",
      "where",
      "orderBy",
      "groupBy",
      "limit",
      "set",
    ]) {
      chain[verb] = vi.fn(step);
    }
    // Make the chain awaitable - resolves to the next queue entry.
    chain.then = (resolve: (v: unknown) => void) => {
      const next = queue.shift() ?? [];
      resolve(next);
    };
    return chain;
  }
  return {
    db: {
      select: vi.fn(() => makeChain()),
      insert: vi.fn(() => makeChain()),
      update: vi.fn(() => makeChain()),
      delete: vi.fn(() => makeChain()),
      batch: vi.fn(),
    },
    schema: {},
  };
});

vi.mock("@/lib/people", () => ({
  resolvePeople: vi.fn(async (pairs: { kind: string; id: string }[]) => {
    const out = new Map();
    for (const p of pairs) {
      const found = peopleResolver.get(`${p.kind}:${p.id}`);
      if (found) out.set(`${p.kind}:${p.id}`, found);
    }
    return out;
  }),
}));

import {
  getArrivalsToday,
  getCurrentlyActiveBookings,
  getNowAndNext,
  getOpenIssues,
  getPickupsInWindow,
  getArtistRoadsheet,
} from "@/lib/aggregators";

const EDITION_ID = "11111111-1111-4111-8111-111111111111";
const ARTIST_ID = "22222222-2222-4222-8222-222222222222";
const STAGE_ID = "44444444-4444-4444-8444-444444444444";
const SLOT_ID = "55555555-5555-4555-8555-555555555555";
const FLIGHT_ID = "77777777-7777-4777-8777-777777777777";
const PICKUP_ID = "99999999-9999-4999-8999-999999999999";
const HOTEL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BLOCK_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BOOKING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SET_ID = "66666666-6666-4666-8666-666666666666";
const VENDOR_ID = "88888888-8888-4888-8888-888888888888";
const CONTRACT_ID = "12121212-1212-4121-8121-121212121212";
const GUEST_ID = "13131313-1313-4131-8131-131313131313";

beforeEach(() => {
  queue.length = 0;
  peopleResolver.clear();
});

// ── getArrivalsToday ────────────────────────────────────────────────────

describe("getArrivalsToday", () => {
  it("denormalises person + linked pickup onto each flight row", async () => {
    peopleResolver.set(`artist:${ARTIST_ID}`, {
      kind: "artist",
      id: ARTIST_ID,
      name: "Hiroko",
      agency: "WME",
    });
    pushQueryResult([
      {
        id: FLIGHT_ID,
        editionId: EDITION_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        direction: "inbound",
        scheduledDt: new Date("2026-08-15T14:30:00Z"),
        flightNumber: "ME202",
      },
    ]);
    pushQueryResult([
      {
        id: PICKUP_ID,
        editionId: EDITION_ID,
        linkedFlightId: FLIGHT_ID,
        status: "scheduled",
      },
    ]);

    const out = await getArrivalsToday(EDITION_ID, "2026-08-15");
    expect(out).toHaveLength(1);
    expect(out[0].person?.name).toBe("Hiroko");
    expect(out[0].linkedPickup?.id).toBe(PICKUP_ID);
  });

  it("returns [] when no flights match", async () => {
    pushQueryResult([]);
    const out = await getArrivalsToday(EDITION_ID, "2026-08-15");
    expect(out).toEqual([]);
  });

  it("leaves linkedPickup null when no pickup is linked", async () => {
    peopleResolver.set(`artist:${ARTIST_ID}`, {
      kind: "artist",
      id: ARTIST_ID,
      name: "Alex",
      agency: null,
    });
    pushQueryResult([
      {
        id: FLIGHT_ID,
        editionId: EDITION_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        direction: "inbound",
        scheduledDt: new Date("2026-08-15T10:00:00Z"),
      },
    ]);
    pushQueryResult([
      // pickup row exists but doesn't link to this flight
      { id: "other", editionId: EDITION_ID, linkedFlightId: null },
    ]);
    const out = await getArrivalsToday(EDITION_ID, "2026-08-15");
    expect(out[0].linkedPickup).toBeNull();
  });
});

// ── getPickupsInWindow ──────────────────────────────────────────────────

describe("getPickupsInWindow", () => {
  it("denormalises vendor + person onto each pickup", async () => {
    peopleResolver.set(`artist:${ARTIST_ID}`, {
      kind: "artist",
      id: ARTIST_ID,
      name: "Hiroko",
      agency: "WME",
    });
    pushQueryResult([
      {
        id: PICKUP_ID,
        editionId: EDITION_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        vendorId: VENDOR_ID,
        pickupDt: new Date("2026-08-15T17:30:00Z"),
        status: "scheduled",
      },
    ]);
    pushQueryResult([
      { id: VENDOR_ID, name: "LuxCars", service: "Car service" },
    ]);

    const out = await getPickupsInWindow(
      EDITION_ID,
      new Date("2026-08-15T17:00:00Z"),
      new Date("2026-08-15T19:00:00Z")
    );
    expect(out).toHaveLength(1);
    expect(out[0].vendor?.name).toBe("LuxCars");
    expect(out[0].person?.name).toBe("Hiroko");
  });

  it("returns [] for empty window", async () => {
    pushQueryResult([]);
    const out = await getPickupsInWindow(
      EDITION_ID,
      new Date(),
      new Date(Date.now() + 60_000)
    );
    expect(out).toEqual([]);
  });

  it("handles pickups with no vendor", async () => {
    peopleResolver.set(`crew:${ARTIST_ID}`, {
      kind: "crew",
      id: ARTIST_ID,
      name: "Mira",
      agency: null,
    });
    pushQueryResult([
      {
        id: PICKUP_ID,
        editionId: EDITION_ID,
        personKind: "crew",
        personId: ARTIST_ID,
        vendorId: null,
        pickupDt: new Date("2026-08-15T17:30:00Z"),
      },
    ]);
    // No vendor query should fire when vendorIds list is empty;
    // queue gets one fewer entry. The aggregator skips vendor lookup.
    const out = await getPickupsInWindow(
      EDITION_ID,
      new Date("2026-08-15T17:00:00Z"),
      new Date("2026-08-15T19:00:00Z")
    );
    expect(out[0].vendor).toBeNull();
  });
});

// ── getNowAndNext ───────────────────────────────────────────────────────

describe("getNowAndNext", () => {
  it("returns null/null when no slots on this stage", async () => {
    pushQueryResult([]);
    const out = await getNowAndNext(STAGE_ID);
    expect(out).toEqual({ now: null, next: null });
  });

  it("picks live set as 'now' regardless of slot window", async () => {
    pushQueryResult([
      {
        id: SLOT_ID,
        stageId: STAGE_ID,
        day: "saturday",
        startTime: "22:00",
        endTime: "23:30",
      },
      {
        id: "slot2",
        stageId: STAGE_ID,
        day: "saturday",
        startTime: "23:30",
        endTime: "01:00",
      },
    ]);
    pushQueryResult([
      {
        set: { id: SET_ID, status: "live", slotId: SLOT_ID, artistId: ARTIST_ID },
        artist: { id: ARTIST_ID, name: "Hiroko" },
      },
      {
        set: {
          id: "set2",
          status: "confirmed",
          slotId: "slot2",
          artistId: "artist2",
        },
        artist: { id: "artist2", name: "Alex" },
      },
    ]);
    const out = await getNowAndNext(STAGE_ID, new Date("2026-08-15T22:30:00"));
    expect(out.now?.setId).toBe(SET_ID);
    expect(out.next?.setId).toBe("set2");
  });

  it("falls back to confirmed-with-window match when no live set", async () => {
    pushQueryResult([
      {
        id: SLOT_ID,
        stageId: STAGE_ID,
        day: "saturday",
        startTime: "22:00",
        endTime: "23:30",
      },
    ]);
    pushQueryResult([
      {
        set: {
          id: SET_ID,
          status: "confirmed",
          slotId: SLOT_ID,
          artistId: ARTIST_ID,
        },
        artist: { id: ARTIST_ID, name: "Hiroko" },
      },
    ]);
    const at = new Date();
    at.setHours(22, 30, 0, 0);
    const out = await getNowAndNext(STAGE_ID, at);
    expect(out.now?.setId).toBe(SET_ID);
  });
});

// ── getCurrentlyActiveBookings ──────────────────────────────────────────

describe("getCurrentlyActiveBookings", () => {
  it("scopes to edition via room blocks; resolves hotel + person", async () => {
    peopleResolver.set(`artist:${ARTIST_ID}`, {
      kind: "artist",
      id: ARTIST_ID,
      name: "Hiroko",
      agency: "WME",
    });
    pushQueryResult([{ id: BLOCK_ID }]);
    pushQueryResult([
      {
        id: BOOKING_ID,
        roomBlockId: BLOCK_ID,
        hotelId: HOTEL_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        checkin: "2026-08-13",
        checkout: "2026-08-16",
        status: "checked_in",
      },
    ]);
    pushQueryResult([{ id: HOTEL_ID, name: "Byblos Sur Mer" }]);

    const out = await getCurrentlyActiveBookings(EDITION_ID, "2026-08-15");
    expect(out).toHaveLength(1);
    expect(out[0].hotel.name).toBe("Byblos Sur Mer");
    expect(out[0].person?.name).toBe("Hiroko");
  });

  it("includes walk-up bookings (no roomBlockId)", async () => {
    peopleResolver.set(`crew:${ARTIST_ID}`, {
      kind: "crew",
      id: ARTIST_ID,
      name: "Mira",
      agency: null,
    });
    pushQueryResult([{ id: BLOCK_ID }]);
    pushQueryResult([
      {
        id: BOOKING_ID,
        roomBlockId: null,
        hotelId: HOTEL_ID,
        personKind: "crew",
        personId: ARTIST_ID,
        checkin: "2026-08-14",
        checkout: "2026-08-16",
        status: "booked",
      },
    ]);
    pushQueryResult([{ id: HOTEL_ID, name: "Aqua Resort" }]);
    const out = await getCurrentlyActiveBookings(EDITION_ID, "2026-08-15");
    expect(out).toHaveLength(1);
    expect(out[0].booking.roomBlockId).toBeNull();
  });

  it("filters out bookings whose block belongs to a different edition", async () => {
    pushQueryResult([{ id: BLOCK_ID }]); // edition's blocks
    pushQueryResult([
      {
        id: BOOKING_ID,
        roomBlockId: "other-block-id",
        hotelId: HOTEL_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        checkin: "2026-08-14",
        checkout: "2026-08-16",
      },
    ]);
    const out = await getCurrentlyActiveBookings(EDITION_ID, "2026-08-15");
    expect(out).toEqual([]);
  });
});

// ── getArtistRoadsheet ──────────────────────────────────────────────────

describe("getArtistRoadsheet", () => {
  it("returns null when artist missing", async () => {
    pushQueryResult([]);
    const out = await getArtistRoadsheet(ARTIST_ID);
    expect(out).toBeNull();
  });

  it("aggregates set, flights, hotel, pickups, riders, contract, payments", async () => {
    // 1. artist
    pushQueryResult([
      { id: ARTIST_ID, editionId: EDITION_ID, name: "Hiroko" },
    ]);
    // 2. sets+slots+stages
    pushQueryResult([
      {
        set: { id: SET_ID, artistId: ARTIST_ID, slotId: SLOT_ID },
        slot: { id: SLOT_ID, day: "saturday", startTime: "22:00" },
        stage: { id: STAGE_ID, name: "Main" },
      },
    ]);
    // 3. flights
    pushQueryResult([
      {
        id: FLIGHT_ID,
        direction: "inbound",
        personKind: "artist",
        personId: ARTIST_ID,
        scheduledDt: new Date("2026-08-15T10:00:00Z"),
      },
      {
        id: "flight-out",
        direction: "outbound",
        personKind: "artist",
        personId: ARTIST_ID,
        scheduledDt: new Date("2026-08-17T08:00:00Z"),
      },
    ]);
    // 4. hotel booking (latest)
    pushQueryResult([
      {
        id: BOOKING_ID,
        hotelId: HOTEL_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        checkin: "2026-08-13",
        checkout: "2026-08-17",
      },
    ]);
    // 5. hotel name
    pushQueryResult([{ name: "BSM" }]);
    // 6. pickups
    pushQueryResult([
      {
        id: PICKUP_ID,
        personKind: "artist",
        personId: ARTIST_ID,
        pickupDt: new Date("2026-08-15T11:00:00Z"),
      },
    ]);
    // 7. riders
    pushQueryResult([
      { id: "r1", artistId: ARTIST_ID, kind: "hospitality" },
    ]);
    // 8. contracts (top 1)
    pushQueryResult([
      { id: CONTRACT_ID, artistId: ARTIST_ID, status: "signed" },
    ]);
    // 9. payments
    pushQueryResult([
      {
        id: "pay-pending",
        artistId: ARTIST_ID,
        status: "pending",
        amountCents: 100000,
      },
      {
        id: "pay-paid",
        artistId: ARTIST_ID,
        status: "paid",
        amountCents: 50000,
      },
    ]);

    const out = await getArtistRoadsheet(ARTIST_ID);
    expect(out).not.toBeNull();
    expect(out!.artist.name).toBe("Hiroko");
    expect(out!.set?.stage.name).toBe("Main");
    expect(out!.inboundFlight?.id).toBe(FLIGHT_ID);
    expect(out!.outboundFlight?.id).toBe("flight-out");
    expect(out!.hotel?.hotelName).toBe("BSM");
    expect(out!.pickups).toHaveLength(1);
    expect(out!.riders).toHaveLength(1);
    expect(out!.contract?.status).toBe("signed");
    // Outstanding only by default - 'paid' filtered out.
    expect(out!.payments).toHaveLength(1);
    expect(out!.payments[0].id).toBe("pay-pending");
  });

  it("filters flights to a specific day when day passed", async () => {
    pushQueryResult([{ id: ARTIST_ID, name: "X" }]); // artist
    pushQueryResult([]); // sets
    pushQueryResult([
      {
        id: "in-today",
        direction: "inbound",
        personKind: "artist",
        personId: ARTIST_ID,
        scheduledDt: new Date("2026-08-15T10:00:00Z"),
      },
      {
        id: "in-yesterday",
        direction: "inbound",
        personKind: "artist",
        personId: ARTIST_ID,
        scheduledDt: new Date("2026-08-14T10:00:00Z"),
      },
    ]);
    pushQueryResult([]); // hotel booking active
    pushQueryResult([]); // pickups
    pushQueryResult([]); // riders
    pushQueryResult([]); // contracts
    pushQueryResult([]); // payments
    const out = await getArtistRoadsheet(ARTIST_ID, "2026-08-15");
    expect(out!.inboundFlight?.id).toBe("in-today");
  });
});

// ── getOpenIssues ───────────────────────────────────────────────────────

describe("getOpenIssues", () => {
  it("returns [] when nothing matches any rule", async () => {
    // 10 queries fire (see source). Push empties for all of them.
    for (let i = 0; i < 10; i++) pushQueryResult([]);
    const out = await getOpenIssues(EDITION_ID, "all");
    expect(out).toEqual([]);
  });

  it("flags confirmed set with no contract uploaded as high", async () => {
    // 1. confirmedSets (with slot)
    pushQueryResult([
      {
        set: { id: SET_ID, artistId: ARTIST_ID, status: "confirmed" },
        slot: {
          id: SLOT_ID,
          editionId: EDITION_ID,
          day: "saturday",
          startTime: "22:00",
        },
      },
    ]);
    // 2. contracts - none for this artist
    pushQueryResult([]);
    // 3. riders - one received so rider rule doesn't fire
    pushQueryResult([
      {
        id: "r1",
        artistId: ARTIST_ID,
        fileUrl: "https://x",
        confirmed: true,
      },
    ]);
    // 4. inbound flights in scope - none
    pushQueryResult([]);
    // 5. all pickups for edition - none
    pushQueryResult([]);
    // 6. all payments - one paid for this artist so payment rule doesn't fire
    pushQueryResult([
      {
        id: "p1",
        editionId: EDITION_ID,
        artistId: ARTIST_ID,
        status: "paid",
      },
    ]);
    // 7. bookings active today - none
    pushQueryResult([]);
    // 8. guestlist pending - none
    pushQueryResult([]);
    // 9. completed pickups recent - none
    pushQueryResult([]);
    // 10. bookings booked - none
    pushQueryResult([]);
    // edition artists query (after Promise.all)
    pushQueryResult([{ id: ARTIST_ID }]);

    const out = await getOpenIssues(EDITION_ID, "all");
    const noContract = out.find((i) => i.rule === "confirmed-set-no-contract");
    expect(noContract).toBeDefined();
    expect(noContract?.severity).toBe("high");
    expect(noContract?.entityId).toBe(SET_ID);
  });

  it("flags inbound flight with no linked pickup", async () => {
    // 1-3 empty
    pushQueryResult([]);
    pushQueryResult([]);
    pushQueryResult([]);
    // 4. inbound flight in scope
    pushQueryResult([
      {
        id: FLIGHT_ID,
        flightNumber: "ME202",
        scheduledDt: new Date("2026-08-15T10:00:00Z"),
      },
    ]);
    // 5. pickups - none link to this flight
    pushQueryResult([]);
    // 6-10 empty
    pushQueryResult([]);
    pushQueryResult([]);
    pushQueryResult([]);
    pushQueryResult([]);
    pushQueryResult([]);
    pushQueryResult([]); // edition artists

    const out = await getOpenIssues(EDITION_ID, "all");
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe("inbound-flight-no-pickup");
    expect(out[0].severity).toBe("high");
  });

  it("sorts high before medium before low", async () => {
    // confirmedSets - one for the medium rider rule (artist NOT in
    // edition would skip it; we set up the edition-scoped artist below)
    // Actually we want both a high (no-contract) and a low (guest no-invite).
    pushQueryResult([
      {
        set: { id: SET_ID, artistId: ARTIST_ID, status: "confirmed" },
        slot: {
          id: SLOT_ID,
          editionId: EDITION_ID,
          day: "saturday",
          startTime: "22:00",
        },
      },
    ]);
    pushQueryResult([]); // contracts - none → triggers high
    pushQueryResult([
      // rider received so rider rule doesn't fire
      { id: "r1", artistId: ARTIST_ID, fileUrl: "x", confirmed: true },
    ]);
    pushQueryResult([]); // inbound in scope
    pushQueryResult([]); // pickups
    pushQueryResult([
      { id: "p1", editionId: EDITION_ID, artistId: ARTIST_ID, status: "paid" },
    ]); // payments - paid
    pushQueryResult([]); // bookings active
    pushQueryResult([
      // guestlist pending - triggers low
      { id: GUEST_ID, name: "Yuki", inviteSent: false, day: "saturday" },
    ]);
    pushQueryResult([]); // completed pickups
    pushQueryResult([]); // booked
    pushQueryResult([{ id: ARTIST_ID }]); // edition artists

    const out = await getOpenIssues(EDITION_ID, "all");
    const sevs = out.map((i) => i.severity);
    // 'high' must come before 'low'
    const hi = sevs.indexOf("high");
    const lo = sevs.indexOf("low");
    expect(hi).toBeGreaterThanOrEqual(0);
    expect(lo).toBeGreaterThan(hi);
  });
});
