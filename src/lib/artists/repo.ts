import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  isNotNull,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import { artists, sets, slots } from "@/db/schema";
import type { ArtistDbValues } from "./schema";
import type { SetStatus } from "@/lib/lineup/schema";

export type Artist = typeof artists.$inferSelect;

export interface ListArtistsParams {
  festivalId: string;
  search?: string;
  agency?: string;
  archived?: "active" | "archived" | "all";
  /** Filter to artists with at least one set on this stage. */
  stageId?: string;
  /** Filter to artists with at least one set in this status. Combines with
   *  stageId via AND on the same set row (artist has a set on stageX with
   *  statusY). */
  setStatus?: SetStatus;
}

export async function listArtists({
  festivalId,
  search,
  agency,
  archived = "active",
  stageId,
  setStatus,
}: ListArtistsParams): Promise<Artist[]> {
  const filters = [eq(artists.festivalId, festivalId)];

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
      ilike(artists.slug, q),
    );
    if (searchOr) filters.push(searchOr);
  }

  // Stage / set-status filter: resolve to artist IDs first via a join
  // through sets -> slots, then narrow the artists query with `inArray`.
  // Two queries beats joining + DISTINCT-ing the main select for our
  // scale (a few hundred artists).
  if (stageId || setStatus) {
    const setFilters = [eq(slots.festivalId, festivalId)];
    if (stageId) setFilters.push(eq(slots.stageId, stageId));
    if (setStatus) setFilters.push(eq(sets.status, setStatus));
    const matchingArtistRows = await db
      .selectDistinct({ artistId: sets.artistId })
      .from(sets)
      .innerJoin(slots, eq(sets.slotId, slots.id))
      .where(and(...setFilters));
    const matchingIds = matchingArtistRows.map((r) => r.artistId);
    if (matchingIds.length === 0) return [];
    filters.push(inArray(artists.id, matchingIds));
  }

  return db
    .select()
    .from(artists)
    .where(and(...filters))
    .orderBy(asc(artists.name));
}

export async function listAgencies(festivalId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ agency: artists.agency })
    .from(artists)
    .where(and(eq(artists.festivalId, festivalId), isNotNull(artists.agency)))
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
  festivalId: string,
  ids: string[],
): Promise<Artist[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(artists)
    .where(
      and(
        eq(artists.festivalId, festivalId),
        isNull(artists.archivedAt),
        inArray(artists.id, ids),
      ),
    )
    .orderBy(asc(artists.name));
}

export async function getArtistBySlug(
  festivalId: string,
  slug: string,
): Promise<Artist | null> {
  const [row] = await db
    .select()
    .from(artists)
    .where(and(eq(artists.festivalId, festivalId), eq(artists.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function createArtist(
  festivalId: string,
  input: ArtistDbValues,
): Promise<Artist> {
  const [row] = await db
    .insert(artists)
    .values({ ...input, festivalId })
    .returning();
  return row;
}

export async function updateArtist(
  id: string,
  input: Partial<ArtistDbValues>,
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

export async function countActiveArtists(festivalId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(artists)
    .where(and(eq(artists.festivalId, festivalId), isNull(artists.archivedAt)));
  return row?.n ?? 0;
}
