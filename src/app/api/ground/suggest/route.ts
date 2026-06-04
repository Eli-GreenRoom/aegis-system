import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { suggestPickupsForPerson } from "@/lib/ground/suggest";
export type { SuggestedPickup } from "@/lib/ground/suggest";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "ground.view");
  if (denied) return denied;

  const { searchParams } = req.nextUrl;
  const personId = searchParams.get("personId");
  const personKind = searchParams.get("personKind");

  if (!personId || !personKind)
    return Response.json(
      { error: "personId and personKind are required" },
      { status: 400 },
    );
  if (personKind !== "artist" && personKind !== "crew")
    return Response.json({ error: "invalid personKind" }, { status: 400 });

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No active festival" }, { status: 404 });

  const result = await suggestPickupsForPerson(
    festival.id,
    personId,
    personKind,
    festival.groundArrivalBufferMins ?? 120,
  );

  return Response.json(result);
}
