import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { format } from "date-fns";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getArtistRoadsheet } from "@/lib/aggregators";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ artistId: string }>;
  searchParams: Promise<{ day?: string }>;
}

export default async function RoadsheetPage({
  params,
  searchParams,
}: PageProps) {
  const { artistId } = await params;
  const sp = await searchParams;
  const day = sp.day;

  const sheet = await getArtistRoadsheet(artistId, day);
  if (!sheet) notFound();

  const {
    artist,
    set,
    inboundFlight,
    outboundFlight,
    hotel,
    pickups,
    riders,
    payments,
    contract,
  } = sheet;

  return (
    <>
      <Topbar
        title={artist.name}
        subtitle={day ? `Roadsheet · ${day}` : "Roadsheet · whole festival"}
        actions={
          <Link href={"/festival/roadsheets" as Route}>
            <Button variant="ghost">Back</Button>
          </Link>
        }
      />
      <div className="px-6 py-6 max-w-3xl space-y-8 print:max-w-none print:px-0 print:py-4">
        {/* Header card */}
        <section className="border border-[--color-border] rounded-md p-5 bg-[--color-surface]/40 print:border-0 print:bg-transparent print:p-0">
          <h1 className="text-display text-3xl text-[--color-fg]">
            {artist.name}
          </h1>
          <div className="mt-2 text-mono text-[11px] text-[--color-fg-muted] flex flex-wrap gap-x-4 gap-y-1">
            {artist.legalName && <span>Legal: {artist.legalName}</span>}
            {artist.nationality && <span>{artist.nationality}</span>}
            {artist.visaStatus && <span>Visa: {artist.visaStatus}</span>}
            {artist.agency && <span>{artist.agency}</span>}
          </div>
          <div className="mt-2 text-mono text-[11px] text-[--color-fg-muted] flex flex-wrap gap-x-4 gap-y-1">
            {artist.email && <span>{artist.email}</span>}
            {artist.phone && <span>{artist.phone}</span>}
            {artist.agentEmail && <span>Agent: {artist.agentEmail}</span>}
          </div>
        </section>

        {/* Set */}
        <Section title="Set">
          {set ? (
            <Row
              label={set.stage.name}
              value={`${set.slot.date} ${set.slot.startTime} - ${set.slot.endTime} · ${set.set.status}`}
            />
          ) : (
            <Empty>No set scheduled.</Empty>
          )}
        </Section>

        {/* Travel */}
        <Section title="Travel">
          {inboundFlight ? (
            <Row
              label="Inbound"
              value={`${inboundFlight.airline ?? ""} ${inboundFlight.flightNumber ?? ""} · ${inboundFlight.fromAirport ?? "?"} → ${inboundFlight.toAirport ?? "?"} · ${
                inboundFlight.scheduledDt
                  ? format(
                      new Date(inboundFlight.scheduledDt),
                      "EEE d MMM HH:mm",
                    )
                  : "—"
              } · ${inboundFlight.status}`}
            />
          ) : (
            <Row label="Inbound" value={<Empty>—</Empty>} />
          )}
          {outboundFlight ? (
            <Row
              label="Outbound"
              value={`${outboundFlight.airline ?? ""} ${outboundFlight.flightNumber ?? ""} · ${outboundFlight.fromAirport ?? "?"} → ${outboundFlight.toAirport ?? "?"} · ${
                outboundFlight.scheduledDt
                  ? format(
                      new Date(outboundFlight.scheduledDt),
                      "EEE d MMM HH:mm",
                    )
                  : "—"
              } · ${outboundFlight.status}`}
            />
          ) : (
            <Row label="Outbound" value={<Empty>—</Empty>} />
          )}
        </Section>

        {/* Hotel */}
        <Section title="Hotel">
          {hotel ? (
            <Row
              label={hotel.hotelName}
              value={`${hotel.booking.checkin} → ${hotel.booking.checkout} · ${hotel.booking.roomType ?? ""} · ${hotel.booking.status}${hotel.booking.bookingNumber ? ` · ${hotel.booking.bookingNumber}` : ""}`}
            />
          ) : (
            <Empty>No active booking.</Empty>
          )}
        </Section>

        {/* Pickups */}
        <Section title="Pickups">
          {pickups.length === 0 ? (
            <Empty>No pickups scheduled.</Empty>
          ) : (
            <ul className="space-y-1">
              {pickups.map((p) => (
                <li
                  key={p.id}
                  className="text-mono text-[12px] text-[--color-fg]"
                >
                  <span className="tabular-nums">
                    {format(new Date(p.pickupDt), "EEE HH:mm")}
                  </span>
                  <span className="text-[--color-fg-muted] ml-3">
                    {p.routeFrom} → {p.routeTo}
                    {p.driverName && ` · ${p.driverName}`}
                    {p.driverPhone && ` · ${p.driverPhone}`}
                    {` · ${p.status}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Riders */}
        <Section title="Riders">
          {riders.length === 0 ? (
            <Empty>No riders on file.</Empty>
          ) : (
            <ul className="space-y-1">
              {riders.map((r) => (
                <li key={r.id} className="text-mono text-[12px]">
                  <span className="text-[--color-fg-muted]">{r.kind}</span>
                  <span
                    className={`ml-3 ${r.confirmed ? "text-mint" : "text-brand"}`}
                  >
                    {r.confirmed ? "confirmed" : "pending"}
                  </span>
                  {r.fileUrl && (
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand underline-offset-4 hover:underline ml-3"
                    >
                      file
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Contract */}
        <Section title="Contract">
          {contract ? (
            <Row
              label={contract.status}
              value={
                <>
                  {contract.signedAt &&
                    `signed ${format(new Date(contract.signedAt), "d MMM")} · `}
                  {contract.fileUrl && (
                    <a
                      href={contract.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand underline-offset-4 hover:underline mr-3"
                    >
                      draft
                    </a>
                  )}
                  {contract.signedFileUrl && (
                    <a
                      href={contract.signedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-mint underline-offset-4 hover:underline"
                    >
                      signed
                    </a>
                  )}
                </>
              }
            />
          ) : (
            <Empty>No contract on file.</Empty>
          )}
        </Section>

        {/* Outstanding payments */}
        <Section title="Payments (outstanding)">
          {payments.length === 0 ? (
            <span className="text-mono text-[12px] text-mint">All paid.</span>
          ) : (
            <ul className="space-y-1">
              {payments.map((p) => (
                <li key={p.id} className="text-mono text-[12px]">
                  <span className="text-[--color-fg]">
                    {formatCents(p.amountCents)} {p.currency}
                  </span>
                  <span className="text-[--color-fg-muted] ml-3">
                    {p.description}
                    {p.dueDate && ` · due ${p.dueDate}`}
                    {` · ${p.status}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] pt-4 border-t border-[--color-border] print:border-t-2">
          GreenRoom Stages · roadsheet · {format(new Date(), "EEE d MMM HH:mm")}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] mb-2">
        {title}
      </h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 py-1">
      <span className="text-[--color-fg] text-sm">{label}</span>
      <span className="text-mono text-[11px] text-[--color-fg-muted]">
        {value}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[--color-fg-subtle] text-xs italic">{children}</span>
  );
}
