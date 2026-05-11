export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listStages } from "@/lib/lineup/repo";
import StagesAdmin from "./_components/StagesAdmin";

export default async function StagesPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const stages = await listStages(festival.id);
  return (
    <>
      <Topbar
        title="Stages"
        subtitle="Global across editions. Edit colour, sort order, or rename."
        actions={
          <Link href="/lineup">
            <Button variant="ghost">Back to lineup</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <StagesAdmin stages={stages} />
      </div>
    </>
  );
}
