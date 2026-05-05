import { NextRequest } from "next/server";
import { getAppSession } from "@/lib/session";
import {
  deleteDocument,
  getDocument,
} from "@/lib/documents/repo";
import { deleteFromBlob, getBlobStream } from "@/lib/documents/blob";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]
 * Auth-checks, then streams the file back. Multi-tenant boundary: a
 * document's ownerId must match the session ownerId. Anything else is
 * a 404 (not 403 - we don't leak existence across tenants).
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc || doc.ownerId !== session.ownerId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const blob = await getBlobStream(doc.url);
  if (!blob) {
    return Response.json({ error: "Blob unavailable" }, { status: 502 });
  }

  // Stream back with content-type from blob storage if present, falling
  // back to the row's recorded mime. Set inline disposition with the
  // stored filename so browsers preview rather than auto-download.
  const headers = new Headers();
  const blobType = blob.headers.get("content-type");
  headers.set(
    "content-type",
    blobType ?? doc.mimeType ?? "application/octet-stream"
  );
  headers.set(
    "content-disposition",
    `inline; filename="${doc.filename.replace(/"/g, "")}"`
  );
  // Don't let intermediaries cache. Documents are private.
  headers.set("cache-control", "private, max-age=0, no-store");

  return new Response(blob.stream, { status: 200, headers });
}

/**
 * DELETE /api/documents/[id]
 * Removes both the Blob object and the documents row. The parent
 * entity's URL column still points at this document's proxy URL after
 * deletion - callers must clear it separately. (Intentional: lets you
 * re-upload + repoint without dangling references.)
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc || doc.ownerId !== session.ownerId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from Blob first; if that fails, the row stays so we can retry.
  // If the row delete fails after Blob success, we have an orphaned blob
  // until garbage collection - acceptable trade-off vs dangling refs.
  try {
    await deleteFromBlob(doc.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Blob delete failed";
    return Response.json(
      { error: `Couldn't delete blob: ${message}` },
      { status: 502 }
    );
  }

  await deleteDocument(id);
  return Response.json({ ok: true });
}
