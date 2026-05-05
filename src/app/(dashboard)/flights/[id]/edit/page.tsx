import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { getFlight } from "@/lib/flights/repo";
import { listPeople } from "@/lib/people";
import FlightForm from "../../_components/FlightForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  const { id } = await params;
  const flight = await getFlight(id);
  if (!flight) notFound();

  const edition = await getCurrentEdition();
  const people = await listPeople(edition.id);

  return (
    <>
      <Topbar
        title={`Edit ${flight.flightNumber ?? "flight"}`}
        subtitle={flight.direction === "inbound" ? "Arrival leg" : "Departure leg"}
      />
      <div className="px-6 py-6">
        <FlightForm flight={flight} people={people} />
      </div>
    </>
  );
}
