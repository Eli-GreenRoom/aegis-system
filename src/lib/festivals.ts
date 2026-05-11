import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { festivals, stages } from "@/db/schema";
import type { AppSession } from "@/lib/session";

export type Festival = typeof festivals.$inferSelect;
export type Stage = typeof stages.$inferSelect;

/**
 * List all non-archived festivals in a workspace, ordered oldest first.
 */
export async function listFestivals(workspaceId: string): Promise<Festival[]> {
  return db
    .select()
    .from(festivals)
    .where(
      and(
        eq(festivals.workspaceId, workspaceId),
        // archivedAt IS NULL
      ),
    )
    .orderBy(asc(festivals.startDate));
}

/**
 * Return the first (oldest) festival across all workspaces. Used only by
 * public share pages (e.g. /share/press) that have no authenticated session.
 * Single-tenant deployment assumption: there is exactly one workspace.
 */
export async function getFirstFestival(): Promise<Festival | null> {
  const [row] = await db
    .select()
    .from(festivals)
    .orderBy(asc(festivals.startDate))
    .limit(1);
  return row ?? null;
}

/**
 * Return the first (oldest) non-archived festival in the session's workspace.
 * Phase 2 will add a cookie-based switcher; for now we always return the
 * earliest festival so the existing data is immediately visible.
 */
export async function getActiveFestival(
  session: Pick<AppSession, "workspaceId">,
): Promise<Festival | null> {
  const [row] = await db
    .select()
    .from(festivals)
    .where(eq(festivals.workspaceId, session.workspaceId))
    .orderBy(asc(festivals.startDate))
    .limit(1);
  return row ?? null;
}

/**
 * Get a single festival by id, scoped to the workspace.
 */
export async function getFestival(
  id: string,
  workspaceId: string,
): Promise<Festival | null> {
  const [row] = await db
    .select()
    .from(festivals)
    .where(and(eq(festivals.id, id), eq(festivals.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

/**
 * Derive the festival day dates as an array of YYYY-MM-DD strings
 * spanning [startDate, endDate] inclusive.
 */
export function festivalDates(
  festival: Pick<Festival, "startDate" | "endDate">,
): string[] {
  const dates: string[] = [];
  const start = new Date(`${festival.startDate}T00:00:00Z`);
  const end = new Date(`${festival.endDate}T00:00:00Z`);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Given a YYYY-MM-DD date within a festival's range, return the human-readable
 * day label (e.g. "Friday"). Used by DayTabs.
 */
export function dateToDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

/**
 * Default Aegis stage definitions — used by seed.ts to populate stages
 * for the migrated festival.
 */
export const DEFAULT_STAGE_SEEDS = [
  { name: "Main Stage", slug: "main", color: "#E5B85A", sortOrder: 0 },
  {
    name: "Alternative Stage",
    slug: "alternative",
    color: "#7C9EFF",
    sortOrder: 1,
  },
  { name: "Select Pool", slug: "select-pool", color: "#A78BFA", sortOrder: 2 },
  { name: "Collectives", slug: "collectives", color: "#F472B6", sortOrder: 3 },
] as const;
