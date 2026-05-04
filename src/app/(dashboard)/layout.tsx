import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={session.user.email} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
