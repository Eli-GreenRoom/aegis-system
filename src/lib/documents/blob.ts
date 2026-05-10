/**
 * Thin wrapper around `@vercel/blob` so route handlers don't import the
 * SDK directly. Mirrors the pattern in AGENT.md -6 ("never call SDK from
 * a React component"). Tests mock this module instead of @vercel/blob
 * so the upload + delete paths can be exercised without network.
 */

import { put, del, get } from "@vercel/blob";

export interface BlobUploadResult {
  /** Raw Blob URL. Stored server-side in `documents.url` only. */
  url: string;
  pathname: string;
}

/**
 * Upload bytes to private Blob storage. Filename is sanitised + prefixed
 * with `entityType/` so listings stay organised. The Blob SDK appends a
 * random suffix when `addRandomSuffix: true` (default).
 */
export async function uploadToBlob(
  pathname: string,
  body: ArrayBuffer | Buffer | Blob,
  contentType?: string,
): Promise<BlobUploadResult> {
  const result = await put(pathname, body, {
    access: "private",
    contentType,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}

/**
 * Fetch a private blob's stream. Returns null when the blob is missing
 * or unchanged (304). The route handler pipes this back to the client
 * after auth-checking.
 *
 * Note: the SDK types `headers` as undici `Headers`, not the global Web
 * `Headers` (per `node_modules/@vercel/blob/dist/index.d.ts`). We bridge
 * by iterating entries into a fresh Web `Headers` instance.
 */
export async function getBlobStream(url: string): Promise<{
  stream: ReadableStream<Uint8Array>;
  headers: Headers;
} | null> {
  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  const headers = new Headers();
  for (const [name, value] of result.headers.entries()) {
    headers.set(name, value);
  }
  return { stream: result.stream, headers };
}
