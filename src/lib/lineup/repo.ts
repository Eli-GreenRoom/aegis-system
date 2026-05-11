import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { stages, slots, sets, artists } from "@/db/schema";
import type { SetDbValues, SlotDbValues, StageDbValues } from "./schema";

export type Stage = typeof stages.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
export type Artist = typeof artists.$inferSelect;

// -- Stages --------------------------------------------------------------

export async function listStages(festivalId: string): Promise<Stage[]> {
  return db
    .select()
    .from(stages)
    .where(eq(stages.festivalId, festivalId))
    .orderBy(asc(stages.sortOrder), asc(stages.name));
}

export async function getStage(id: string): Promise<Stage | null> {
  const [row] = await db
    .select()
    .from(stages)
    .where(eq(stages.id, id))
    .limit(1);
  return row ?? null;
}

export async function getStageBySlug(
  slug: string,
  festivalId: string,
): Promise<Stage | null> {
  const [row] = await db
    .select()
    .from(stages)
    .where(and(eq(stages.slug, slug), eq(stages.festivalId, festivalId)))
    .limit(1);
  return row ?? null;
}

export async function createStage(input: StageDbValues): Promise<Stage> {
  const [row] = await db.insert(stages).values(input).returning();
  return row;
}

export async function updateStage(
  id: string,
  input: Partial<Omit<StageDbValues, "festivalId">>,
): Promise<Stage | null> {
  if (Object.keys(input).length === 0) return getStage(id);
  const [row] = await db
    .update(stages)
    .set(input)
    .where(eq(stages.id, id))
    .returning();
  return row ?? null;
}

export async function deleteStage(id: string): Promise<Stage | null> {
  const [row] = await db.delete(stages).where(eq(stages.id, id)).returning();
  return row ?? null;
}

// -- Slots ---------------------------------------------------------------

export interface ListSlotsParams {
  festivalId: string;
  date?: string;
  stageId?: string;
}

export async function listSlots({
  festivalId,
  date,
  stageId,
}: ListSlotsParams): Promise<Slot[]> {
  const filters = [eq(slots.festivalId, festivalId)];
  if (date) filters.push(eq(slots.date, date));
  if (stageId) filters.push(eq(slots.stageId, stageId));
  return db
    .select()
    .from(slots)
    .where(and(...filters))
    .orderBy(asc(slots.date), asc(slots.startTime), asc(slots.sortOrder));
}

export async function getSlot(id: string): Promise<Slot | null> {
  const [row] = await db.select().from(slots).where(eq(slots.id, id)).limit(1);
  return row ?? null;
}

export async function createSlot(
  festivalId: string,
  input: SlotDbValues,
): Promise<Slot> {
  const [row] = await db
    .insert(slots)
    .values({ ...input, festivalId })
    .returning();
  return row;
}

export async function updateSlot(
  id: string,
  input: Partial<SlotDbValues>,
): Promise<Slot | null> {
  if (Object.keys(input).length === 0) return getSlot(id);
  const [row] = await db
    .update(slots)
    .set(input)
    .where(eq(slots.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSlot(id: string): Promise<Slot | null> {
  const [row] = await db.delete(slots).where(eq(slots.id, id)).returning();
  return row ?? null;
}

/**
 * Reassign `sortOrder` for the given slot ids to their array index.
 * Validates that every id belongs to the same `(stageId, date)` and to
 * the given festival before writing.
 */
export async function reorderSlots(
  festivalId: string,
  stageId: string,
  date: string,
  slotIds: string[],
): Promise<{ updated: number } | null> {
  if (slotIds.length === 0) return { updated: 0 };

  const rows = await db
    .select()
    .from(slots)
    .where(
      and(
        eq(slots.festivalId, festivalId),
        eq(slots.stageId, stageId),
        eq(slots.date, date),
        inArray(slots.id, slotIds),
      ),
    );
  if (rows.length !== slotIds.length) return null;

  let updated = 0;
  for (let i = 0; i < slotIds.length; i++) {
    const id = slotIds[i];
    const [row] = await db
      .update(slots)
      .set({ sortOrder: i })
      .where(eq(slots.id, id))
      .returning();
    if (row) updated += 1;
  }
  return { updated };
}

// -- Sets ----------------------------------------------------------------

export async function listSetsForSlot(slotId: string): Promise<SetRow[]> {
  return db
    .select()
    .from(sets)
    .where(eq(sets.slotId, slotId))
    .orderBy(asc(sets.createdAt));
}

export async function listSetsForArtist(artistId: string): Promise<SetRow[]> {
  return db
    .select()
    .from(sets)
    .where(eq(sets.artistId, artistId))
    .orderBy(asc(sets.createdAt));
}

export async function getSet(id: string): Promise<SetRow | null> {
  const [row] = await db.select().from(sets).where(eq(sets.id, id)).limit(1);
  return row ?? null;
}

export async function createSet(input: SetDbValues): Promise<SetRow> {
  const [row] = await db.insert(sets).values(input).returning();
  return row;
}

export async function updateSet(
  id: string,
  input: Partial<SetDbValues>,
): Promise<SetRow | null> {
  if (Object.keys(input).length === 0) return getSet(id);
  const [row] = await db
    .update(sets)
    .set(input)
    .where(eq(sets.id, id))
    .returning();
  return row ?? null;
}

export function buildUpdateSet(id: string, input: Partial<SetDbValues>) {
  return db.update(sets).set(input).where(eq(sets.id, id)).returning();
}

export async function deleteSet(id: string): Promise<SetRow | null> {
  const [row] = await db.delete(sets).where(eq(sets.id, id)).returning();
  return row ?? null;
}

// -- Grid view -----------------------------------------------------------

export interface SetWithArtist extends SetRow {
  artist: Pick<Artist, "id" | "name" | "slug" | "agency" | "color">;
}

export interface SlotWithSets extends Slot {
  sets: SetWithArtist[];
}

export interface StageWithSlots {
  stage: Stage;
  slots: SlotWithSets[];
}

/**
 * Returns the full grid for one festival + date: every stage, with its slots
 * (ordered by start time then sortOrder), each slot with its sets (each set
 * with the joined artist's display fields). Empty stages/slots included so
 * the UI can render zero state.
 */
export async function getLineupGrid(
  festivalId: string,
  date: string,
): Promise<StageWithSlots[]> {
  const allStages = await listStages(festivalId);

  const slotRows = await db
    .select()
    .from(slots)
    .where(and(eq(slots.festivalId, festivalId), eq(slots.date, date)))
    .orderBy(asc(slots.startTime), asc(slots.sortOrder));

  const slotIds = slotRows.map((s) => s.id);

  type SetJoin = {
    set: SetRow;
    artist: Pick<Artist, "id" | "name" | "slug" | "agency" | "color">;
  };

  let setRows: SetJoin[] = [];
  if (slotIds.length > 0) {
    setRows = await db
      .select({
        set: sets,
        artist: {
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          agency: artists.agency,
          color: artists.color,
        },
      })
      .from(sets)
      .innerJoin(artists, eq(sets.artistId, artists.id))
      .where(inArray(sets.slotId, slotIds))
      .orderBy(asc(sets.createdAt));
  }

  const setsBySlot = new Map<string, SetWithArtist[]>();
  for (const r of setRows) {
    const list = setsBySlot.get(r.set.slotId) ?? [];
    list.push({ ...r.set, artist: r.artist });
    setsBySlot.set(r.set.slotId, list);
  }

  const slotsByStage = new Map<string, SlotWithSets[]>();
  for (const s of slotRows) {
    const list = slotsByStage.get(s.stageId) ?? [];
    list.push({ ...s, sets: setsBySlot.get(s.id) ?? [] });
    slotsByStage.set(s.stageId, list);
  }

  return allStages.map((stage) => ({
    stage,
    slots: slotsByStage.get(stage.id) ?? [],
  }));
}
