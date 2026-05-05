import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { vendorPatchSchema, vendorToDbPatchValues } from "@/lib/ground/schema";
import { deleteVendor, getVendor, updateVendor } from "@/lib/ground/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const { id } = await ctx.params;
  const vendor = await getVendor(id);
  if (!vendor) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ vendor });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = vendorPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await getVendor(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateVendor(id, vendorToDbPatchValues(parsed.data));
  return Response.json({ vendor: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteVendor(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ vendor: row });
}
