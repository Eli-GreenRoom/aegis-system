import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { guestlistEntries } from "@/db/schema";
import type { GuestCategory, GuestlistDbValues } from "./schema";

export type GuestlistEntry = typeof guestlistEntries.$inferSelect;

export interface ListGuestlistParams {
  editionId: string;
  search?: string;
  category?: GuestCategory;
  hostArtistId?: string;
  day?: string;
  inviteSent?: boolean;
  checkedIn?: boolean;
}

export async function listGuestlist({
  editionId,
  search,
  category,
  hostArtistId,
  day,
  inviteSent,
  checkedIn,
}: ListGuestlistParams): Promise<GuestlistEntry[]> {
  const filters = [eq(guestlistEntries.editionId, editionId)];
  if (category) filters.push(eq(guestlistEntries.category, category));
  if (hostArtistId)
    filters.push(eq(guestlistEntries.hostArtistId, hostArtistId));
  if (day) filters.push(eq(guestlistEntries.day, day));
  if (inviteSent !== undefined)
    filters.push(eq(guestlistEntries.inviteSent, inviteSent));
  if (checkedIn !== undefined)
    filters.push(eq(guestlistEntries.checkedIn, checkedIn));

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(guestlistEntries.name, q),
      ilike(guestlistEntries.email, q),
      ilike(guestlistEntries.phone, q),
      ilike(guestlistEntries.comments, q),
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(guestlistEntries)
    .where(and(...filters))
    .orderBy(asc(guestlistEntries.name));
}

export async function getGuestlistEntry(
  id: string,
): Promise<GuestlistEntry | null> {
  const [row] = await db
    .select()
    .from(guestlistEntries)
    .where(eq(guestlistEntries.id, id))
    .limit(1);
  return row ?? null;
}

export async function createGuestlistEntry(
  editionId: string,
  input: GuestlistDbValues,
): Promise<GuestlistEntry> {
  const [row] = await db
    .insert(guestlistEntries)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updateGuestlistEntry(
  id: string,
  input: Partial<GuestlistDbValues>,
): Promise<GuestlistEntry | null> {
  if (Object.keys(input).length === 0) return getGuestlistEntry(id);
  const [row] = await db
    .update(guestlistEntries)
    .set(input)
    .where(eq(guestlistEntries.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGuestlistEntry(
  id: string,
): Promise<GuestlistEntry | null> {
  const [row] = await db
    .delete(guestlistEntries)
    .where(eq(guestlistEntries.id, id))
    .returning();
  return row ?? null;
}

// -- Aggregator ----------------------------------------------------------

export interface GuestlistSummary {
  countsByCategory: Record<GuestCategory, number>;
  invited: number;
  notInvited: number;
  checkedIn: number;
  total: number;
}

const ZERO_COUNTS: Record<GuestCategory, number> = {
  dj_guest: 0,
  competition_winner: 0,
  free_list: 0,
  international: 0,
  general_admission: 0,
};

export async function getGuestlistSummary(
  editionId: string,
): Promise<GuestlistSummary> {
  const rows = await db
    .select({
      category: guestlistEntries.category,
      inviteSent: guestlistEntries.inviteSent,
      checkedIn: guestlistEntries.checkedIn,
      count: sql<number>`count(*)::int`,
    })
    .from(guestlistEntries)
    .where(eq(guestlistEntries.editionId, editionId))
    .groupBy(
      guestlistEntries.category,
      guestlistEntries.inviteSent,
      guestlistEntries.checkedIn,
    );

  const countsByCategory: Record<GuestCategory, number> = { ...ZERO_COUNTS };
  let invited = 0;
  let notInvited = 0;
  let checkedIn = 0;
  let total = 0;

  for (const r of rows) {
    countsByCategory[r.category] += r.count;
    if (r.inviteSent) invited += r.count;
    else notInvited += r.count;
    if (r.checkedIn) checkedIn += r.count;
    total += r.count;
  }

  return { countsByCategory, invited, notInvited, checkedIn, total };
}
