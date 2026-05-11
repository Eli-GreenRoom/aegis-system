import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { workspaces, teamMembers } from "@/db/schema";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().optional(),
});

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name } = parsed.data;
  const slug = parsed.data.slug ?? deriveSlug(name);

  if (!slug) {
    return Response.json(
      { error: "Could not derive a valid slug from the provided name." },
      { status: 400 },
    );
  }

  try {
    const [workspace] = await db
      .insert(workspaces)
      .values({ name, slug, ownerUserId: session.user.id })
      .returning();

    await db.insert(teamMembers).values({
      workspaceId: workspace.id,
      userId: session.user.id,
      email: session.user.email,
      role: "owner",
      status: "active",
      permissions: {},
      festivalScope: null,
      acceptedAt: new Date(),
    });

    return Response.json({ workspace }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return Response.json(
        { error: "A workspace with that slug already exists." },
        { status: 409 },
      );
    }
    throw err;
  }
}
