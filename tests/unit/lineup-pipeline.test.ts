/**
 * getLineupPipeline repo unit test. Same lazy-queue mock pattern as
 * the aggregators tests -- the chain returns whatever the test pushed
 * onto the queue, in order.
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
      batch: vi.fn(),
    },
    schema: {},
  };
});

import { getLineupPipeline } from "@/lib/lineup/repo";

const EDITION = "11111111-1111-4111-8111-111111111111";
const ARTIST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ARTIST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STAGE_MAIN = "33333333-3333-4333-8333-333333333333";
const STAGE_ALT = "44444444-4444-4444-8444-444444444444";
const SLOT_1 = "55555555-5555-4555-8555-555555555555";
const SLOT_2 = "66666666-6666-4666-8666-666666666666";
const SET_1 = "77777777-7777-4777-8777-777777777777";
const SET_2 = "88888888-8888-4888-8888-888888888888";

beforeEach(() => {
  queue.length = 0;
});

describe("getLineupPipeline", () => {
  it("returns empty array when no sets exist", async () => {
    pushQueryResult([]);
    const out = await getLineupPipeline(EDITION);
    expect(out).toEqual([]);
  });

  it("joins set + slot + stage + artist into one card per set", async () => {
    pushQueryResult([
      {
        set: {
          id: SET_1,
          slotId: SLOT_1,
          artistId: ARTIST_A,
          status: "confirmed",
          feeAmountCents: 450_000,
          feeCurrency: "EUR",
        },
        artist: {
          id: ARTIST_A,
          name: "Charlotte de Witte",
          slug: "charlotte-de-witte",
          agency: "WME",
          color: "#34D399",
        },
        slot: {
          id: SLOT_1,
          date: "2026-08-15",
          startTime: "22:00",
          endTime: "00:00",
          stageId: STAGE_MAIN,
        },
      },
      {
        set: {
          id: SET_2,
          slotId: SLOT_2,
          artistId: ARTIST_B,
          status: "option",
          feeAmountCents: null,
          feeCurrency: null,
        },
        artist: {
          id: ARTIST_B,
          name: "Boris Brejcha",
          slug: "boris-brejcha",
          agency: null,
          color: null,
        },
        slot: {
          id: SLOT_2,
          date: "2026-08-16",
          startTime: "20:00",
          endTime: "22:00",
          stageId: STAGE_ALT,
        },
      },
    ]);
    // listStages
    pushQueryResult([
      { id: STAGE_MAIN, name: "Main Stage", color: "#E5B85A" },
      { id: STAGE_ALT, name: "Alternative", color: "#7C9EFF" },
    ]);

    const out = await getLineupPipeline(EDITION);
    expect(out).toHaveLength(2);

    expect(out[0]!.set.id).toBe(SET_1);
    expect(out[0]!.artist.name).toBe("Charlotte de Witte");
    expect(out[0]!.slot?.date).toBe("2026-08-15");
    expect(out[0]!.stage?.name).toBe("Main Stage");
    expect(out[0]!.stage?.color).toBe("#E5B85A");

    expect(out[1]!.set.id).toBe(SET_2);
    expect(out[1]!.artist.name).toBe("Boris Brejcha");
    expect(out[1]!.stage?.name).toBe("Alternative");
  });

  it("handles stages that no longer exist (set survives, stage is null)", async () => {
    pushQueryResult([
      {
        set: {
          id: SET_1,
          slotId: SLOT_1,
          artistId: ARTIST_A,
          status: "confirmed",
          feeAmountCents: null,
          feeCurrency: null,
        },
        artist: {
          id: ARTIST_A,
          name: "Anouk",
          slug: "anouk",
          agency: null,
          color: null,
        },
        slot: {
          id: SLOT_1,
          date: "2026-08-15",
          startTime: "22:00",
          endTime: "00:00",
          stageId: "deleted-stage-id",
        },
      },
    ]);
    pushQueryResult([]); // stages list returns nothing (or only different ids)

    const out = await getLineupPipeline(EDITION);
    expect(out).toHaveLength(1);
    expect(out[0]!.stage).toBeNull();
    expect(out[0]!.slot?.id).toBe(SLOT_1);
  });
});
