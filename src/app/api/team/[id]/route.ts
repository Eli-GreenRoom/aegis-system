import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getAppSession, requirePermission } from "@/lib/session";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";

interface Ctx {
  params: Promise<{ id: string }>;
}

const patchBodySchema = z.object({
  role: z.enum(["admin", "member", "viewer"]).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  festivalScope: z.array(z.string().uuid()).nullable().optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await getAppSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "workspace.team");
  if (denied) return denied;

  const { id } = await ctx.params;

  if (session.memberId === id) {
    return Response.json(
      { error: "Cannot edit your own membership." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.id, id),
        eq(teamMembers.workspaceId, session.workspaceId),
      ),
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.role === "owner" && parsed.data.role !== undefined) {
    return Response.json(
      { error: "Cannot change the owner's role." },
      { status: 400 },
    );
  }

  const updateSet: Partial<typeof existing> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (parsed.data.role !== undefined) updateSet.role = parsed.data.role;
  if (parsed.data.permissions !== undefined)
    updateSet.permissions = parsed.data.permissions;
  if (parsed.data.festivalScope !== undefined)
    updateSet.festivalScope = parsed.data.festivalScope;
  if (parsed.data.status !== undefined) updateSet.status = parsed.data.status;

  const [member] = await db
    .update(teamMembers)
    .set(updateSet)
    .where(eq(teamMembers.id, id))
    .returning();

  return Response.json({ member });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const session = await getAppSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "workspace.team");
  if (denied) return denied;

  const { id } = await ctx.params;

  if (session.memberId === id) {
    return Response.json({ error: "Cannot remove yourself." }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.id, id),
        eq(teamMembers.workspaceId, session.workspaceId),
      ),
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.role === "owner") {
    return Response.json(
      { error: "Cannot remove the workspace owner." },
      { status: 400 },
    );
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, id));

  return Response.json({ ok: true });
}
