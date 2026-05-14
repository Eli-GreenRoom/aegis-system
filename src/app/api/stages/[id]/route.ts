import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { stagePatchSchema, stageToDbPatchValues } from "@/lib/lineup/schema";
import {
  deleteStage,
  getStage,
  getStageBySlug,
  updateStage,
} from "@/lib/lineup/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const stage = await getStage(id);
  if (!stage) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ stage });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = stagePatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getStage(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.slug !== undefined && parsed.data.slug !== existing.slug) {
    const festival = await getActiveFestival(session);
    const taken = festival
      ? await getStageBySlug(parsed.data.slug, festival.id)
      : null;
    if (taken && taken.id !== id) {
      return Response.json({ error: "Slug already in use" }, { status: 409 });
    }
  }

  const updated = await updateStage(id, stageToDbPatchValues(parsed.data));
  return Response.json({ stage: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteStage(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ stage: row });
}
