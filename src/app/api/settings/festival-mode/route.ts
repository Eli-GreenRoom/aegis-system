import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { festivalEditions } from "@/db/schema";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";

const inputSchema = z.object({
  active: z.boolean(),
});

/**
 * POST /api/settings/festival-mode
 * Body: `{ active: boolean }` - flips the current edition's
 * `festivalModeActive` flag. When true, the dashboard switches to
 * festival-mode layout regardless of the calendar date.
 */
export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "settings");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const edition = await getCurrentEdition();
  const [updated] = await db
    .update(festivalEditions)
    .set({ festivalModeActive: parsed.data.active })
    .where(eq(festivalEditions.id, edition.id))
    .returning();

  return Response.json({ edition: updated });
}
