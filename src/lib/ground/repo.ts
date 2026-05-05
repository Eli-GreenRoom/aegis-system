import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { vendors, groundTransportPickups } from "@/db/schema";
import type {
  PersonKind,
  PickupDbValues,
  PickupStatus,
  Route,
  VendorDbValues,
} from "./schema";

export type Vendor = typeof vendors.$inferSelect;
export type Pickup = typeof groundTransportPickups.$inferSelect;

// ── Vendors ─────────────────────────────────────────────────────────────

export async function listVendors(): Promise<Vendor[]> {
  return db.select().from(vendors).orderBy(asc(vendors.name));
}

export async function getVendor(id: string): Promise<Vendor | null> {
  const [row] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, id))
    .limit(1);
  return row ?? null;
}

export async function createVendor(input: VendorDbValues): Promise<Vendor> {
  const [row] = await db.insert(vendors).values(input).returning();
  return row;
}

export async function updateVendor(
  id: string,
  input: Partial<VendorDbValues>
): Promise<Vendor | null> {
  if (Object.keys(input).length === 0) return getVendor(id);
  const [row] = await db
    .update(vendors)
    .set(input)
    .where(eq(vendors.id, id))
    .returning();
  return row ?? null;
}

export async function deleteVendor(id: string): Promise<Vendor | null> {
  const [row] = await db.delete(vendors).where(eq(vendors.id, id)).returning();
  return row ?? null;
}

// ── Pickups ─────────────────────────────────────────────────────────────

export interface ListPickupsParams {
  editionId: string;
  search?: string;
  status?: PickupStatus;
  routeFrom?: Route;
  routeTo?: Route;
  personKind?: PersonKind;
  personId?: string;
  vendorId?: string;
}

export async function listPickups({
  editionId,
  search,
  status,
  routeFrom,
  routeTo,
  personKind,
  personId,
  vendorId,
}: ListPickupsParams): Promise<Pickup[]> {
  const filters = [eq(groundTransportPickups.editionId, editionId)];
  if (status) filters.push(eq(groundTransportPickups.status, status));
  if (routeFrom) filters.push(eq(groundTransportPickups.routeFrom, routeFrom));
  if (routeTo) filters.push(eq(groundTransportPickups.routeTo, routeTo));
  if (personKind)
    filters.push(eq(groundTransportPickups.personKind, personKind));
  if (personId) filters.push(eq(groundTransportPickups.personId, personId));
  if (vendorId) filters.push(eq(groundTransportPickups.vendorId, vendorId));

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(groundTransportPickups.driverName, q),
      ilike(groundTransportPickups.driverPhone, q),
      ilike(groundTransportPickups.vehicleType, q),
      ilike(groundTransportPickups.routeFromDetail, q),
      ilike(groundTransportPickups.routeToDetail, q)
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(groundTransportPickups)
    .where(and(...filters))
    .orderBy(asc(groundTransportPickups.pickupDt));
}

export async function getPickup(id: string): Promise<Pickup | null> {
  const [row] = await db
    .select()
    .from(groundTransportPickups)
    .where(eq(groundTransportPickups.id, id))
    .limit(1);
  return row ?? null;
}

export async function createPickup(
  editionId: string,
  input: PickupDbValues
): Promise<Pickup> {
  const [row] = await db
    .insert(groundTransportPickups)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updatePickup(
  id: string,
  input: Partial<PickupDbValues>
): Promise<Pickup | null> {
  if (Object.keys(input).length === 0) return getPickup(id);
  const [row] = await db
    .update(groundTransportPickups)
    .set(input)
    .where(eq(groundTransportPickups.id, id))
    .returning();
  return row ?? null;
}

/** Unawaited update builder for use inside `db.batch([..., recordTransition])`. */
export function buildUpdatePickup(
  id: string,
  input: Partial<PickupDbValues>
) {
  return db
    .update(groundTransportPickups)
    .set(input)
    .where(eq(groundTransportPickups.id, id))
    .returning();
}

export async function deletePickup(id: string): Promise<Pickup | null> {
  const [row] = await db
    .delete(groundTransportPickups)
    .where(eq(groundTransportPickups.id, id))
    .returning();
  return row ?? null;
}
