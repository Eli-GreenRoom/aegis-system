import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_ARTIST_ID,
  FIXTURE_DOC_ID,
  fixtureDocument,
} from "../fixtures/documents";
import { fakeOwnerSession, FIXTURE_WORKSPACE_ID } from "../fixtures/session";

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

vi.mock("@/db/client", () => ({
  db: { batch: vi.fn() },
  schema: {},
}));

vi.mock("@/lib/documents/blob", () => ({
  uploadToBlob: vi.fn(async (pathname: string) => ({
    url: `https://blob.vercel-storage.example/${pathname}-randomsuffix.pdf`,
    pathname,
  })),
  deleteFromBlob: vi.fn(async () => {}),
  getBlobStream: vi.fn(async () => ({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("PDF"));
        controller.close();
      },
    }),
    headers: new Headers({ "content-type": "application/pdf" }),
  })),
}));

vi.mock("@/lib/documents/repo", () => ({
  listDocuments: vi.fn(async () => [fixtureDocument]),
  getDocument: vi.fn(async () => fixtureDocument),
  createDocument: vi.fn(async (input) => ({
    ...fixtureDocument,
    ...input,
    id: FIXTURE_DOC_ID,
    createdAt: new Date(),
  })),
  deleteDocument: vi.fn(async () => fixtureDocument),
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/documents/repo";
import * as blob from "@/lib/documents/blob";
import { GET as listGET, POST as createPOST } from "@/app/api/documents/route";
import {
  GET as oneGET,
  DELETE as oneDELETE,
} from "@/app/api/documents/[id]/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
  blob: vi.mocked(blob),
};

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeOwnerSession);
  mocks.blob.uploadToBlob.mockClear();
  mocks.blob.deleteFromBlob.mockClear();
  mocks.repo.createDocument.mockClear();
  mocks.repo.deleteDocument.mockClear();
});

function multipartReq(
  url: string,
  fields: Record<string, string>,
  file?: { name: string; type: string; bytes: Uint8Array | string },
): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (file) {
    // Cast to BlobPart - Uint8Array's typed buffer can be SharedArrayBuffer
    // in TS lib.dom but at runtime it's always ArrayBuffer for our cases.
    const part: BlobPart =
      typeof file.bytes === "string"
        ? file.bytes
        : (file.bytes as unknown as BlobPart);
    const blob = new Blob([part], { type: file.type });
    form.append("file", new File([blob], file.name, { type: file.type }));
  }
  return new NextRequest(url, { method: "POST", body: form });
}

// ── GET /api/documents ──────────────────────────────────────────────────

describe("GET /api/documents", () => {
  it("returns the calling owner's documents", async () => {
    const res = await listGET(
      new NextRequest("http://test/api/documents", { method: "GET" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].proxyUrl).toBe(`/api/documents/${FIXTURE_DOC_ID}`);
    // Raw blob URL is NOT exposed in the listing.
    expect(body.documents[0]).not.toHaveProperty("url");
    expect(mocks.repo.listDocuments).toHaveBeenCalledWith({
      workspaceId: FIXTURE_WORKSPACE_ID,
      entityType: undefined,
      entityId: undefined,
    });
  });

  it("threads entityType + entityId filters", async () => {
    await listGET(
      new NextRequest(
        `http://test/api/documents?entityType=artist&entityId=${FIXTURE_ARTIST_ID}`,
        { method: "GET" },
      ),
    );
    expect(mocks.repo.listDocuments).toHaveBeenCalledWith({
      workspaceId: FIXTURE_WORKSPACE_ID,
      entityType: "artist",
      entityId: FIXTURE_ARTIST_ID,
    });
  });

  it("ignores invalid entityType silently", async () => {
    await listGET(
      new NextRequest("http://test/api/documents?entityType=teleported", {
        method: "GET",
      }),
    );
    expect(mocks.repo.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: undefined }),
    );
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await listGET(
      new NextRequest("http://test/api/documents", { method: "GET" }),
    );
    expect(res.status).toBe(401);
  });
});

// ── POST /api/documents ─────────────────────────────────────────────────

describe("POST /api/documents", () => {
  const PDF_BYTES = new TextEncoder().encode("%PDF-1.4 fake pdf body");

  it("uploads a file and stores a documents row", async () => {
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist", entityId: FIXTURE_ARTIST_ID, tags: "passport" },
        { name: "passport.pdf", type: "application/pdf", bytes: PDF_BYTES },
      ),
    );
    expect(res.status).toBe(201);
    expect(mocks.blob.uploadToBlob).toHaveBeenCalledWith(
      `${FIXTURE_WORKSPACE_ID}/artist/passport.pdf`,
      expect.any(ArrayBuffer),
      "application/pdf",
    );
    expect(mocks.repo.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: FIXTURE_WORKSPACE_ID,
        entityType: "artist",
        entityId: FIXTURE_ARTIST_ID,
        filename: "passport.pdf",
        mimeType: "application/pdf",
        sizeBytes: PDF_BYTES.byteLength,
        tags: ["passport"],
        uploadedBy: "u1",
      }),
    );
    const body = await res.json();
    expect(body.document.proxyUrl).toBe(`/api/documents/${FIXTURE_DOC_ID}`);
  });

  it("sanitises slashes in filenames", async () => {
    await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist" },
        {
          name: "../../etc/passwd",
          type: "application/pdf",
          bytes: PDF_BYTES,
        },
      ),
    );
    const blobCall = mocks.blob.uploadToBlob.mock.calls.at(-1);
    expect(blobCall?.[0]).toBe(
      `${FIXTURE_WORKSPACE_ID}/artist/.._.._etc_passwd`,
    );
    const repoCall = mocks.repo.createDocument.mock.calls.at(-1);
    expect(repoCall?.[0].filename).toBe(".._.._etc_passwd");
  });

  it("400 missing file", async () => {
    const res = await createPOST(
      multipartReq("http://test/api/documents", { entityType: "artist" }),
    );
    expect(res.status).toBe(400);
  });

  it("400 missing entityType", async () => {
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        {},
        { name: "x.pdf", type: "application/pdf", bytes: PDF_BYTES },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 invalid entityType", async () => {
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "teleported" },
        { name: "x.pdf", type: "application/pdf", bytes: PDF_BYTES },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 wrong content-type (not multipart)", async () => {
    const res = await createPOST(
      new NextRequest("http://test/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"entityType":"artist"}',
      }),
    );
    expect(res.status).toBe(400);
  });

  it("415 unsupported mime type", async () => {
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist" },
        { name: "x.exe", type: "application/x-msdownload", bytes: PDF_BYTES },
      ),
    );
    expect(res.status).toBe(415);
  });

  it("400 empty file", async () => {
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist" },
        { name: "x.pdf", type: "application/pdf", bytes: new Uint8Array(0) },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("502 when blob upload fails", async () => {
    mocks.blob.uploadToBlob.mockRejectedValueOnce(new Error("network down"));
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist" },
        { name: "x.pdf", type: "application/pdf", bytes: PDF_BYTES },
      ),
    );
    expect(res.status).toBe(502);
    expect(mocks.repo.createDocument).not.toHaveBeenCalled();
  });

  it("accepts image/* mime types", async () => {
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "payment", tags: "pop" },
        {
          name: "receipt.jpg",
          type: "image/jpeg",
          bytes: new Uint8Array([0xff, 0xd8, 0xff]),
        },
      ),
    );
    expect(res.status).toBe(201);
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist" },
        { name: "x.pdf", type: "application/pdf", bytes: PDF_BYTES },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("parses tags as comma-separated", async () => {
    await createPOST(
      multipartReq(
        "http://test/api/documents",
        { entityType: "artist", tags: "passport, visa, scanned" },
        { name: "x.pdf", type: "application/pdf", bytes: PDF_BYTES },
      ),
    );
    const call = mocks.repo.createDocument.mock.calls.at(-1);
    expect(call?.[0].tags).toEqual(["passport", "visa", "scanned"]);
  });
});

// ── GET /api/documents/[id] ─────────────────────────────────────────────

describe("GET /api/documents/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_DOC_ID }) };

  it("streams the file with correct content-type + disposition", async () => {
    const res = await oneGET(
      new NextRequest("http://test/api/documents/x", { method: "GET" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("passport.pdf");
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    expect(mocks.blob.getBlobStream).toHaveBeenCalledWith(fixtureDocument.url);
  });

  it("404 when doc missing", async () => {
    mocks.repo.getDocument.mockResolvedValueOnce(null);
    const res = await oneGET(
      new NextRequest("http://test/api/documents/missing", { method: "GET" }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("404 (not 403) when doc belongs to a different owner", async () => {
    mocks.repo.getDocument.mockResolvedValueOnce({
      ...fixtureDocument,
      workspaceId: "different-workspace",
    });
    const res = await oneGET(
      new NextRequest("http://test/api/documents/x", { method: "GET" }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(mocks.blob.getBlobStream).not.toHaveBeenCalled();
  });

  it("502 when blob unavailable", async () => {
    mocks.blob.getBlobStream.mockResolvedValueOnce(null);
    const res = await oneGET(
      new NextRequest("http://test/api/documents/x", { method: "GET" }),
      ctx,
    );
    expect(res.status).toBe(502);
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneGET(
      new NextRequest("http://test/api/documents/x", { method: "GET" }),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/documents/[id] ──────────────────────────────────────────

describe("DELETE /api/documents/[id]", () => {
  const ctx = { params: Promise.resolve({ id: FIXTURE_DOC_ID }) };

  it("deletes blob then row", async () => {
    const res = await oneDELETE(
      new NextRequest("http://test/api/documents/x", { method: "DELETE" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(mocks.blob.deleteFromBlob).toHaveBeenCalledWith(fixtureDocument.url);
    expect(mocks.repo.deleteDocument).toHaveBeenCalledWith(FIXTURE_DOC_ID);
    // Order matters - blob first, row second.
    const blobCallOrder = mocks.blob.deleteFromBlob.mock.invocationCallOrder[0];
    const rowCallOrder = mocks.repo.deleteDocument.mock.invocationCallOrder[0];
    expect(blobCallOrder).toBeLessThan(rowCallOrder);
  });

  it("502 when blob delete fails - row stays", async () => {
    mocks.blob.deleteFromBlob.mockRejectedValueOnce(new Error("blob 500"));
    const res = await oneDELETE(
      new NextRequest("http://test/api/documents/x", { method: "DELETE" }),
      ctx,
    );
    expect(res.status).toBe(502);
    expect(mocks.repo.deleteDocument).not.toHaveBeenCalled();
  });

  it("404 when doc missing", async () => {
    mocks.repo.getDocument.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      new NextRequest("http://test/api/documents/missing", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
    expect(mocks.blob.deleteFromBlob).not.toHaveBeenCalled();
  });

  it("404 across tenants", async () => {
    mocks.repo.getDocument.mockResolvedValueOnce({
      ...fixtureDocument,
      workspaceId: "different-workspace",
    });
    const res = await oneDELETE(
      new NextRequest("http://test/api/documents/x", { method: "DELETE" }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(mocks.blob.deleteFromBlob).not.toHaveBeenCalled();
  });

  it("401 unauth", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await oneDELETE(
      new NextRequest("http://test/api/documents/x", { method: "DELETE" }),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
