import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { crewPatchSchema, toDbPatchValues } from "@/lib/crew/schema";
import {
  archiveCrewMember,
  getCrewMember,
  unarchiveCrewMember,
  updateCrewMember,
} from "@/lib/crew/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "crew.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const crew = await getCrewMember(id);
  if (!crew) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ crew });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "crew.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = crewPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getCrewMember(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await updateCrewMember(id, toDbPatchValues(parsed.data));
  return Response.json({ crew: updated });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "crew.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "archive";

  if (action === "unarchive") {
    const row = await unarchiveCrewMember(id);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ crew: row });
  }

  const row = await archiveCrewMember(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ crew: row });
}
