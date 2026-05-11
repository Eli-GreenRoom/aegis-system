import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { getAppSession, requirePermission } from "@/lib/session";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";

const inviteBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]),
  festivalScope: z.array(z.string().uuid()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getAppSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "workspace.team");
  if (denied) return denied;

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.workspaceId, session.workspaceId))
    .orderBy(asc(teamMembers.createdAt));

  return Response.json({ members });
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "workspace.team");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, role, festivalScope } = parsed.data;

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.workspaceId, session.workspaceId),
        eq(teamMembers.email, email),
      ),
    )
    .limit(1);

  if (existing) {
    return Response.json({ error: "Already a member." }, { status: 409 });
  }

  const inviteToken = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const inviteUrl = `${origin}/invite/${inviteToken}`;

  const [member] = await db
    .insert(teamMembers)
    .values({
      workspaceId: session.workspaceId,
      email,
      role,
      status: "pending",
      permissions: {},
      festivalScope: festivalScope ?? null,
      inviteToken,
      invitedAt: new Date(),
    })
    .returning();

  return Response.json({ member, inviteUrl }, { status: 201 });
}
