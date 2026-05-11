import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { festivals } from "@/db/schema";

/**
 * @deprecated Use `getActiveFestival(session)` from `@/lib/festivals` instead.
 * This shim exists only so that legacy test mocks continue to compile.
 * Returns the first (oldest) festival across all workspaces, or null.
 */
export async function getCurrentEdition() {
  const [row] = await db
    .select()
    .from(festivals)
    .orderBy(asc(festivals.startDate))
    .limit(1);
  return row ?? null;
}
