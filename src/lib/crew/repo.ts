import { and, asc, eq, isNull, isNotNull, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { crew } from "@/db/schema";
import type { CrewDbValues } from "./schema";

export type CrewMember = typeof crew.$inferSelect;

export interface ListCrewParams {
  editionId: string;
  search?: string;
  role?: string;
  archived?: "active" | "archived" | "all";
}

export async function listCrew({
  editionId,
  search,
  role,
  archived = "active",
}: ListCrewParams): Promise<CrewMember[]> {
  const filters = [eq(crew.editionId, editionId)];

  if (archived === "active") filters.push(isNull(crew.archivedAt));
  if (archived === "archived") filters.push(isNotNull(crew.archivedAt));

  if (role && role.trim() !== "") {
    filters.push(ilike(crew.role, role.trim()));
  }

  if (search && search.trim() !== "") {
    const q = `%${search.trim()}%`;
    const searchOr = or(
      ilike(crew.name, q),
      ilike(crew.role, q),
      ilike(crew.email, q),
      ilike(crew.phone, q)
    );
    if (searchOr) filters.push(searchOr);
  }

  return db
    .select()
    .from(crew)
    .where(and(...filters))
    .orderBy(asc(crew.name));
}

export async function listCrewRoles(editionId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ role: crew.role })
    .from(crew)
    .where(and(eq(crew.editionId, editionId), isNotNull(crew.role)))
    .orderBy(asc(crew.role));
  return rows.map((r) => r.role).filter((r): r is string => !!r);
}

export async function getCrewMember(id: string): Promise<CrewMember | null> {
  const [row] = await db
    .select()
    .from(crew)
    .where(eq(crew.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCrewMember(
  editionId: string,
  input: CrewDbValues
): Promise<CrewMember> {
  const [row] = await db
    .insert(crew)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updateCrewMember(
  id: string,
  input: Partial<CrewDbValues>
): Promise<CrewMember | null> {
  if (Object.keys(input).length === 0) {
    return getCrewMember(id);
  }
  const [row] = await db
    .update(crew)
    .set(input)
    .where(eq(crew.id, id))
    .returning();
  return row ?? null;
}

export async function archiveCrewMember(id: string): Promise<CrewMember | null> {
  const [row] = await db
    .update(crew)
    .set({ archivedAt: sql`now()` })
    .where(eq(crew.id, id))
    .returning();
  return row ?? null;
}

export async function unarchiveCrewMember(id: string): Promise<CrewMember | null> {
  const [row] = await db
    .update(crew)
    .set({ archivedAt: null })
    .where(eq(crew.id, id))
    .returning();
  return row ?? null;
}
