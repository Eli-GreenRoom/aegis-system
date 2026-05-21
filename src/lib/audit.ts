/**
 * Audit log of state transitions. Disputes ("the driver said they
 * dispatched at 5pm, the dashboard says 6pm") need this paper trail.
 *
 * Spec: docs/OPERATIONS-FLOW.md -6.
 *
 * Atomicity: under the neon-http driver Drizzle exposes `db.batch([...])`
 * - a single HTTP request that Neon wraps server-side in a transaction.
 * Callers compose `db.batch([update, recordTransition(...)])` so the
 * state change and the audit row commit together or not at all. The
 * shape mirrors what the local-pool `db.transaction(...)` API would
 * expose, so swapping drivers later is a one-line change.
 */

import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type AuditEntityType =
  | "artist"
  | "crew"
  | "flight"
  | "pickup"
  | "set"
  | "contract"
  | "payment"
  | "invoice"
  | "hotel_booking";

/** Loose `Db` shape so this module is import-safe in tests with mocked clients. */
type Db = typeof db;

export interface AuditDiff {
  /** Column name being changed - almost always 'status' on transitions. */
  field: string;
  from: unknown;
  to: unknown;
  /** Free-form annotations (e.g. captured click time on a festival-day tap). */
  meta?: Record<string, unknown>;
}

/**
 * Build the audit `insert` statement for a single transition. Returns the
 * unawaited Drizzle builder so the caller can pass it to `db.batch([...])`
 * alongside the actual state update - the two then commit atomically.
 *
 * Callers typically:
 *   const updateQ = db.update(flights).set({ status: 'landed' })
 *     .where(eq(flights.id, id)).returning();
 *   const auditQ  = recordTransition(client, {
 *     actorId, entity: { type: 'flight', id }, diff: { field: 'status', from, to }
 *   });
 *   const [[updated], _] = await client.batch([updateQ, auditQ]);
 */
export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: unknown;
  createdAt: Date;
}

export async function getAuditHistory(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50,
): Promise<AuditEvent[]> {
  return db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.entityType, entityType),
        eq(auditEvents.entityId, entityId),
      ),
    )
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export function recordTransition(
  client: Db,
  args: {
    actorId: string;
    entity: { type: AuditEntityType; id: string };
    diff: AuditDiff;
  },
) {
  const { actorId, entity, diff } = args;
  return client
    .insert(auditEvents)
    .values({
      actorId,
      action: "transition",
      entityType: entity.type,
      entityId: entity.id,
      diff: {
        field: diff.field,
        from: diff.from,
        to: diff.to,
        ...(diff.meta ? { meta: diff.meta } : {}),
      },
    })
    .returning();
}
