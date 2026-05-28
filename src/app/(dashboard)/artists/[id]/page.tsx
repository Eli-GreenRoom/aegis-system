export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getArtistRoadsheet } from "@/lib/aggregators";
import { getNextAction } from "@/lib/artists/next-action";
import { listArtists } from "@/lib/artists/repo";
import { listPeople } from "@/lib/people";
import { listHotels, listRoomBlocks } from "@/lib/hotels/repo";
import ArtistCockpit from "./_components/ArtistCockpit";
import type { LogisticsTab } from "./_components/LogisticsSheet";
import AuditHistory from "@/components/ui/AuditHistory";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}

const VALID_FOCUS: LogisticsTab[] = [
  "travel",
  "stay",
  "ground",
  "docs",
  "money",
];

export default async function ArtistDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const initialFocus =
    sp.focus && (VALID_FOCUS as string[]).includes(sp.focus)
      ? (sp.focus as LogisticsTab)
      : null;

  const session = await getAppSession();
  if (!session) redirect("/sign-in");
  const festival = await getActiveFestival(session);
  if (!festival) redirect("/onboarding/festival" as Route);

  const sheet = await getArtistRoadsheet(id);
  if (!sheet) notFound();

  // Reference data for the side-sheet forms - loaded in parallel so the
  // cockpit can open any panel instantly.
  const [artists, people, hotels, blocks] = await Promise.all([
    listArtists({ festivalId: festival.id, archived: "active" }),
    listPeople(festival.id),
    listHotels(),
    listRoomBlocks({ festivalId: festival.id }),
  ]);

  const progress = getNextAction(sheet);

  const setTime =
    sheet.set &&
    `${sheet.set.stage.name} · ${sheet.set.slot.date} · ${sheet.set.slot.startTime}`;

  return (
    <>
      <Topbar
        title={sheet.artist.name}
        subtitle={
          setTime ??
          ([sheet.artist.agency, sheet.artist.nationality]
            .filter(Boolean)
            .join(" · ") ||
            undefined)
        }
        actions={
          <div className="flex items-center gap-2">
            <span
              className="text-mono text-[11px] text-[--color-fg-muted]"
              title={`${progress.doneSteps} of ${progress.totalSteps} steps complete`}
            >
              {progress.doneSteps}/{progress.totalSteps}
            </span>
            <Link href={`/festival/roadsheets/${sheet.artist.id}` as Route}>
              <Button variant="secondary" size="sm">
                Roadsheet
              </Button>
            </Link>
            <Link href={`/artists/${sheet.artist.id}/edit`}>
              <Button size="sm">Edit</Button>
            </Link>
          </div>
        }
      />

      <ArtistCockpit
        sheet={sheet}
        progress={progress}
        reference={{ artists, people, hotels, blocks }}
        festival={{
          endDate: festival.endDate,
          defaultNightsCovered: festival.defaultNightsCovered ?? null,
          paymentTermDaysAfterEnd: festival.paymentTermDaysAfterEnd,
        }}
        initialFocus={initialFocus}
      />
      <div className="px-6 pb-6">
        <AuditHistory entityType="artist" entityId={sheet.artist.id} />
      </div>
    </>
  );
}
