import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { festivalEditions, stages } from "@/db/schema";

const CURRENT_YEAR = 2026;
const CURRENT_NAME = "Aegis Festival 2026";
const CURRENT_START = "2026-08-14";
const CURRENT_END = "2026-08-16";
const CURRENT_LOCATION = "Aranoon Village, Batroun";

/**
 * The four canonical stages, in display order. Stages are global (not
 * per-edition) - same id year over year. Colors come from
 * `--color-stage-*` tokens in src/styles/tokens.css.
 */
const DEFAULT_STAGES = [
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

async function ensureDefaultStages() {
  await db
    .insert(stages)
    .values([...DEFAULT_STAGES])
    .onConflictDoNothing({ target: stages.slug });
}

export async function getCurrentEdition() {
  await ensureDefaultStages();

  const [existing] = await db
    .select()
    .from(festivalEditions)
    .where(eq(festivalEditions.year, CURRENT_YEAR))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(festivalEditions)
    .values({
      year: CURRENT_YEAR,
      name: CURRENT_NAME,
      startDate: CURRENT_START,
      endDate: CURRENT_END,
      location: CURRENT_LOCATION,
    })
    .returning();

  return created;
}
