import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture what recordTransition passes into the Drizzle builder chain.
// Hoisted so vi.mock factories (also hoisted) can reach them.
const { capturedValues, valuesSpy, insertSpy } = vi.hoisted(() => {
  const captured: unknown[] = [];
  const values = vi.fn((v: unknown) => {
    captured.push(v);
    return { returning: () => ({ __returning: true, values: v }) };
  });
  const insert = vi.fn((_table: unknown) => ({ values }));
  return { capturedValues: captured, valuesSpy: values, insertSpy: insert };
});

vi.mock("@/db/client", () => ({
  db: {
    insert: insertSpy,
  },
  schema: {},
}));

vi.mock("@/db/schema", () => ({
  auditEvents: { __table: "audit_events" },
}));

import { recordTransition } from "@/lib/audit";
import { db } from "@/db/client";

beforeEach(() => {
  capturedValues.length = 0;
  insertSpy.mockClear();
  valuesSpy.mockClear();
});

describe("recordTransition", () => {
  it("returns a Drizzle insert builder targeting auditEvents", () => {
    const builder = recordTransition(db, {
      actorId: "u1",
      entity: { type: "flight", id: "f1" },
      diff: { field: "status", from: "scheduled", to: "landed" },
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toEqual({ __table: "audit_events" });
    expect(builder).toEqual({ __returning: true, values: expect.anything() });
  });

  it("captures actor + entity + diff in the row payload", () => {
    recordTransition(db, {
      actorId: "u1",
      entity: { type: "pickup", id: "p1" },
      diff: { field: "status", from: "scheduled", to: "in_transit" },
    });
    expect(capturedValues).toHaveLength(1);
    expect(capturedValues[0]).toEqual({
      actorId: "u1",
      action: "transition",
      entityType: "pickup",
      entityId: "p1",
      diff: { field: "status", from: "scheduled", to: "in_transit" },
    });
  });

  it("includes optional meta in the diff JSON when supplied", () => {
    recordTransition(db, {
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
        actorId: "u1",
        entity: { type, id: "x" },
        diff: { field: "status", from: "a", to: "b" },
      });
      expect((capturedValues[0] as { entityType: string }).entityType).toBe(type);
    }
  });
});
