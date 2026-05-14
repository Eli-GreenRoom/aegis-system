import { redirect } from "next/navigation";
import type { Route } from "next";
import { getAppSession } from "@/lib/session";
import { getActiveFestival, listFestivals } from "@/lib/festivals";
import { isFestivalMode } from "@/lib/festival-mode";
import Sidebar from "@/components/dashboard/Sidebar";
import { FestivalProvider } from "@/components/dashboard/FestivalContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");
  if (!session.workspaceId) redirect("/onboarding/workspace" as Route);

  const festival = await getActiveFestival(session);
  if (!festival) redirect("/onboarding/festival" as Route);

  const [festivalList, festivalMode] = await Promise.all([
    listFestivals(session.workspaceId),
    Promise.resolve(isFestivalMode(festival)),
  ]);

  return (
    <FestivalProvider festival={festival} festivals={festivalList}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userEmail={session.user.email} festivalMode={festivalMode} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </FestivalProvider>
  );
}
