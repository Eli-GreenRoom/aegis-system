import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getAppSession } from "@/lib/session";
import { getFestival } from "@/lib/festivals";

const BodySchema = z.object({ festivalId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const session = await getAppSession(req.headers);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const festival = await getFestival(
    parsed.data.festivalId,
    session.workspaceId,
  );
  if (!festival) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_festival_id", festival.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
