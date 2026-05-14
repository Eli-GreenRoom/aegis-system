export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { format } from "date-fns";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getArtistRoadsheet } from "@/lib/aggregators";
import { formatCents } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { id } = await params;
  const sheet = await getArtistRoadsheet(id);
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

  const techRider = riders.find((r) => r.kind === "technical");
  const hospRider = riders.find((r) => r.kind === "hospitality");

  const totalPayments = payments.length;
  const paidCount = payments.filter((p) => p.status === "paid").length;

  return (
    <>
      <Topbar
        title={artist.name}
        subtitle={
          [artist.agency, artist.nationality].filter(Boolean).join(" · ") ||
          undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/festival/roadsheets/${artist.id}`}>
              <Button variant="secondary" size="sm">
                Roadsheet
              </Button>
            </Link>
            <Link href={`/artists/${artist.id}/edit`}>
              <Button size="sm">Edit</Button>
            </Link>
          </div>
        }
      />

      <div className="px-6 py-6 max-w-2xl space-y-2">
        {/* Set */}
        <LogisticsRow
          label="Set"
          status={set ? setStatusLevel(set.set.status) : "missing"}
          badge={set ? set.set.status : "none"}
          detail={
            set
              ? `${set.stage.name} · ${set.slot.date} ${set.slot.startTime}–${set.slot.endTime}`
              : "No set scheduled"
          }
          href={`/lineup`}
        />

        {/* Contract */}
        <LogisticsRow
          label="Contract"
          status={contract ? contractLevel(contract.status) : "missing"}
          badge={contract ? contract.status : "none"}
          detail={
            contract
              ? contract.signedAt
                ? `Signed ${format(new Date(contract.signedAt), "d MMM")}`
                : "Unsigned"
              : "No contract"
          }
          href={`/contracts`}
        />

        {/* Inbound flight */}
        <LogisticsRow
          label="Inbound flight"
          status={inboundFlight ? flightLevel(inboundFlight.status) : "missing"}
          badge={inboundFlight ? inboundFlight.status : "none"}
          detail={
            inboundFlight
              ? `${inboundFlight.airline ?? ""} ${inboundFlight.flightNumber ?? ""} · ${inboundFlight.fromAirport ?? "?"} → ${inboundFlight.toAirport ?? "?"}${inboundFlight.scheduledDt ? ` · ${format(new Date(inboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
              : "Not booked"
          }
          href={`/flights`}
        />

        {/* Outbound flight */}
        <LogisticsRow
          label="Outbound flight"
          status={
            outboundFlight ? flightLevel(outboundFlight.status) : "missing"
          }
          badge={outboundFlight ? outboundFlight.status : "none"}
          detail={
            outboundFlight
              ? `${outboundFlight.airline ?? ""} ${outboundFlight.flightNumber ?? ""} · ${outboundFlight.fromAirport ?? "?"} → ${outboundFlight.toAirport ?? "?"}${outboundFlight.scheduledDt ? ` · ${format(new Date(outboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
              : "Not booked"
          }
          href={`/flights`}
        />

        {/* Hotel */}
        <LogisticsRow
          label="Hotel"
          status={hotel ? hotelLevel(hotel.booking.status) : "missing"}
          badge={hotel ? hotel.booking.status : "none"}
          detail={
            hotel
              ? `${hotel.hotelName} · ${hotel.booking.checkin} → ${hotel.booking.checkout}`
              : "No booking"
          }
          href={`/hotels/bookings`}
        />

        {/* Pickups */}
        <LogisticsRow
          label="Ground transport"
          status={pickups.length > 0 ? "ok" : "missing"}
          badge={
            pickups.length > 0
              ? `${pickups.length} pickup${pickups.length !== 1 ? "s" : ""}`
              : "none"
          }
          detail={
            pickups.length > 0
              ? pickups
                  .slice(0, 2)
                  .map(
                    (p) =>
                      `${format(new Date(p.pickupDt), "EEE HH:mm")} ${p.routeFrom} → ${p.routeTo}`,
                  )
                  .join(" / ") +
                (pickups.length > 2 ? ` +${pickups.length - 2} more` : "")
              : "No pickups scheduled"
          }
          href={`/ground`}
        />

        {/* Technical rider */}
        <LogisticsRow
          label="Technical rider"
          status={techRider ? riderLevel(techRider.confirmed) : "missing"}
          badge={
            techRider ? (techRider.confirmed ? "confirmed" : "pending") : "none"
          }
          detail={
            techRider
              ? techRider.fileUrl
                ? "File attached"
                : "No file"
              : "Not uploaded"
          }
          href={`/riders`}
        />

        {/* Hospitality rider */}
        <LogisticsRow
          label="Hospitality rider"
          status={hospRider ? riderLevel(hospRider.confirmed) : "missing"}
          badge={
            hospRider ? (hospRider.confirmed ? "confirmed" : "pending") : "none"
          }
          detail={
            hospRider
              ? hospRider.fileUrl
                ? "File attached"
                : "No file"
              : "Not uploaded"
          }
          href={`/riders`}
        />

        {/* Payments */}
        <LogisticsRow
          label="Payments"
          status={
            totalPayments === 0
              ? "ok"
              : paidCount === totalPayments
                ? "ok"
                : "warn"
          }
          badge={
            totalPayments === 0
              ? "all clear"
              : `${paidCount}/${totalPayments} paid`
          }
          detail={
            totalPayments === 0
              ? "No outstanding payments"
              : payments
                  .filter((p) => p.status !== "paid")
                  .slice(0, 2)
                  .map(
                    (p) =>
                      `${formatCents(p.amountCents)} ${p.currency} · ${p.status}`,
                  )
                  .join(" / ")
          }
          href={`/payments`}
        />
      </div>
    </>
  );
}

type StatusLevel = "ok" | "warn" | "missing";

function setStatusLevel(status: string): StatusLevel {
  if (status === "confirmed" || status === "live" || status === "done")
    return "ok";
  if (status === "option") return "warn";
  return "warn";
}

function contractLevel(status: string): StatusLevel {
  if (status === "signed") return "ok";
  if (status === "sent") return "warn";
  return "warn";
}

function flightLevel(status: string): StatusLevel {
  if (status === "confirmed" || status === "landed" || status === "departed")
    return "ok";
  if (status === "booked") return "warn";
  return "warn";
}

function hotelLevel(status: string): StatusLevel {
  if (
    status === "confirmed" ||
    status === "checked_in" ||
    status === "checked_out"
  )
    return "ok";
  if (status === "pending") return "warn";
  return "warn";
}

function riderLevel(confirmed: boolean | null): StatusLevel {
  return confirmed ? "ok" : "warn";
}

const statusDot: Record<StatusLevel, string> = {
  ok: "bg-[--color-brand]",
  warn: "bg-[--color-warn]",
  missing: "bg-[--color-fg-subtle]",
};

const statusBadge: Record<StatusLevel, string> = {
  ok: "bg-[--color-brand]/10 text-[--color-brand] border-[--color-brand]/20",
  warn: "bg-[--color-warn]/10 text-[--color-warn] border-[--color-warn]/20",
  missing: "bg-white/[0.04] text-[--color-fg-subtle] border-white/[0.06]",
};

function LogisticsRow({
  label,
  status,
  badge,
  detail,
  href,
}: {
  label: string;
  status: StatusLevel;
  badge: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href as Route}
      className="flex items-center gap-4 rounded-[--radius-md] px-4 py-3.5 hover:bg-white/[0.04] transition-colors group border border-transparent hover:border-white/[0.05]"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[status]}`} />
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-muted] w-36 shrink-0">
        {label}
      </span>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-mono text-[10px] shrink-0 ${statusBadge[status]}`}
      >
        {badge}
      </span>
      <span className="text-[13px] text-[--color-fg-subtle] truncate flex-1">
        {detail}
      </span>
      <span className="text-[--color-fg-subtle] opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0">
        &rarr;
      </span>
    </Link>
  );
}
