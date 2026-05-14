import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { festivals } from "@/db/schema";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";

const inputSchema = z.object({
  active: z.boolean(),
});

/**
 * POST /api/settings/festival-mode
 * Body: `{ active: boolean }` - flips the current festival's
 * `festivalModeActive` flag. When true, the dashboard switches to
 * festival-mode layout regardless of the calendar date.
 */
export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "festival.settings");
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

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const [updated] = await db
    .update(festivals)
    .set({ festivalModeActive: parsed.data.active })
    .where(eq(festivals.id, festival.id))
    .returning();

  return Response.json({ festival: updated });
}
