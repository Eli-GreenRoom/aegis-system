import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { slotPatchSchema, slotToDbPatchValues } from "@/lib/lineup/schema";
import { deleteSlot, getSlot, updateSlot } from "@/lib/lineup/repo";

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
  const slot = await getSlot(id);
  if (!slot) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ slot });
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

  const parsed = slotPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getSlot(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateSlot(id, slotToDbPatchValues(parsed.data));
  return Response.json({ slot: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteSlot(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ slot: row });
}
