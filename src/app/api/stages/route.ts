import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { stageInputSchema, stageToDbValues } from "@/lib/lineup/schema";
import { createStage, getStageBySlug, listStages } from "@/lib/lineup/repo";

export async function GET() {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.view");
  if (denied) return denied;
  const festival = await getActiveFestival(session);
  if (!festival) return Response.json({ stages: [] });
  const rows = await listStages(festival.id);
  return Response.json({ stages: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival configured" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = stageInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const taken = await getStageBySlug(parsed.data.slug, festival.id);
  if (taken) {
    return Response.json({ error: "Slug already in use" }, { status: 409 });
  }

  const created = await createStage(stageToDbValues(parsed.data, festival.id));
  return Response.json({ stage: created }, { status: 201 });
}
