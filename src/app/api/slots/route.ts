import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import { dayEnum, slotInputSchema, slotToDbValues } from "@/lib/lineup/schema";
import { createSlot, listSlots } from "@/lib/lineup/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup");
  if (denied) return denied;

  const edition = await getCurrentEdition();
  const url = new URL(req.url);

  const dayRaw = url.searchParams.get("day");
  const dayParsed = dayRaw ? dayEnum.safeParse(dayRaw) : null;
  const day = dayParsed?.success ? dayParsed.data : undefined;

  const stageId = url.searchParams.get("stageId") ?? undefined;

  const rows = await listSlots({ editionId: edition.id, day, stageId });
  return Response.json({ slots: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "lineup");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = slotInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const edition = await getCurrentEdition();
  const created = await createSlot(edition.id, slotToDbValues(parsed.data));
  return Response.json({ slot: created }, { status: 201 });
}
