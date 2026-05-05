import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getCurrentEdition } from "@/lib/edition";
import {
  hotelBookingInputSchema,
  hotelBookingToDbValues,
  type HotelBookingStatus,
  type PersonKind,
} from "@/lib/hotels/schema";
import { createBooking, listBookings } from "@/lib/hotels/repo";

const VALID_STATUSES = new Set([
  "tentative",
  "booked",
  "checked_in",
  "checked_out",
  "no_show",
  "cancelled",
]);

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "hotels");
  if (denied) return denied;

  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotelId") ?? undefined;
  const roomBlockId = url.searchParams.get("roomBlockId") ?? undefined;
  const personKindRaw = url.searchParams.get("personKind") ?? undefined;
  const personKind: PersonKind | undefined =
    personKindRaw === "artist" || personKindRaw === "crew" ? personKindRaw : undefined;
  const personId = url.searchParams.get("personId") ?? undefined;
  const statusRaw = url.searchParams.get("status") ?? undefined;
  const status: HotelBookingStatus | undefined =
    statusRaw && VALID_STATUSES.has(statusRaw)
      ? (statusRaw as HotelBookingStatus)
      : undefined;
  const activeFrom = url.searchParams.get("activeFrom") ?? undefined;
  const activeTo = url.searchParams.get("activeTo") ?? undefined;

  // Default to current-edition scope unless caller passed roomBlockId or
  // an explicit "scope=all" override.
  const scope = url.searchParams.get("scope");
  let editionId: string | undefined;
  if (!roomBlockId && scope !== "all") {
    editionId = (await getCurrentEdition()).id;
  }

  const rows = await listBookings({
    editionId,
    hotelId,
    roomBlockId,
    personKind,
    personId,
    status,
    activeFrom,
    activeTo,
  });
  return Response.json({ bookings: rows });
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

  const parsed = hotelBookingInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await createBooking(hotelBookingToDbValues(parsed.data));
  return Response.json({ booking: created }, { status: 201 });
}
