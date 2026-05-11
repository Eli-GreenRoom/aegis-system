import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";

interface Ctx {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await ctx.params;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.inviteToken, token),
        eq(teamMembers.status, "pending"),
      ),
    )
    .limit(1);

  if (!member) {
    return Response.json(
      { error: "Invite not found or already used." },
      { status: 404 },
    );
  }

  if (member.email !== session.user.email) {
    return Response.json(
      { error: "This invite was sent to a different email address." },
      { status: 403 },
    );
  }

  const [updated] = await db
    .update(teamMembers)
    .set({
      userId: session.user.id,
      name: session.user.name ?? null,
      status: "active",
      acceptedAt: new Date(),
      inviteToken: null,
      updatedAt: new Date(),
    })
    .where(eq(teamMembers.id, member.id))
    .returning();

  return Response.json({ ok: true, workspaceId: updated.workspaceId });
}
