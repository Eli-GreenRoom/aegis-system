import { NextRequest } from "next/server";
import { getAppSession } from "@/lib/session";
import {
  documentEntityTypeEnum,
  documentUploadMetadataSchema,
  isAllowedMimeType,
  MAX_FILE_SIZE_BYTES,
  toDisplay,
} from "@/lib/documents/schema";
import { createDocument, listDocuments } from "@/lib/documents/repo";
import { uploadToBlob } from "@/lib/documents/blob";

/**
 * Sanitise a user-supplied filename for use as a Blob pathname segment.
 * Strips path separators + non-printable bytes; falls back to "file" if
 * the input collapses to empty.
 */
function sanitiseFilename(raw: string): string {
  const cleaned = raw
    .replace(/[\\/]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : "file";
}

/**
 * GET /api/documents?entityType=...&entityId=...
 * Lists documents for the calling owner, optionally scoped to an entity.
 * Returns proxy URLs only; raw Blob URLs stay server-side.
 */
export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const entityTypeRaw = url.searchParams.get("entityType") ?? undefined;
  const entityTypeParsed = entityTypeRaw
    ? documentEntityTypeEnum.safeParse(entityTypeRaw)
    : null;
  const entityId = url.searchParams.get("entityId") ?? undefined;

  const rows = await listDocuments({
    workspaceId: session.workspaceId,
    entityType: entityTypeParsed?.success ? entityTypeParsed.data : undefined,
    entityId,
  });

  return Response.json({ documents: rows.map(toDisplay) });
}

/**
 * POST /api/documents
 * Multipart upload: `file` (required), `entityType` (required),
 * `entityId` (optional uuid), `tags` (optional comma-separated string).
 *
 * Returns the document row (with proxy URL) on success. The caller then
 * stores `proxyUrl` in the parent entity's URL column.
 */
export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return Response.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json(
      { error: `File too large (max ${MAX_FILE_SIZE_BYTES} bytes)` },
      { status: 413 },
    );
  }
  if (file.type && !isAllowedMimeType(file.type)) {
    return Response.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 415 },
    );
  }

  const tagsRaw = form.get("tags");
  const tags =
    typeof tagsRaw === "string" && tagsRaw.length > 0
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : undefined;

  const metaParsed = documentUploadMetadataSchema.safeParse({
    entityType: form.get("entityType"),
    entityId: form.get("entityId") || undefined,
    tags,
  });
  if (!metaParsed.success) {
    return Response.json(
      { error: "Validation failed", issues: metaParsed.error.flatten() },
      { status: 400 },
    );
  }
  const meta = metaParsed.data;

  const safeName = sanitiseFilename(file.name);
  const pathname = `${session.workspaceId}/${meta.entityType}/${safeName}`;

  let blob;
  try {
    blob = await uploadToBlob(pathname, await file.arrayBuffer(), file.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json(
      { error: `Blob upload failed: ${message}` },
      { status: 502 },
    );
  }

  const created = await createDocument({
    workspaceId: session.workspaceId,
    entityType: meta.entityType,
    entityId: meta.entityId ?? null,
    filename: safeName,
    mimeType: file.type || null,
    sizeBytes: file.size,
    url: blob.url,
    uploadedBy: session.user.id,
    tags: meta.tags ?? null,
  });

  return Response.json({ document: toDisplay(created) }, { status: 201 });
}
