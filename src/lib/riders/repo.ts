import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { artists, riders } from "@/db/schema";
import type { RiderDbValues, RiderKind } from "./schema";

export type Rider = typeof riders.$inferSelect;

export interface ListRidersParams {
  editionId: string;
  artistId?: string;
  kind?: RiderKind;
  confirmed?: boolean;
}

/**
 * Riders don't carry editionId directly - they belong to an artist, which
 * is edition-scoped. List filters via a join through artists.
 */
export async function listRiders({
  editionId,
  artistId,
  kind,
  confirmed,
}: ListRidersParams): Promise<Rider[]> {
  // Get the artist ids for this edition first; cheaper than a 2-table join
  // and lets us short-circuit when nothing matches.
  const artistRows = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.editionId, editionId));
  const editionArtistIds = artistRows.map((r) => r.id);
  if (editionArtistIds.length === 0) return [];

  const filters = [inArray(riders.artistId, editionArtistIds)];
  if (artistId) filters.push(eq(riders.artistId, artistId));
  if (kind) filters.push(eq(riders.kind, kind));
  if (confirmed !== undefined) filters.push(eq(riders.confirmed, confirmed));

  return db
    .select()
    .from(riders)
    .where(and(...filters))
    .orderBy(desc(riders.createdAt));
}

export async function listRidersForArtist(artistId: string): Promise<Rider[]> {
  return db
    .select()
    .from(riders)
    .where(eq(riders.artistId, artistId))
    .orderBy(asc(riders.kind), desc(riders.createdAt));
}

export async function getRider(id: string): Promise<Rider | null> {
  const [row] = await db
    .select()
    .from(riders)
    .where(eq(riders.id, id))
    .limit(1);
  return row ?? null;
}

export async function createRider(input: RiderDbValues): Promise<Rider> {
  const [row] = await db.insert(riders).values(input).returning();
  return row;
}

export async function updateRider(
  id: string,
  input: Partial<RiderDbValues>
): Promise<Rider | null> {
  if (Object.keys(input).length === 0) return getRider(id);
  const [row] = await db
    .update(riders)
    .set(input)
    .where(eq(riders.id, id))
    .returning();
  return row ?? null;
}

export async function deleteRider(id: string): Promise<Rider | null> {
  const [row] = await db.delete(riders).where(eq(riders.id, id)).returning();
  return row ?? null;
}
