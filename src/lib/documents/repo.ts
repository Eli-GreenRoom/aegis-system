import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

export type Document = typeof documents.$inferSelect;

export interface CreateDocumentInput {
  ownerId: string;
  entityType: string;
  entityId: string | null;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** Raw Blob URL. Stays server-side; clients only see the proxy URL. */
  url: string;
  uploadedBy: string;
  tags: string[] | null;
}

export interface ListDocumentsParams {
  ownerId: string;
  entityType?: string;
  entityId?: string;
}

export async function listDocuments({
  ownerId,
  entityType,
  entityId,
}: ListDocumentsParams): Promise<Document[]> {
  const filters = [eq(documents.ownerId, ownerId)];
  if (entityType) filters.push(eq(documents.entityType, entityType));
  if (entityId) filters.push(eq(documents.entityId, entityId));

  return db
    .select()
    .from(documents)
    .where(and(...filters))
    .orderBy(desc(documents.createdAt), asc(documents.filename));
}

export async function getDocument(id: string): Promise<Document | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return row ?? null;
}

export async function createDocument(
  input: CreateDocumentInput
): Promise<Document> {
  const [row] = await db.insert(documents).values(input).returning();
  return row;
}

export async function deleteDocument(id: string): Promise<Document | null> {
  const [row] = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning();
  return row ?? null;
}
