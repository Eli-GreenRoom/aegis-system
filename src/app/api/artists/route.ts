import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { artistInputSchema, toDbValues } from "@/lib/artists/schema";
import {
  createArtist,
  getArtistBySlug,
  listArtists,
  type ListArtistsParams,
} from "@/lib/artists/repo";
import { setStatusEnum } from "@/lib/lineup/schema";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "artists");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const agency = url.searchParams.get("agency") ?? undefined;
  const archivedParam = url.searchParams.get("archived") ?? "active";
  const archived: ListArtistsParams["archived"] =
    archivedParam === "archived" || archivedParam === "all"
      ? archivedParam
      : "active";

  const stageId = url.searchParams.get("stageId") ?? undefined;
  const setStatusRaw = url.searchParams.get("setStatus") ?? undefined;
  const setStatusParsed = setStatusRaw
    ? setStatusEnum.safeParse(setStatusRaw)
    : null;

  const rows = await listArtists({
    festivalId: festival.id,
    search,
    agency,
    archived,
    stageId,
    setStatus: setStatusParsed?.success ? setStatusParsed.data : undefined,
  });
  return Response.json({ artists: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "artists");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = artistInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const existing = await getArtistBySlug(festival.id, parsed.data.slug);
  if (existing) {
    return Response.json(
      { error: "Slug already in use for this festival" },
      { status: 409 },
    );
  }

  const created = await createArtist(festival.id, toDbValues(parsed.data));
  return Response.json({ artist: created }, { status: 201 });
}
