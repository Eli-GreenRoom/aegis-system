import type { Document } from "@/lib/documents/repo";
import { FIXTURE_WORKSPACE_ID } from "./session";

export const FIXTURE_DOC_ID = "14141414-1414-4141-8141-141414141414";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";

export const fixtureDocument: Document = {
  id: FIXTURE_DOC_ID,
  workspaceId: FIXTURE_WORKSPACE_ID,
  entityType: "artist",
  entityId: FIXTURE_ARTIST_ID,
  filename: "passport.pdf",
  mimeType: "application/pdf",
  sizeBytes: 12345,
  url: "https://blob.vercel-storage.example/u1/artist/passport-abc.pdf",
  uploadedBy: "u1",
  tags: ["passport"],
  createdAt: new Date("2026-04-01T00:00:00Z"),
};
