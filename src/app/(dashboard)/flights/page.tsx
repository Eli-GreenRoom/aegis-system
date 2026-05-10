export const dynamic = "force-dynamic";

import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import {
  directionEnum,
  flightStatusEnum,
  personKindEnum,
} from "@/lib/flights/schema";
import { listFlights } from "@/lib/flights/repo";
import { resolvePeople } from "@/lib/people";
import FlightsTable from "./_components/FlightsTable";
import FlightsFilters from "./_components/FlightsFilters";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    direction?: string;
    status?: string;
    personKind?: string;
    personId?: string;
  }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const directionParsed = sp.direction
    ? directionEnum.safeParse(sp.direction)
    : null;
  const statusParsed = sp.status ? flightStatusEnum.safeParse(sp.status) : null;
  const personKindParsed = sp.personKind
    ? personKindEnum.safeParse(sp.personKind)
    : null;

  const flights = await listFlights({
    editionId: edition.id,
    search: sp.search,
    direction: directionParsed?.success ? directionParsed.data : undefined,
    status: statusParsed?.success ? statusParsed.data : undefined,
    personKind: personKindParsed?.success ? personKindParsed.data : undefined,
    personId: sp.personId,
  });

  const people = await resolvePeople(
    flights.map((f) => ({ kind: f.personKind, id: f.personId })),
  );

  return (
    <>
      <Topbar
        title="Flights"
        subtitle={`${flights.length} legs on ${edition.name}`}
        actions={
          <Link href="/flights/new">
            <Button>New flight</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <FlightsFilters />
        <FlightsTable flights={flights} people={people} />
      </div>
    </>
  );
}
