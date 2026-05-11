import { NextRequest } from "next/server";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { crewInputSchema, toDbValues } from "@/lib/crew/schema";
import {
  createCrewMember,
  listCrew,
  type ListCrewParams,
} from "@/lib/crew/repo";

export async function GET(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "crew");
  if (denied) return denied;

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const role = url.searchParams.get("role") ?? undefined;
  const archivedParam = url.searchParams.get("archived") ?? "active";
  const archived: ListCrewParams["archived"] =
    archivedParam === "archived" || archivedParam === "all"
      ? archivedParam
      : "active";

  const rows = await listCrew({
    festivalId: festival.id,
    search,
    role,
    archived,
  });
  return Response.json({ crew: rows });
}

export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(session, "crew");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = crewInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const festival = await getActiveFestival(session);
  if (!festival)
    return Response.json({ error: "No festival" }, { status: 404 });

  const created = await createCrewMember(festival.id, toDbValues(parsed.data));
  return Response.json({ crew: created }, { status: 201 });
}
