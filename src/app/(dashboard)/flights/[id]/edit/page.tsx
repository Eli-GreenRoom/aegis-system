export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getFlight } from "@/lib/flights/repo";
import { listPeople } from "@/lib/people";
import FlightForm from "../../_components/FlightForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const flight = await getFlight(id);
  if (!flight) notFound();

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const people = await listPeople(festival.id);

  return (
    <>
      <Topbar
        title={`Edit ${flight.flightNumber ?? "flight"}`}
        subtitle={
          flight.direction === "inbound" ? "Arrival leg" : "Departure leg"
        }
      />
      <div className="px-6 py-6">
        <FlightForm flight={flight} people={people} />
      </div>
    </>
  );
}
