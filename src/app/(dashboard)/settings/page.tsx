export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { autoFestivalMode, isFestivalMode } from "@/lib/festival-mode";
import FestivalModeToggle from "./_components/FestivalModeToggle";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const auto = autoFestivalMode(festival);
  const effective = isFestivalMode(festival);

  return (
    <>
      <Topbar
        title="Settings"
        subtitle={`${festival.name} — ${festival.startDate} to ${festival.endDate}`}
      />
      <div className="px-6 py-6 max-w-2xl space-y-10">
        <section>
          <h2 className="text-[14px] text-[--color-fg] mb-2">Festival mode</h2>
          <p className="text-[--color-fg-muted] text-sm mb-4">
            When on, the dashboard switches to a phone-friendly live-ops layout:
            Now / Pickups / Arrivals / Issues / Roadsheets, with one-tap status
            advance buttons. Auto-detection turns it on during the festival
            weekend; force it on early for rehearsals, or leave it off to test
            in planning mode.
          </p>
          <FestivalModeToggle
            initialActive={festival.festivalModeActive}
            auto={auto}
            effective={effective}
          />
        </section>
      </div>
    </>
  );
}
