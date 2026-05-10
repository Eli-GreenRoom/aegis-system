export const dynamic = "force-dynamic";

import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { getLineupGrid } from "@/lib/lineup/repo";
import { listArtists } from "@/lib/artists/repo";
import { dayEnum, type Day } from "@/lib/lineup/schema";
import DayTabs from "./_components/DayTabs";
import LineupBoard from "./_components/LineupBoard";

interface PageProps {
  searchParams: Promise<{ day?: string }>;
}

export default async function LineupPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dayParse = dayEnum.safeParse(sp.day);
  const day: Day = dayParse.success ? dayParse.data : "friday";

  const edition = await getCurrentEdition();
  const [grid, artistsRaw] = await Promise.all([
    getLineupGrid(edition.id, day),
    listArtists({ editionId: edition.id, archived: "active" }),
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
        subtitle={`${totalSlots} slots, ${totalSets} sets on ${edition.name}`}
        actions={
          <Link href="/lineup/stages">
            <Button variant="secondary">Stages</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <DayTabs active={day} />
        <LineupBoard day={day} grid={grid} artists={artists} />
      </div>
    </>
  );
}
