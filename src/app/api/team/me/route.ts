import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getAppSession } from "@/lib/session";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";

const patchSchema = z.object({
  signatureUrl: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
});

export async function GET() {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, session.memberId))
    .limit(1);

  if (!member) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    member: {
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
      signatureUrl: member.signatureUrl,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );

  const updates: Partial<typeof teamMembers.$inferInsert> = {
    updatedAt: new Date(),
  };
  if ("signatureUrl" in parsed.data)
    updates.signatureUrl = parsed.data.signatureUrl ?? null;
  if ("name" in parsed.data && parsed.data.name)
    updates.name = parsed.data.name;

  const [updated] = await db
    .update(teamMembers)
    .set(updates)
    .where(eq(teamMembers.id, session.memberId))
    .returning();

  return Response.json({
    member: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      signatureUrl: updated.signatureUrl,
    },
  });
}
