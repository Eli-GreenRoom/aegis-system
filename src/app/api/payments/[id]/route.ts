import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import {
  paymentPatchSchema,
  paymentToDbPatchValues,
} from "@/lib/payments/schema";
import {
  buildUpdatePayment,
  deletePayment,
  getPayment,
  updatePayment,
} from "@/lib/payments/repo";
import { db } from "@/db/client";
import { recordTransition } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await getPayment(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ payment: row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.edit");
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = paymentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getPayment(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = paymentToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch &&
    patch.status !== undefined &&
    patch.status !== existing.status;

  if (statusChanged) {
    // Auto-stamp paidAt when transitioning into paid (server clock - the
    // operator typing isn't trusted, same pattern as flight landed and
    // pickup dispatched timestamps).
    const finalPatch = { ...patch };
    if (patch.status === "paid" && !("paidAt" in patch)) {
      finalPatch.paidAt = new Date();
    }

    const [rows] = await db.batch([
      buildUpdatePayment(id, finalPatch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "payment", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ payment: rows[0] ?? null });
  }

  const updated = await updatePayment(id, patch);
  return Response.json({ payment: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deletePayment(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ payment: row });
}
