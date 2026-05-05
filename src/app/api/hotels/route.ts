import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { hotelInputSchema, hotelToDbValues } from "@/lib/hotels/schema";
import { createHotel, listHotels } from "@/lib/hotels/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels");
  if (denied) return denied;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const rows = await listHotels({ search });
  return Response.json({ hotels: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = hotelInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await createHotel(hotelToDbValues(parsed.data));
  return Response.json({ hotel: created }, { status: 201 });
}
