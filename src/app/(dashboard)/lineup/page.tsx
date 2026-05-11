export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getLineupGrid } from "@/lib/lineup/repo";
import { listArtists } from "@/lib/artists/repo";
import { slotDateSchema } from "@/lib/lineup/schema";
import DayTabs from "./_components/DayTabs";
import LineupBoard from "./_components/LineupBoard";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function LineupPage({ searchParams }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const sp = await searchParams;
  const dateParse = slotDateSchema.safeParse(sp.date);
  const date: string = dateParse.success ? dateParse.data : festival.startDate;

  const [grid, artistsRaw] = await Promise.all([
    getLineupGrid(festival.id, date),
    listArtists({ festivalId: festival.id, archived: "active" }),
  ]);

  const artists = artistsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    agency: a.agency,
  }));

  const totalSets = grid.reduce(
    (n, s) => n + s.slots.reduce((m, sl) => m + sl.sets.length, 0),
    0,
  );
  const totalSlots = grid.reduce((n, s) => n + s.slots.length, 0);

  return (
    <>
      <Topbar
        title="Lineup"
        subtitle={`${totalSlots} slots, ${totalSets} sets on ${festival.name}`}
        actions={
          <Link href="/lineup/stages">
            <Button variant="secondary">Stages</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <DayTabs active={date} festival={festival} />
        <LineupBoard day={date} grid={grid} artists={artists} />
      </div>
    </>
  );
}
