import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import {
  contractInputSchema,
  contractStatusEnum,
  contractToDbValues,
} from "@/lib/contracts/schema";
import { createContract, listContracts } from "@/lib/contracts/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "contracts");
  if (denied) return denied;

  const edition = await getCurrentEdition();
  const url = new URL(req.url);
  const artistId = url.searchParams.get("artistId") ?? undefined;
  const statusRaw = url.searchParams.get("status") ?? undefined;
  const statusParsed = statusRaw ? contractStatusEnum.safeParse(statusRaw) : null;

  const rows = await listContracts({
    editionId: edition.id,
    artistId,
    status: statusParsed?.success ? statusParsed.data : undefined,
  });
  return Response.json({ contracts: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "contracts");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contractInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const edition = await getCurrentEdition();
  const created = await createContract(
    edition.id,
    contractToDbValues(parsed.data)
  );
  return Response.json({ contract: created }, { status: 201 });
}
