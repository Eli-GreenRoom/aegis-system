import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { teamMembers, workspaces } from "@/db/schema";
import { ROLE_LABELS } from "@/lib/permissions";
import { AcceptInviteForm } from "./_components/AcceptInviteForm";

interface PageProps {
  params: Promise<{ token: string }>;
}

function ErrorShell({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-3">
          GreenRoom Stages
        </div>
        <p className="text-sm text-[--color-fg-muted]">{message}</p>
      </div>
    </main>
  );
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.inviteToken, token),
        eq(teamMembers.status, "pending"),
      ),
    )
    .limit(1);

  if (!member) {
    return <ErrorShell message="Invite not found or already used." />;
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, member.workspaceId))
    .limit(1);

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (session?.user) {
    if (session.user.email !== member.email) {
      return (
        <ErrorShell message="This invite was sent to a different email address." />
      );
    }
    // Email matches — show accept UI.
    return (
      <AcceptInviteForm
        token={token}
        workspaceName={workspace?.name ?? "your workspace"}
        role={ROLE_LABELS[member.role] ?? member.role}
      />
    );
  }

  // No session — send to sign-in with return path.
  redirect(
    `/sign-in?invite=${token}&email=${encodeURIComponent(member.email)}`,
  );
}
