import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import {
  guestCategoryEnum,
  guestlistInputSchema,
  guestlistToDbValues,
} from "@/lib/guestlist/schema";
import { createGuestlistEntry, listGuestlist } from "@/lib/guestlist/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "guestlist");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const categoryRaw = url.searchParams.get("category") ?? undefined;
  const categoryParsed = categoryRaw
    ? guestCategoryEnum.safeParse(categoryRaw)
    : null;
  const hostArtistId = url.searchParams.get("hostArtistId") ?? undefined;
  const day = url.searchParams.get("day") ?? undefined;
  const inviteSentRaw = url.searchParams.get("inviteSent");
  const inviteSent =
    inviteSentRaw === "true"
      ? true
      : inviteSentRaw === "false"
        ? false
        : undefined;
  const checkedInRaw = url.searchParams.get("checkedIn");
  const checkedIn =
    checkedInRaw === "true"
      ? true
      : checkedInRaw === "false"
        ? false
        : undefined;

  const rows = await listGuestlist({
    festivalId: festival.id,
    search,
    category: categoryParsed?.success ? categoryParsed.data : undefined,
    hostArtistId,
    day,
    inviteSent,
    checkedIn,
  });
  return Response.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "guestlist");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = guestlistInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const created = await createGuestlistEntry(
    festival.id,
    guestlistToDbValues(parsed.data),
  );
  return Response.json({ entry: created }, { status: 201 });
}
