import { NextRequest } from "next/server";
import { z } from "zod";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { reorderSlots } from "@/lib/lineup/repo";

const reorderInputSchema = z.object({
  stageId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD date required"),
  slotIds: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * POST /api/slots/reorder
 *
 * Body: `{ stageId, date, slotIds: string[] }`. Assigns
 * `sortOrder = index` to each slot in the provided order. The repo
 * validates that every slot id belongs to the given stage + date +
 * current festival - rejects with 400 if any id strays. Used by the
 * drag-to-reorder UX in LineupBoard.
 */
export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reorderInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const result = await reorderSlots(
    festival.id,
    parsed.data.stageId,
    parsed.data.date,
    parsed.data.slotIds,
  );
  if (!result) {
    return Response.json(
      {
        error:
          "One or more slot ids don't belong to this stage + date + festival.",
      },
      { status: 400 },
    );
  }

  return Response.json({ ok: true, updated: result.updated });
}
