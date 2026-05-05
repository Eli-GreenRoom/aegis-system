import { and, asc, eq, inArray, isNull, isNotNull, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { artists } from "@/db/schema";
import type { ArtistDbValues } from "./schema";

export type Artist = typeof artists.$inferSelect;

export interface ListArtistsParams {
  editionId: string;
  search?: string;
  agency?: string;
  archived?: "active" | "archived" | "all";
}

export async function listArtists({
  editionId,
  search,
  agency,
  archived = "active",
}: ListArtistsParams): Promise<Artist[]> {
  const filters = [eq(artists.editionId, editionId)];

  if (archived === "active") filters.push(isNull(artists.archivedAt));
  if (archived === "archived") filters.push(isNotNull(artists.archivedAt));

  if (agency && agency.trim() !== "") {
    filters.push(ilike(artists.agency, agency.trim()));
  }

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(artists.name, q),
      ilike(artists.legalName, q),
      ilike(artists.email, q),
      ilike(artists.agency, q),
      ilike(artists.slug, q)
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(artists)
    .where(and(...filters))
    .orderBy(asc(artists.name));
}

export async function listAgencies(editionId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ agency: artists.agency })
    .from(artists)
    .where(and(eq(artists.editionId, editionId), isNotNull(artists.agency)))
    .orderBy(asc(artists.agency));
  return rows.map((r) => r.agency).filter((a): a is string => !!a);
}

export async function getArtist(id: string): Promise<Artist | null> {
  const [row] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Fetch many artists by id. Used by the public /share/press page so the
 * share link can target a specific subset. Filters to the given edition
 * + non-archived only.
 */
export async function listArtistsByIds(
  editionId: string,
  ids: string[]
): Promise<Artist[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(artists)
    .where(
      and(
        eq(artists.editionId, editionId),
        isNull(artists.archivedAt),
        inArray(artists.id, ids)
      )
    )
    .orderBy(asc(artists.name));
}

export async function getArtistBySlug(
  editionId: string,
  slug: string
): Promise<Artist | null> {
  const [row] = await db
    .select()
    .from(artists)
    .where(and(eq(artists.editionId, editionId), eq(artists.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function createArtist(
  editionId: string,
  input: ArtistDbValues
): Promise<Artist> {
  const [row] = await db
    .insert(artists)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updateArtist(
  id: string,
  input: Partial<ArtistDbValues>
): Promise<Artist | null> {
  if (Object.keys(input).length === 0) {
    return getArtist(id);
  }
  const [row] = await db
    .update(artists)
    .set(input)
    .where(eq(artists.id, id))
    .returning();
  return row ?? null;
}

export async function archiveArtist(id: string): Promise<Artist | null> {
  const [row] = await db
    .update(artists)
    .set({ archivedAt: sql`now()` })
    .where(eq(artists.id, id))
    .returning();
  return row ?? null;
}

export async function unarchiveArtist(id: string): Promise<Artist | null> {
  const [row] = await db
    .update(artists)
    .set({ archivedAt: null })
    .where(eq(artists.id, id))
    .returning();
  return row ?? null;
}

export async function countActiveArtists(editionId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(artists)
    .where(and(eq(artists.editionId, editionId), isNull(artists.archivedAt)));
  return row?.n ?? 0;
}
