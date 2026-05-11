import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getAppSession } from "@/lib/session";
import { db } from "@/db/client";
import { festivals } from "@/db/schema";

const CreateFestivalSchema = z
  .object({
    name: z.string().min(1).max(100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "endDate must be >= startDate",
    path: ["endDate"],
  });

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

export async function GET(request: NextRequest) {
  const session = await getAppSession(request.headers);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(festivals)
    .where(
      and(
        eq(festivals.workspaceId, session.workspaceId),
        isNull(festivals.archivedAt),
      ),
    )
    .orderBy(asc(festivals.startDate));

  return Response.json({ festivals: rows });
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request.headers);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateFestivalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!session.permissions["festival.create"]) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, startDate, endDate, location, description } = parsed.data;
  const baseSlug = deriveSlug(name);

  let festival: typeof festivals.$inferSelect | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    try {
      const [inserted] = await db
        .insert(festivals)
        .values({
          workspaceId: session.workspaceId,
          slug,
          name,
          startDate,
          endDate,
          location: location ?? null,
          description: description ?? null,
        })
        .returning();
      festival = inserted;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        continue;
      }
      throw err;
    }
  }

  if (!festival) {
    return Response.json(
      { error: "Could not generate a unique slug after 10 attempts." },
      { status: 409 },
    );
  }

  return Response.json({ festival }, { status: 201 });
}
