import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { setPatchSchema, setToDbPatchValues } from "@/lib/lineup/schema";
import {
  buildUpdateSet,
  deleteSet,
  getSet,
  updateSet,
} from "@/lib/lineup/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";

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
  const row = await getSet(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ set: row });
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

  const parsed = setPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getSet(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = setToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch &&
    patch.status !== undefined &&
    patch.status !== existing.status;

  if (statusChanged) {
    const [rows] = await db.batch([
      buildUpdateSet(id, patch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "set", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ set: rows[0] ?? null });
  }

  const updated = await updateSet(id, patch);
  return Response.json({ set: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteSet(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ set: row });
}
