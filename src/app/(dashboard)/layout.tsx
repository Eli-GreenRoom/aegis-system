import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { isFestivalMode } from "@/lib/festival-mode";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  const festivalMode = festival ? isFestivalMode(festival) : false;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={session.user.email} festivalMode={festivalMode} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
