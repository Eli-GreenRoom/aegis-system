export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { db } from "@/db/client";
import { workspaces, teamMembers } from "@/db/schema";
import { SettingsTabs } from "./_components/SettingsTabs";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, session.workspaceId))
    .limit(1);

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.workspaceId, session.workspaceId))
    .orderBy(asc(teamMembers.createdAt));

  const subtitle = festival
    ? `${festival.name} — ${festival.startDate} to ${festival.endDate}`
    : undefined;

  return (
    <>
      <Topbar title="Settings" subtitle={subtitle} />
      <SettingsTabs
        workspaceId={session.workspaceId}
        workspaceName={workspace?.name ?? ""}
        festivalName={festival?.name}
        role={session.role}
        memberId={session.memberId}
        permissions={session.permissions}
        members={members.map((m) => ({
          id: m.id,
          email: m.email,
          name: m.name,
          role: m.role,
          status: m.status,
          inviteToken: m.inviteToken,
          acceptedAt: m.acceptedAt,
        }))}
      />
    </>
  );
}
