import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getAppSession, requirePermission } from "@/lib/session";
import { db } from "@/db/client";
import { festivals } from "@/db/schema";

interface Ctx {
  params: Promise<{ id: string }>;
}

const PatchFestivalSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    location: z.string().max(200).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Body must contain at least one field",
  })
  .refine(
    (v) => {
      if (v.startDate && v.endDate) return v.endDate >= v.startDate;
      return true;
    },
    { message: "endDate must be >= startDate", path: ["endDate"] },
  );

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "festival.settings");
  if (denied) return denied;

  const { id } = await ctx.params;

  const [row] = await db
    .select()
    .from(festivals)
    .where(
      and(eq(festivals.id, id), eq(festivals.workspaceId, session.workspaceId)),
    )
    .limit(1);

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ festival: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "festival.settings");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchFestivalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(festivals)
    .where(
      and(eq(festivals.id, id), eq(festivals.workspaceId, session.workspaceId)),
    )
    .limit(1);

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<typeof festivals.$inferInsert> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.startDate !== undefined)
    patch.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) patch.endDate = parsed.data.endDate;
  if ("location" in parsed.data) patch.location = parsed.data.location ?? null;
  if ("description" in parsed.data)
    patch.description = parsed.data.description ?? null;

  const [updated] = await db
    .update(festivals)
    .set(patch)
    .where(eq(festivals.id, id))
    .returning();

  return Response.json({ festival: updated });
}
