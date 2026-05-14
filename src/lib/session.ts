/**
 * Session helper used by every protected API route + server action.
 * Wraps better-auth so the rest of the app gets a single, typed shape.
 *
 * Use `getAppSession()` in server components (it reads next/headers).
 * Use `getAppSession(req.headers)` in API routes.
 *
 * Phase 0: dropped OWNER_EMAIL shortcut. Session is now resolved via
 * team_members.workspaceId. A user with no active team_member row gets null
 * (-> 401/403 from any data API). The `ownerId` field is kept as a bridge
 * alias for workspaceId so existing route files continue to compile; it
 * will be swept in Phase 1.
 */

import { headers as nextHeaders } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import {
  resolvePermissions,
  type PermissionMap,
  type PermissionOverrides,
} from "@/lib/permissions";

export type AppRole = "owner" | "admin" | "member" | "viewer";

export interface AppSession {
  user: { id: string; email: string; name: string | null };
  workspaceId: string;
  memberId: string;
  role: AppRole;
  permissions: PermissionMap;
  /** @deprecated use workspaceId. Removed in Phase 1 sweep. */
  ownerId: string;
}

export async function getAppSession(
  reqHeaders?: Headers,
): Promise<AppSession | null> {
  const h = reqHeaders ?? (await nextHeaders());

  let session;
  try {
    session = await auth.api.getSession({ headers: h });
  } catch {
    // Transient DB connection error (ECONNRESET etc.) — treat as unauthenticated
    // so callers get a clean 401 rather than an unhandled 500.
    return null;
  }

  if (!session?.user) return null;

  const userId = session.user.id;
  const email = session.user.email;
  const name = session.user.name ?? null;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active")),
    )
    .limit(1);

  if (!member) return null;

  const role = member.role as AppRole;
  const overrides = (member.permissions ?? {}) as PermissionOverrides;
  const permissions = resolvePermissions(role, overrides);

  return {
    user: { id: userId, email, name },
    workspaceId: member.workspaceId,
    memberId: member.id,
    role,
    permissions,
    ownerId: member.workspaceId,
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
  if (!session.permissions[key as keyof PermissionMap]) {
    return Response.json(
      { error: "Forbidden: you don't have permission to do this." },
      { status: 403 },
    );
  }
  return null;
}

export function requireOwner(session: AppSession): Response | null {
  if (session.role !== "owner") {
    return Response.json(
      { error: "Forbidden: only the workspace owner can do this." },
      { status: 403 },
    );
  }
  return null;
}
