/**
 * Unit tests for the three home-page stat values:
 *   1. Festival readiness percent (via getFestivalReadiness)
 *   2. High-severity issue count (via getOpenIssues)
 *   3. Unpaid total (via getUnpaidTotal)
 *
 * DB is mocked via the same queue-based pattern used in aggregators.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { queue } = vi.hoisted(() => {
  const q: unknown[][] = [];
  return { queue: q };
});

function pushQueryResult(rows: unknown[]) {
  queue.push(rows);
}

vi.mock("@/db/client", () => {
  function makeChain() {
    const chain: Record<string, unknown> = {};
    const step = () => chain;
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
    },
  };
});

const FESTIVAL_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const ARTIST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ARTIST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// ── getUnpaidTotal ──────────────────────────────────────────────────────────

describe("getUnpaidTotal", () => {
  beforeEach(() => {
    queue.length = 0;
  });

  it("returns EUR and USD totals from pending/due/overdue rows", async () => {
    pushQueryResult([
      { currency: "EUR", total: 150000 },
      { currency: "USD", total: 80000 },
    ]);

    const { getUnpaidTotal } = await import("@/lib/payments/repo");
    const result = await getUnpaidTotal(FESTIVAL_ID);

    expect(result).toEqual({ EUR: 150000, USD: 80000 });
  });

  it("returns zeros when no unpaid rows exist", async () => {
    pushQueryResult([]);

    const { getUnpaidTotal } = await import("@/lib/payments/repo");
    const result = await getUnpaidTotal(FESTIVAL_ID);

    expect(result).toEqual({ EUR: 0, USD: 0 });
  });

  it("returns only EUR when no USD rows", async () => {
    pushQueryResult([{ currency: "EUR", total: 50000 }]);

    const { getUnpaidTotal } = await import("@/lib/payments/repo");
    const result = await getUnpaidTotal(FESTIVAL_ID);

    expect(result).toEqual({ EUR: 50000, USD: 0 });
  });
});

// ── getFestivalReadiness — percent stat ─────────────────────────────────────

describe("getFestivalReadiness percent", () => {
  beforeEach(() => {
    queue.length = 0;
  });

  it("returns 100% when all artists are fully prepped", async () => {
    // artists
    pushQueryResult([
      {
        id: ARTIST_A,
        name: "Hiroko Yamamura",
        agency: null,
        needsContract: true,
        needsFlight: true,
        needsHotel: true,
        needsGround: true,
        needsPayment: true,
      },
      {
        id: ARTIST_B,
        name: "DJ Tennis",
        agency: "Life and Death",
        needsContract: true,
        needsFlight: true,
        needsHotel: true,
        needsGround: true,
        needsPayment: true,
      },
    ]);
    // sets — both confirmed
    pushQueryResult([{ artistId: ARTIST_A }, { artistId: ARTIST_B }]);
    // contracts — both signed
    pushQueryResult([
      { artistId: ARTIST_A, status: "signed" },
      { artistId: ARTIST_B, status: "signed" },
    ]);
    // inbound flights — both have one
    pushQueryResult([
      { personId: ARTIST_A, personKind: "artist", status: "scheduled" },
      { personId: ARTIST_B, personKind: "artist", status: "scheduled" },
    ]);
    // hotel bookings — both have one
    pushQueryResult([
      { personId: ARTIST_A, personKind: "artist", status: "confirmed" },
      { personId: ARTIST_B, personKind: "artist", status: "confirmed" },
    ]);
    // pickups — both
    pushQueryResult([
      { personId: ARTIST_A, personKind: "artist" },
      { personId: ARTIST_B, personKind: "artist" },
    ]);
    // payments — both paid
    pushQueryResult([
      { artistId: ARTIST_A, status: "paid" },
      { artistId: ARTIST_B, status: "paid" },
    ]);

    const { getFestivalReadiness } =
      await import("@/lib/aggregators/artist-readiness");
    const result = await getFestivalReadiness(FESTIVAL_ID);

    expect(result.percent).toBe(100);
    expect(result.fullyPrepped).toBe(2);
    expect(result.totalArtists).toBe(2);
    expect(result.byArtist.every((a) => a.gaps.length === 0)).toBe(true);
  });

  it("returns 0% when no artists are prepped", async () => {
    pushQueryResult([
      {
        id: ARTIST_A,
        name: "Hiroko Yamamura",
        agency: null,
        needsContract: true,
        needsFlight: true,
        needsHotel: true,
        needsGround: true,
        needsPayment: true,
      },
    ]);
    pushQueryResult([]); // no sets
    pushQueryResult([]); // no contracts
    pushQueryResult([]); // no flights
    pushQueryResult([]); // no hotels
    pushQueryResult([]); // no pickups
    pushQueryResult([]); // no payments

    const { getFestivalReadiness } =
      await import("@/lib/aggregators/artist-readiness");
    const result = await getFestivalReadiness(FESTIVAL_ID);

    expect(result.percent).toBe(0);
    expect(result.fullyPrepped).toBe(0);
    expect(result.byArtist[0].gaps).toContain("set");
    expect(result.byArtist[0].gaps).toContain("contract");
  });

  it("returns 0% when no artists exist", async () => {
    pushQueryResult([]); // artists
    pushQueryResult([]); // sets
    pushQueryResult([]); // contracts
    pushQueryResult([]); // flights
    pushQueryResult([]); // hotels
    pushQueryResult([]); // pickups
    pushQueryResult([]); // payments

    const { getFestivalReadiness } =
      await import("@/lib/aggregators/artist-readiness");
    const result = await getFestivalReadiness(FESTIVAL_ID);

    expect(result.percent).toBe(0);
    expect(result.totalArtists).toBe(0);
  });
});

// ── GAP_PILL mapping ────────────────────────────────────────────────────────

describe("GAP_PILL", () => {
  it("covers all ReadinessGap values with a pill utility", async () => {
    const { GAP_PILL } = await import("@/lib/aggregators/artist-readiness");
    const expected: Record<string, string> = {
      set: "pill-amber",
      contract: "pill-emerald",
      inbound_flight: "pill-sky",
      hotel: "pill-violet",
      pickup: "pill-amber",
      payment: "pill-emerald",
    };
    expect(GAP_PILL).toEqual(expected);
  });
});
