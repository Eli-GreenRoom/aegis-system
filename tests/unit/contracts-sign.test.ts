import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  FIXTURE_CONTRACT_ID,
  FIXTURE_ARTIST_ID,
  FIXTURE_EDITION_ID,
  fixtureContract,
} from "../fixtures/contracts";
import { fakeOwnerSession } from "../fixtures/session";

vi.mock("@/lib/session", () => ({
  getAppSession: vi.fn(),
  requirePermission: vi.fn(() => null),
}));

const FIXTURE_DOC_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FIXTURE_SIGNED_DOC_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const fixtureDoc = {
  id: FIXTURE_DOC_ID,
  workspaceId: fakeOwnerSession.workspaceId,
  entityType: "contract",
  entityId: FIXTURE_CONTRACT_ID,
  filename: "contract-draft.pdf",
  mimeType: "application/pdf",
  sizeBytes: 12345,
  url: "https://blob.example.com/contract-draft.pdf",
  uploadedBy: "u1",
  tags: ["contract", "draft"],
  createdAt: new Date("2026-04-01T00:00:00Z"),
};

vi.mock("@/lib/contracts/repo", () => ({
  getContract: vi.fn(async () => ({
    ...fixtureContract,
    fileUrl: `/api/documents/${FIXTURE_DOC_ID}`,
  })),
  updateContract: vi.fn(async (_id: string, input: unknown) => ({
    ...fixtureContract,
    fileUrl: `/api/documents/${FIXTURE_DOC_ID}`,
    status: "signed",
    signedAt: new Date(),
    signedFileUrl: `/api/documents/${FIXTURE_SIGNED_DOC_ID}`,
    ...(input as object),
  })),
}));

vi.mock("@/lib/documents/repo", () => ({
  getDocument: vi.fn(async () => fixtureDoc),
  createDocument: vi.fn(async () => ({
    ...fixtureDoc,
    id: FIXTURE_SIGNED_DOC_ID,
    filename: "contract-draft-signed.pdf",
    tags: ["contract", "signed"],
  })),
}));

vi.mock("@/lib/documents/blob", () => ({
  getBlobStream: vi.fn(async () => ({
    stream: new ReadableStream({
      start(controller) {
        // Minimal valid PDF bytes (1.0 header + empty xref)
        controller.enqueue(
          new TextEncoder().encode(
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF",
          ),
        );
        controller.close();
      },
    }),
    headers: new Headers({ "content-type": "application/pdf" }),
  })),
  uploadToBlob: vi.fn(async () => ({
    url: "https://blob.example.com/signed.pdf",
    pathname: "workspace/contract/signed.pdf",
  })),
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    load: vi.fn(async () => ({
      getPages: () => [
        {
          getSize: () => ({ width: 595, height: 842 }),
          drawImage: vi.fn(),
          drawText: vi.fn(),
          drawLine: vi.fn(),
        },
      ],
      embedPng: vi.fn(async () => ({ width: 200, height: 80 })),
      embedJpg: vi.fn(async () => ({ width: 200, height: 80 })),
      embedFont: vi.fn(async () => ({})),
      save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    })),
  },
  rgb: vi.fn(() => ({})),
  StandardFonts: { Helvetica: "Helvetica" },
}));

import * as session from "@/lib/session";
import * as repo from "@/lib/contracts/repo";
import * as docRepo from "@/lib/documents/repo";
import * as blob from "@/lib/documents/blob";
import { POST as signPOST } from "@/app/api/contracts/[id]/sign/route";

const mocks = {
  session: vi.mocked(session),
  repo: vi.mocked(repo),
  docRepo: vi.mocked(docRepo),
  blob: vi.mocked(blob),
};

function jsonReq(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const VALID_SIG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const ctx = { params: Promise.resolve({ id: FIXTURE_CONTRACT_ID }) };

beforeEach(() => {
  mocks.session.getAppSession.mockResolvedValue(fakeOwnerSession);
  mocks.session.requirePermission.mockReturnValue(null);
});

describe("POST /api/contracts/[id]/sign", () => {
  it("signs the contract and updates status to signed", async () => {
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {
        signatureDataUrl: VALID_SIG,
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contract.status).toBe("signed");
    expect(mocks.blob.uploadToBlob).toHaveBeenCalled();
    expect(mocks.docRepo.createDocument).toHaveBeenCalled();
    expect(mocks.repo.updateContract).toHaveBeenCalledWith(
      FIXTURE_CONTRACT_ID,
      expect.objectContaining({
        status: "signed",
        signedAt: expect.any(Date),
      }),
    );
  });

  it("401 when not authenticated", async () => {
    mocks.session.getAppSession.mockResolvedValueOnce(null);
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {
        signatureDataUrl: VALID_SIG,
      }),
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it("404 when contract not found", async () => {
    mocks.repo.getContract.mockResolvedValueOnce(null);
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {
        signatureDataUrl: VALID_SIG,
      }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("422 when contract has no draft file", async () => {
    mocks.repo.getContract.mockResolvedValueOnce({
      ...fixtureContract,
      fileUrl: null,
    });
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {
        signatureDataUrl: VALID_SIG,
      }),
      ctx,
    );
    expect(res.status).toBe(422);
  });

  it("400 on missing signatureDataUrl", async () => {
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {}),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("422 when fileUrl is not a system proxy URL", async () => {
    mocks.repo.getContract.mockResolvedValueOnce({
      ...fixtureContract,
      fileUrl: "https://external.example.com/contract.pdf",
    });
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {
        signatureDataUrl: VALID_SIG,
      }),
      ctx,
    );
    expect(res.status).toBe(422);
  });

  it("422 when document is not a PDF", async () => {
    mocks.docRepo.getDocument.mockResolvedValueOnce({
      ...fixtureDoc,
      mimeType: "image/jpeg",
    });
    const res = await signPOST(
      jsonReq("http://test/api/contracts/x/sign", {
        signatureDataUrl: VALID_SIG,
      }),
      ctx,
    );
    expect(res.status).toBe(422);
  });
});
