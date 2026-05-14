import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import {
  slotDateSchema,
  slotInputSchema,
  slotToDbValues,
} from "@/lib/lineup/schema";
import { createSlot, getStage, listSlots } from "@/lib/lineup/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.view");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);

  const dateRaw = url.searchParams.get("date");
  const dateParsed = dateRaw ? slotDateSchema.safeParse(dateRaw) : null;
  const date = dateParsed?.success ? dateParsed.data : undefined;

  const stageId = url.searchParams.get("stageId") ?? undefined;

  const rows = await listSlots({ festivalId: festival.id, date, stageId });
  return Response.json({ slots: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = slotInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  // Guard: date must fall within the stage's activeDates (when set).
  const stage = await getStage(parsed.data.stageId);
  if (stage) {
    const active = stage.activeDates as string[] | null;
    if (active && active.length > 0 && !active.includes(parsed.data.date)) {
      return Response.json(
        {
          error: `This stage is not active on ${parsed.data.date}. Active dates: ${active.join(", ")}.`,
        },
        { status: 422 },
      );
    }
  }

  const created = await createSlot(festival.id, slotToDbValues(parsed.data));
  return Response.json({ slot: created }, { status: 201 });
}
