import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { artistPatchSchema, toDbPatchValues } from "@/lib/artists/schema";
import {
  archiveArtist,
  getArtist,
  getArtistBySlug,
  unarchiveArtist,
  updateArtist,
} from "@/lib/artists/repo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "artists.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const artist = await getArtist(id);
  if (!artist) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ artist });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "artists.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = artistPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getArtist(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.slug !== undefined && parsed.data.slug !== existing.slug) {
    const festival = await getActiveFestival(session);
    if (!festival)
      return Response.json({ error: "No festival" }, { status: 404 });
    const slugTaken = await getArtistBySlug(festival.id, parsed.data.slug);
    if (slugTaken && slugTaken.id !== id) {
      return Response.json(
        { error: "Slug already in use for this festival" },
        { status: 409 },
      );
    }
  }

  const updated = await updateArtist(id, toDbPatchValues(parsed.data));
  return Response.json({ artist: updated });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "artists.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "archive";

  if (action === "unarchive") {
    const row = await unarchiveArtist(id);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ artist: row });
  }

  const row = await archiveArtist(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ artist: row });
}
