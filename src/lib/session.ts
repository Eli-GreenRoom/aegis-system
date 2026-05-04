/**
 * Session helper used by every protected API route + server action.
 * Wraps better-auth so the rest of the app gets a single, typed shape.
 *
 * Phase 1: returns a stub. Wire up better-auth in Phase 1 task #2.
 */

export type AppRole = "owner" | "coordinator" | "viewer";

export interface AppSession {
  user: { id: string; email: string; name: string | null };
  ownerId: string;
  isOwner: boolean;
  role: AppRole;
  permissions: Record<string, boolean>;
}

export async function getAppSession(): Promise<AppSession | null> {
  // TODO: wire to better-auth in Phase 1.
  // import { auth } from "@/lib/auth";
  // const session = await auth.api.getSession({ headers: ... });
  return null;
}

export async function requireSession(): Promise<AppSession> {
  const s = await getAppSession();
  if (!s) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return s;
}
