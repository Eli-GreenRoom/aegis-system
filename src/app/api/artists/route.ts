import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import { artistInputSchema, toDbValues } from "@/lib/artists/schema";
import {
  createArtist,
  getArtistBySlug,
  listArtists,
  type ListArtistsParams,
} from "@/lib/artists/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "artists");
  if (denied) return denied;

  const edition = await getCurrentEdition();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const agency = url.searchParams.get("agency") ?? undefined;
  const archivedParam = url.searchParams.get("archived") ?? "active";
  const archived: ListArtistsParams["archived"] =
    archivedParam === "archived" || archivedParam === "all" ? archivedParam : "active";

  const rows = await listArtists({
    editionId: edition.id,
    search,
    agency,
    archived,
  });
  return Response.json({ artists: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
      { status: 400 }
    );
  }

  const edition = await getCurrentEdition();

  const existing = await getArtistBySlug(edition.id, parsed.data.slug);
  if (existing) {
    return Response.json(
      { error: "Slug already in use for this edition" },
      { status: 409 }
    );
  }

  const created = await createArtist(edition.id, toDbValues(parsed.data));
  return Response.json({ artist: created }, { status: 201 });
}
