import { format } from "date-fns";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listStages } from "@/lib/lineup/repo";
import {
  getCurrentlyActiveBookings,
  getNowAndNext,
  getOpenIssues,
  getPickupsInWindow,
} from "@/lib/aggregators";
import NowBoard from "./_components/NowBoard";

export const dynamic = "force-dynamic";

export default async function FestivalNowPage() {
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
  const today = now.toISOString().slice(0, 10);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const stages = await listStages(festival.id);

  const [pickupsSoon, activeBookings, issues, ...stageNowAndNext] =
    await Promise.all([
      getPickupsInWindow(festival.id, now, in2h),
      getCurrentlyActiveBookings(festival.id, today),
      getOpenIssues(festival.id, "today"),
      ...stages.map((s) => getNowAndNext(s.id, now)),
    ]);

  return (
    <>
      <Topbar
        title="Now"
        subtitle={`${festival.name} · ${format(now, "EEE d MMM HH:mm")}`}
      />
      <NowBoard
        stages={stages}
        stageNowAndNext={stageNowAndNext}
        pickupsSoon={pickupsSoon}
        activeBookings={activeBookings}
        issues={issues}
      />
    </>
  );
}
