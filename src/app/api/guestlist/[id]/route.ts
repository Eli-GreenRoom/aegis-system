import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import {
  guestlistPatchSchema,
  guestlistToDbPatchValues,
} from "@/lib/guestlist/schema";
import {
  deleteGuestlistEntry,
  getGuestlistEntry,
  updateGuestlistEntry,
} from "@/lib/guestlist/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "guestlist.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getGuestlistEntry(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ entry: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "guestlist.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = guestlistPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getGuestlistEntry(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateGuestlistEntry(
    id,
    guestlistToDbPatchValues(parsed.data),
  );
  return Response.json({ entry: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "guestlist.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteGuestlistEntry(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ entry: row });
}
