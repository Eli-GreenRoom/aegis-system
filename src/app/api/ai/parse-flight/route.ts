import { NextRequest } from "next/server";
import { z } from "zod";
import { getAppSession, requirePermission } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { parseFlightText } from "@/lib/ai/parse-flight";

const inputSchema = z.object({
  text: z.string().min(20).max(50_000),
});

/**
 * POST /api/ai/parse-flight
 * Body: `{ text: string }`. Returns the parsed structured JSON (see
 * ParsedFlight). Operator reviews, then submits the regular flight
 * form to write to DB.
 *
 * Spec: AGENT.md -6.
 */
export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requirePermission(session, "flights.edit");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const festival = await getActiveFestival(session);
    const result = await parseFlightText(parsed.data.text, festival?.location);
    return Response.json({ parsed: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
