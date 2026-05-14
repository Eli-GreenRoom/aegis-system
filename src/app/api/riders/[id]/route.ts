import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { riderPatchSchema, riderToDbPatchValues } from "@/lib/riders/schema";
import { deleteRider, getRider, updateRider } from "@/lib/riders/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "riders.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getRider(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ rider: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "riders.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = riderPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getRider(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateRider(id, riderToDbPatchValues(parsed.data));
  return Response.json({ rider: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "riders.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteRider(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ rider: row });
}
