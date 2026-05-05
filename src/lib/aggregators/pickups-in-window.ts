import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { groundTransportPickups, vendors } from "@/db/schema";
import { resolvePeople, type Person } from "@/lib/people";

export interface PickupInWindow {
  pickup: typeof groundTransportPickups.$inferSelect;
  person: Person | null;
  /** Vendor + driver + phone denormalised so each row is self-contained
   *  for the festival-day "Pickups in next 2h" panel. */
  vendor: { id: string; name: string; service: string } | null;
}

/**
 * Pickups scheduled to start in `[startDt, endDt)`. Vendor + person are
 * resolved + denormalised so the row needs no further lookups to render.
 *
 * Spec: docs/OPERATIONS-FLOW.md §4 ("Pickups in next 2h" panel).
 */
export async function getPickupsInWindow(
  editionId: string,
  startDt: Date,
  endDt: Date
): Promise<PickupInWindow[]> {
  const pickupRows = await db
    .select()
    .from(groundTransportPickups)
    .where(
      and(
        eq(groundTransportPickups.editionId, editionId),
        gte(groundTransportPickups.pickupDt, startDt),
        lt(groundTransportPickups.pickupDt, endDt)
      )
    )
    .orderBy(asc(groundTransportPickups.pickupDt));

  if (pickupRows.length === 0) return [];

  const vendorIds = [
    ...new Set(
      pickupRows
        .map((p) => p.vendorId)
        .filter((id): id is string => id !== null)
    ),
  ];
  const vendorRows =
    vendorIds.length > 0 ? await db.select().from(vendors) : [];
  const vendorsById = new Map(
    vendorRows.map((v) => [v.id, { id: v.id, name: v.name, service: v.service }])
  );

  const people = await resolvePeople(
    pickupRows.map((p) => ({ kind: p.personKind, id: p.personId }))
  );

  return pickupRows.map((pickup) => ({
    pickup,
    person: people.get(`${pickup.personKind}:${pickup.personId}`) ?? null,
    vendor: pickup.vendorId ? vendorsById.get(pickup.vendorId) ?? null : null,
  }));
}
