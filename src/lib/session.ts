/**
 * Session helper used by every protected API route + server action.
 * Wraps better-auth so the rest of the app gets a single, typed shape.
 *
 * Use `getAppSession()` in server components (it reads next/headers).
 * Use `getAppSession(req.headers)` in API routes.
 */

import { headers as nextHeaders } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";

/** The single email address that resolves to the festival owner. */
export const OWNER_EMAIL = "booking@aegisfestival.com";

export type AppRole = "owner" | "coordinator" | "viewer";

export interface AppSession {
  user: { id: string; email: string; name: string | null };
  ownerId: string;
  isOwner: boolean;
  role: AppRole;
  permissions: Record<string, boolean>;
}

const ALL_PERMS: Record<string, boolean> = {
  artists: true,
  crew: true,
  lineup: true,
  flights: true,
  hotels: true,
  ground: true,
  riders: true,
  contracts: true,
  payments: true,
  guestlist: true,
  documents: true,
  settings: true,
};

const COORDINATOR_PERMS: Record<string, boolean> = {
  ...ALL_PERMS,
  payments: false,
  settings: false,
};

const VIEWER_PERMS: Record<string, boolean> = Object.fromEntries(
  Object.keys(ALL_PERMS).map((k) => [k, false]),
);

function permsForRole(role: AppRole): Record<string, boolean> {
  if (role === "owner") return ALL_PERMS;
  if (role === "coordinator") return COORDINATOR_PERMS;
  return VIEWER_PERMS;
}

export async function getAppSession(
  reqHeaders?: Headers,
): Promise<AppSession | null> {
  const h = reqHeaders ?? (await nextHeaders());
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;

  const userId = session.user.id;
  const email = session.user.email;
  const name = session.user.name ?? null;

  // Owner shortcut: hardcoded email is always the owner.
  if (email === OWNER_EMAIL) {
    return {
      user: { id: userId, email, name },
      ownerId: userId,
      isOwner: true,
      role: "owner",
      permissions: ALL_PERMS,
    };
  }

  // Otherwise look up team membership.
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active")),
    )
    .limit(1);

  if (!member) {
    // Authenticated but not the owner and not on any team - treated as viewer
    // with no perms. Safer than denying outright; route handlers still gate
    // via requirePermission().
    return {
      user: { id: userId, email, name },
      ownerId: userId,
      isOwner: false,
      role: "viewer",
      permissions: VIEWER_PERMS,
    };
  }

  const role = member.role as AppRole;
  const overrides = (member.permissions ?? {}) as Record<string, boolean>;

  return {
    user: { id: userId, email, name },
    ownerId: member.ownerId,
    isOwner: false,
    role,
    permissions: { ...permsForRole(role), ...overrides },
  };
}

export async function requireSession(
  reqHeaders?: Headers,
): Promise<AppSession> {
  const s = await getAppSession(reqHeaders);
  if (!s) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return s;
}

export function requirePermission(
  session: AppSession,
  key: string,
): Response | null {
  if (!session.permissions[key]) {
    return Response.json(
      { error: "Forbidden: you don't have permission to do this." },
      { status: 403 },
    );
  }
  return null;
}

export function requireOwner(session: AppSession): Response | null {
  if (!session.isOwner) {
    return Response.json(
      { error: "Forbidden: only the owner can do this." },
      { status: 403 },
    );
  }
  return null;
}
