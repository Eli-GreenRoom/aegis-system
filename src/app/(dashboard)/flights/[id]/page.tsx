export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getFlight } from "@/lib/flights/repo";
import { getPerson } from "@/lib/people";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlightDetailPage({ params }: PageProps) {
  const { id } = await params;
  const flight = await getFlight(id);
  if (!flight) notFound();

  const person = await getPerson(flight.personKind, flight.personId);

  return (
    <>
      <Topbar
        title={`${flight.flightNumber ?? "Flight"} - ${person?.name ?? "Unknown"}`}
        subtitle={`${flight.direction === "inbound" ? "Arrival" : "Departure"} - ${flight.status}`}
        actions={
          <Link href={`/flights/${flight.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <dl className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Row
            label="Person"
            value={person ? `${person.name} (${person.kind})` : "Unknown"}
          />
          <Row
            label="Direction"
            value={flight.direction === "inbound" ? "Arrival" : "Departure"}
          />
          <Row label="Airline" value={flight.airline} />
          <Row label="Flight no." value={flight.flightNumber} mono />
          <Row label="From" value={flight.fromAirport} mono />
          <Row label="To" value={flight.toAirport} mono />
          <Row
            label="Scheduled"
            value={
              flight.scheduledDt
                ? format(new Date(flight.scheduledDt), "EEE d MMM HH:mm")
                : null
            }
            mono
          />
          <Row
            label="Actual"
            value={
              flight.actualDt
                ? format(new Date(flight.actualDt), "EEE d MMM HH:mm")
                : null
            }
            mono
          />
          <Row label="Status" value={flight.status} />
          <Row
            label="Delay (min)"
            value={
              flight.delayMinutes != null ? String(flight.delayMinutes) : null
            }
            mono
          />
          <Row label="PNR" value={flight.pnr} mono />
          <Row label="Seat" value={flight.seat} mono />
          {flight.ticketUrl && (
            <Row
              label="Ticket"
              value={
                <a
                  className="text-brand underline-offset-4 hover:underline"
                  href={flight.ticketUrl}
                >
                  open
                </a>
              }
            />
          )}
          {flight.confirmationEmailUrl && (
            <Row
              label="Confirmation email"
              value={
                <a
                  className="text-brand underline-offset-4 hover:underline"
                  href={flight.confirmationEmailUrl}
                >
                  open
                </a>
              }
            />
          )}
          {flight.comments && (
            <div className="col-span-2">
              <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
                Comments
              </dt>
              <dd className="text-[--color-fg] whitespace-pre-wrap">
                {flight.comments}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
        {label}
      </dt>
      <dd
        className={mono ? "text-mono text-[--color-fg]" : "text-[--color-fg]"}
      >
        {value ? value : <span className="text-[--color-fg-subtle]">-</span>}
      </dd>
    </div>
  );
}
