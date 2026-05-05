import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contracts } from "@/db/schema";
import type { ContractDbValues, ContractStatus } from "./schema";

export type Contract = typeof contracts.$inferSelect;

export interface ListContractsParams {
  editionId: string;
  artistId?: string;
  status?: ContractStatus;
}

export async function listContracts({
  editionId,
  artistId,
  status,
}: ListContractsParams): Promise<Contract[]> {
  const filters = [eq(contracts.editionId, editionId)];
  if (artistId) filters.push(eq(contracts.artistId, artistId));
  if (status) filters.push(eq(contracts.status, status));

  return db
    .select()
    .from(contracts)
    .where(and(...filters))
    .orderBy(desc(contracts.createdAt));
}

export async function listContractsForArtist(
  artistId: string
): Promise<Contract[]> {
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.artistId, artistId))
    .orderBy(asc(contracts.createdAt));
}

export async function getContract(id: string): Promise<Contract | null> {
  const [row] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createContract(
  editionId: string,
  input: ContractDbValues
): Promise<Contract> {
  const [row] = await db
    .insert(contracts)
    .values({ ...input, editionId })
    .returning();
  return row;
}

export async function updateContract(
  id: string,
  input: Partial<ContractDbValues>
): Promise<Contract | null> {
  if (Object.keys(input).length === 0) return getContract(id);
  const [row] = await db
    .update(contracts)
    .set(input)
    .where(eq(contracts.id, id))
    .returning();
  return row ?? null;
}

/** Unawaited update builder for use inside `db.batch([..., recordTransition])`. */
export function buildUpdateContract(
  id: string,
  input: Partial<ContractDbValues>
) {
  return db
    .update(contracts)
    .set(input)
    .where(eq(contracts.id, id))
    .returning();
}

export async function deleteContract(id: string): Promise<Contract | null> {
  const [row] = await db
    .delete(contracts)
    .where(eq(contracts.id, id))
    .returning();
  return row ?? null;
}
