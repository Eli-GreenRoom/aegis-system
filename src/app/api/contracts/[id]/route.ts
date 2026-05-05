import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import {
  contractPatchSchema,
  contractToDbPatchValues,
} from "@/lib/contracts/schema";
import {
  buildUpdateContract,
  deleteContract,
  getContract,
  updateContract,
} from "@/lib/contracts/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "contracts");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getContract(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ contract: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "contracts");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contractPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await getContract(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = contractToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch && patch.status !== undefined && patch.status !== existing.status;

  if (statusChanged) {
    // Auto-stamp sentAt on draft -> sent and signedAt on sent -> signed
    // when the patch hasn't already provided one. Same trust-the-clock
    // pattern as payments paidAt and pickup transition timestamps.
    const finalPatch = { ...patch };
    if (patch.status === "sent" && !("sentAt" in patch) && !existing.sentAt) {
      finalPatch.sentAt = new Date();
    }
    if (patch.status === "signed" && !("signedAt" in patch) && !existing.signedAt) {
      finalPatch.signedAt = new Date();
    }

    const [rows] = await db.batch([
      buildUpdateContract(id, finalPatch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "contract", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ contract: rows[0] ?? null });
  }

  const updated = await updateContract(id, patch);
  return Response.json({ contract: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "contracts");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteContract(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ contract: row });
}
