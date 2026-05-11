import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getPickupsInWindow } from "@/lib/aggregators";
import PickupsBoard from "./_components/PickupsBoard";

export const dynamic = "force-dynamic";

export default async function FestivalPickupsPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const endOfWindow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const [next2h, later] = await Promise.all([
    getPickupsInWindow(festival.id, now, in2h),
    getPickupsInWindow(festival.id, in2h, endOfWindow),
  ]);

  return (
    <>
      <Topbar
        title="Pickups"
        subtitle={`${next2h.length} in next 2h · ${later.length} later`}
      />
      <div className="px-6 py-6">
        <PickupsBoard next2h={next2h} later={later} />
      </div>
    </>
  );
}
