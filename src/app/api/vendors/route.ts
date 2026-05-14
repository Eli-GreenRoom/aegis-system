import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { vendorInputSchema, vendorToDbValues } from "@/lib/ground/schema";
import { createVendor, listVendors } from "@/lib/ground/repo";

export async function GET() {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground.view");
  if (denied) return denied;
  const rows = await listVendors();
  return Response.json({ vendors: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground.edit");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = vendorInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await createVendor(vendorToDbValues(parsed.data));
  return Response.json({ vendor: created }, { status: 201 });
}
