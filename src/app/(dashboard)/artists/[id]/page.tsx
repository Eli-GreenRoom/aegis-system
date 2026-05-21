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
import { listVendors } from "@/lib/ground/repo";
import { listInvoices } from "@/lib/payments/repo";
import ArtistCockpit from "./_components/ArtistCockpit";
import AuditHistory from "@/components/ui/AuditHistory";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getAppSession();
  if (!session) redirect("/sign-in");
  const festival = await getActiveFestival(session);
  if (!festival) redirect("/onboarding/festival" as Route);

  const sheet = await getArtistRoadsheet(id);
  if (!sheet) notFound();

  // Reference data for the side-sheet forms — loaded in parallel so the
  // cockpit can open any panel instantly.
  const [artists, people, hotels, blocks, vendors, invoices] =
    await Promise.all([
      listArtists({ festivalId: festival.id, archived: "active" }),
      listPeople(festival.id),
      listHotels(),
      listRoomBlocks({ festivalId: festival.id }),
      listVendors(),
      listInvoices({ festivalId: festival.id }),
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
        reference={{ artists, people, hotels, blocks, vendors, invoices }}
      />
      <div className="px-6 pb-6">
        <AuditHistory entityType="artist" entityId={sheet.artist.id} />
      </div>
    </>
  );
}
