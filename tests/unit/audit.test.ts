import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture what recordTransition passes into the Drizzle builder chain.
// Hoisted so vi.mock factories (also hoisted) can reach them.
const { capturedValues, valuesSpy, insertSpy, selectRows, selectSpy } =
  vi.hoisted(() => {
    const captured: unknown[] = [];
    const values = vi.fn((v: unknown) => {
      captured.push(v);
      return { returning: () => ({ __returning: true, values: v }) };
    });
    const insert = vi.fn((_table: unknown) => ({ values }));

    const rows: unknown[] = [];
    const selectChain = {
      from: vi.fn(() => selectChain),
      where: vi.fn(() => selectChain),
      orderBy: vi.fn(() => selectChain),
      limit: vi.fn(() => Promise.resolve(rows)),
    };
    const select = vi.fn(() => selectChain);

    return {
      capturedValues: captured,
      valuesSpy: values,
      insertSpy: insert,
      selectRows: rows,
      selectSpy: select,
    };
  });

vi.mock("@/db/client", () => ({
  db: {
    insert: insertSpy,
    select: selectSpy,
  },
  schema: {},
}));

vi.mock("@/db/schema", () => ({
  auditEvents: { __table: "audit_events" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ __eq: val })),
  and: vi.fn((...args: unknown[]) => ({ __and: args })),
  desc: vi.fn((col: unknown) => ({ __desc: col })),
}));

import { recordTransition, getAuditHistory } from "@/lib/audit";
import { db } from "@/db/client";

beforeEach(() => {
  capturedValues.length = 0;
  selectRows.length = 0;
  insertSpy.mockClear();
  valuesSpy.mockClear();
  selectSpy.mockClear();
});

const WS = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("recordTransition", () => {
  it("returns a Drizzle insert builder targeting auditEvents", () => {
    const builder = recordTransition(db, {
      workspaceId: WS,
      actorId: "u1",
      entity: { type: "flight", id: "f1" },
      diff: { field: "status", from: "scheduled", to: "landed" },
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toEqual({ __table: "audit_events" });
    expect(builder).toEqual({ __returning: true, values: expect.anything() });
  });

  it("captures workspaceId + actor + entity + diff in the row payload", () => {
    recordTransition(db, {
      workspaceId: WS,
      actorId: "u1",
      entity: { type: "pickup", id: "p1" },
      diff: { field: "status", from: "scheduled", to: "in_transit" },
    });
    expect(capturedValues).toHaveLength(1);
    expect(capturedValues[0]).toEqual({
      workspaceId: WS,
      actorId: "u1",
      action: "transition",
      entityType: "pickup",
      entityId: "p1",
      diff: { field: "status", from: "scheduled", to: "in_transit" },
    });
  });

  it("includes optional meta in the diff JSON when supplied", () => {
    recordTransition(db, {
      workspaceId: WS,
      actorId: "u2",
      entity: { type: "set", id: "s1" },
      diff: {
        field: "status",
        from: "confirmed",
        to: "live",
        meta: { capturedAt: "2026-08-15T22:00:00Z" },
      },
    });
    expect(capturedValues[0]).toMatchObject({
      diff: {
        field: "status",
        from: "confirmed",
        to: "live",
        meta: { capturedAt: "2026-08-15T22:00:00Z" },
      },
    });
  });

  it("omits the meta key entirely when not supplied", () => {
    recordTransition(db, {
      workspaceId: WS,
      actorId: "u1",
      entity: { type: "flight", id: "f1" },
      diff: { field: "status", from: "scheduled", to: "boarded" },
    });
    const row = capturedValues[0] as { diff: Record<string, unknown> };
    expect(row.diff).not.toHaveProperty("meta");
    expect(Object.keys(row.diff).sort()).toEqual(["field", "from", "to"]);
  });

  it("works for every supported entity type", () => {
    const types = [
      "artist",
      "crew",
      "flight",
      "pickup",
      "set",
      "contract",
      "payment",
      "hotel_booking",
    ] as const;
    for (const type of types) {
      capturedValues.length = 0;
      recordTransition(db, {
        workspaceId: WS,
        actorId: "u1",
        entity: { type, id: "x" },
        diff: { field: "status", from: "a", to: "b" },
      });
      expect((capturedValues[0] as { entityType: string }).entityType).toBe(
        type,
      );
    }
  });
});

describe("getAuditHistory", () => {
  it("calls db.select and returns resolved rows", async () => {
    const fakeEvent = {
      id: "e1",
      actorId: "u1",
      action: "transition",
      entityType: "flight",
      entityId: "f1",
      diff: { field: "status", from: "scheduled", to: "landed" },
      createdAt: new Date("2026-08-15T22:00:00Z"),
    };
    selectRows.push(fakeEvent);

    const result = await getAuditHistory("flight", "f1");
    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(fakeEvent);
  });

  it("returns empty array when no events exist", async () => {
    const result = await getAuditHistory("pickup", "p-none");
    expect(result).toEqual([]);
  });

  it("accepts a custom limit", async () => {
    const result = await getAuditHistory("contract", "c1", 10);
    expect(result).toEqual([]);
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });
});
