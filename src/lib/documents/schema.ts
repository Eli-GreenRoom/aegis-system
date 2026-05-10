import { z } from "zod";

/**
 * Documents are uploads (PDFs, images) attached to other entities for an
 * audit-trailed file archive. The `documents` row tracks who uploaded
 * what, when, and how big; the actual bytes live in Vercel Blob with
 * `access: 'private'`. Clients only ever see the proxy URL
 * `/api/documents/[id]` which auth-checks before streaming.
 *
 * Spec: AGENT.md -6 + -8.
 */

export const documentEntityTypeEnum = z.enum([
  "artist",
  "crew",
  "flight",
  "pickup",
  "set",
  "contract",
  "payment",
  "invoice",
  "rider",
  "hotel_booking",
]);
export type DocumentEntityType = z.infer<typeof documentEntityTypeEnum>;

/**
 * Multipart upload metadata (sent alongside the file). Tags are free-form
 * strings used to surface intent ("passport", "ticket", "pop", "rider-hosp").
 */
export const documentUploadMetadataSchema = z.object({
  entityType: documentEntityTypeEnum,
  entityId: z.string().uuid().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
});
export type DocumentUploadMetadata = z.infer<
  typeof documentUploadMetadataSchema
>;

/** Fields safe to expose to API clients. Internal `url` (raw Blob URL) stays server-side. */
export interface DocumentDisplay {
  id: string;
  entityType: string;
  entityId: string | null;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  tags: string[] | null;
  createdAt: Date;
  /** Proxy URL the client uses to fetch the file. Auth-gated. */
  proxyUrl: string;
}

/** Convert a documents-table row to a DocumentDisplay. */
export function toDisplay(row: {
  id: string;
  entityType: string;
  entityId: string | null;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  tags: unknown;
  createdAt: Date;
}): DocumentDisplay {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : null,
    createdAt: row.createdAt,
    proxyUrl: `/api/documents/${row.id}`,
  };
}

/** Build the proxy URL from a doc id. Used by upload responses + form fields. */
export function proxyUrlFor(id: string): string {
  return `/api/documents/${id}`;
}

/** Server-internal: parse a proxy URL back to a doc id. */
export function idFromProxyUrl(url: string): string | null {
  const m = url.match(/^\/api\/documents\/([0-9a-f-]{36})$/i);
  return m ? m[1] : null;
}

/**
 * Limits. Anything bigger than 25MB is almost certainly the wrong file -
 * passport scans, contracts, invoices, riders all fit comfortably under
 * this. Catches accidental video uploads.
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_PREFIXES = ["application/pdf", "image/"] as const;

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}
