export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { db } from "@/db/client";
import { workspaces, teamMembers, stages } from "@/db/schema";
import { SettingsTabs } from "./_components/SettingsTabs";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS = ["profile", "workspace", "festival", "team"] as const;
type SettingsTab = (typeof VALID_TABS)[number];

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");
  const sp = await searchParams;
  const initialTab: SettingsTab =
    sp.tab && (VALID_TABS as readonly string[]).includes(sp.tab)
      ? (sp.tab as SettingsTab)
      : "profile";

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

  const festivalStages = festival
    ? await db
        .select()
        .from(stages)
        .where(eq(stages.festivalId, festival.id))
        .orderBy(asc(stages.sortOrder), asc(stages.name))
    : [];

  const subtitle = festival
    ? `${festival.name} — ${festival.startDate} to ${festival.endDate}`
    : undefined;

  return (
    <>
      <Topbar title="Settings" subtitle={subtitle} />
      <SettingsTabs
        initialTab={initialTab}
        workspaceId={session.workspaceId}
        workspaceName={workspace?.name ?? ""}
        festival={
          festival
            ? {
                id: festival.id,
                name: festival.name,
                startDate: festival.startDate,
                endDate: festival.endDate,
                location: festival.location ?? null,
                description: festival.description ?? null,
                defaultNightsCovered: festival.defaultNightsCovered ?? null,
                paymentTermDaysAfterEnd: festival.paymentTermDaysAfterEnd,
              }
            : undefined
        }
        stages={festivalStages.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          color: s.color,
          sortOrder: s.sortOrder,
          activeDates: s.activeDates as string[] | null,
        }))}
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
          signatureUrl: m.signatureUrl,
        }))}
      />
    </>
  );
}
