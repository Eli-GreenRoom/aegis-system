import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { festivalEditions } from "@/db/schema";

const CURRENT_YEAR = 2026;
const CURRENT_NAME = "Aegis Festival 2026";
const CURRENT_START = "2026-08-14";
const CURRENT_END = "2026-08-16";
const CURRENT_LOCATION = "Aranoon Village, Batroun";

export async function getCurrentEdition() {
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
