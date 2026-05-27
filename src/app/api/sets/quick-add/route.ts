import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getStage, createSlot, createSet } from "@/lib/lineup/repo";
import { db } from "@/db/client";
import { slots } from "@/db/schema";

const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const quickAddSchema = z
  .object({
    stageId: z.string().uuid(),
    date: z.string().regex(dateRegex, "YYYY-MM-DD"),
    startTime: z.string().regex(hhmmRegex, "HH:MM (24h)"),
    endTime: z.string().regex(hhmmRegex, "HH:MM (24h)"),
    artistId: z.string().uuid(),
    status: z
      .enum([
        "confirmed",
        "option",
        "not_available",
        "live",
        "done",
        "withdrawn",
      ])
      .optional(),
    announceBatch: z.string().trim().max(500).optional().or(z.literal("")),
    feeAmountCents: z
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .nullable()
      .optional(),
    feeCurrency: z.enum(["USD", "EUR"]).optional().or(z.literal("")),
    agency: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((v) => v.startTime !== v.endTime, {
    message: "Start and end can't be the same",
    path: ["endTime"],
  });

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup.edit");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = quickAddSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const {
    stageId,
    date,
    startTime,
    endTime,
    artistId,
    status,
    announceBatch,
    feeAmountCents,
    feeCurrency,
    agency,
  } = parsed.data;

  // Guard: date must be within stage's activeDates if set.
  const stage = await getStage(stageId);
  if (!stage || stage.festivalId !== festival.id)
    return Response.json({ error: "Stage not found" }, { status: 404 });

  const active = stage.activeDates as string[] | null;
  if (active && active.length > 0 && !active.includes(date)) {
    return Response.json(
      {
        error: `Stage not active on ${date}. Active dates: ${active.join(", ")}.`,
      },
      { status: 422 },
    );
  }

  // Find existing slot with exact (stageId, date, startTime, endTime) match, or create one.
  const [existingSlot] = await db
    .select()
    .from(slots)
    .where(
      and(
        eq(slots.festivalId, festival.id),
        eq(slots.stageId, stageId),
        eq(slots.date, date),
        eq(slots.startTime, startTime),
        eq(slots.endTime, endTime),
      ),
    )
    .limit(1);

  const slot =
    existingSlot ??
    (await createSlot(festival.id, {
      stageId,
      date,
      startTime,
      endTime,
      sortOrder: 0,
    }));

  const set = await createSet({
    slotId: slot.id,
    artistId,
    status: status ?? "option",
    announceBatch:
      announceBatch === "" || announceBatch === undefined
        ? null
        : announceBatch,
    feeAmountCents: feeAmountCents ?? null,
    feeCurrency:
      feeCurrency === "" || feeCurrency === undefined ? null : feeCurrency,
    agency: agency === "" || agency === undefined ? null : agency,
    comments: null,
  });

  return Response.json({ slot, set }, { status: 201 });
}
