import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { artists, crew } from "@/db/schema";

export type PersonKind = "artist" | "crew";

export interface Person {
  kind: PersonKind;
  id: string;
  name: string;
  agency: string | null;
}

/**
 * Active people (artists + crew) for the current edition. Used by flights /
 * ground / hotels pickers.
 */
export async function listPeople(editionId: string): Promise<Person[]> {
  const [artistRows, crewRows] = await Promise.all([
    db
      .select({ id: artists.id, name: artists.name, agency: artists.agency })
      .from(artists)
      .where(and(eq(artists.editionId, editionId), isNull(artists.archivedAt)))
      .orderBy(asc(artists.name)),
    db
      .select({ id: crew.id, name: crew.name, role: crew.role })
      .from(crew)
      .where(and(eq(crew.editionId, editionId), isNull(crew.archivedAt)))
      .orderBy(asc(crew.name)),
  ]);

  const out: Person[] = [
    ...artistRows.map((a) => ({
      kind: "artist" as const,
      id: a.id,
      name: a.name,
      agency: a.agency,
    })),
    ...crewRows.map((c) => ({
      kind: "crew" as const,
      id: c.id,
      name: c.name,
      agency: c.role,
    })),
  ];

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Resolve a single person across both tables. Returns name + kind for
 * display in lists where rows reference `personKind/personId`.
 */
export async function getPerson(
  kind: PersonKind,
  id: string
): Promise<Person | null> {
  if (kind === "artist") {
    const [row] = await db
      .select({ id: artists.id, name: artists.name, agency: artists.agency })
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);
    return row
      ? { kind: "artist", id: row.id, name: row.name, agency: row.agency }
      : null;
  }
  const [row] = await db
    .select({ id: crew.id, name: crew.name, role: crew.role })
    .from(crew)
    .where(eq(crew.id, id))
    .limit(1);
  return row
    ? { kind: "crew", id: row.id, name: row.name, agency: row.role }
    : null;
}

/**
 * Bulk resolver — for a list of (kind, id) pairs, returns a Map keyed by
 * `${kind}:${id}`. Two queries total.
 */
export async function resolvePeople(
  pairs: Array<{ kind: PersonKind; id: string }>
): Promise<Map<string, Person>> {
  const result = new Map<string, Person>();
  if (pairs.length === 0) return result;

  const artistIds = [...new Set(pairs.filter((p) => p.kind === "artist").map((p) => p.id))];
  const crewIds = [...new Set(pairs.filter((p) => p.kind === "crew").map((p) => p.id))];

  const [artistRows, crewRows] = await Promise.all([
    artistIds.length > 0
      ? db
          .select({ id: artists.id, name: artists.name, agency: artists.agency })
          .from(artists)
          .where(inArray(artists.id, artistIds))
      : Promise.resolve([]),
    crewIds.length > 0
      ? db
          .select({ id: crew.id, name: crew.name, role: crew.role })
          .from(crew)
          .where(inArray(crew.id, crewIds))
      : Promise.resolve([]),
  ]);

  for (const a of artistRows) {
    result.set(`artist:${a.id}`, {
      kind: "artist",
      id: a.id,
      name: a.name,
      agency: a.agency,
    });
  }
  for (const c of crewRows) {
    result.set(`crew:${c.id}`, {
      kind: "crew",
      id: c.id,
      name: c.name,
      agency: c.role,
    });
  }
  return result;
}

