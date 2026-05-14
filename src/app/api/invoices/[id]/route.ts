import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import {
  invoicePatchSchema,
  invoiceToDbPatchValues,
} from "@/lib/payments/schema";
import {
  buildUpdateInvoice,
  deleteInvoice,
  getInvoice,
  updateInvoice,
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
  const row = await getInvoice(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ invoice: row });
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

  const parsed = invoicePatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getInvoice(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = invoiceToDbPatchValues(parsed.data);
  const statusChanged =
    "status" in patch &&
    patch.status !== undefined &&
    patch.status !== existing.status;

  if (statusChanged) {
    const [rows] = await db.batch([
      buildUpdateInvoice(id, patch),
      recordTransition(db, {
        actorId: session.user.id,
        entity: { type: "invoice", id },
        diff: { field: "status", from: existing.status, to: patch.status },
      }),
    ]);
    return Response.json({ invoice: rows[0] ?? null });
  }

  const updated = await updateInvoice(id, patch);
  return Response.json({ invoice: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "payments.edit");
  if (denied) return denied;

  const { id } = await ctx.params;
  const row = await deleteInvoice(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ invoice: row });
}
