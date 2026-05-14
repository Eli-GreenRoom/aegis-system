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
  const outstandingPayments = payments.filter(
    (p) => p.status !== "paid" && p.status !== "void",
  );

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
            <Link href={`/festival/roadsheets/${artist.id}` as Route}>
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

      <div className="px-6 py-6 max-w-2xl space-y-5">
        {/* Identity card */}
        <div
          className="rounded-[--radius-lg] p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="mt-0.5 w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
              style={{
                background: artist.color ?? "var(--color-surface-overlay)",
                color: "rgba(0,0,0,0.55)",
              }}
            >
              {artist.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[17px] font-semibold text-[--color-fg] tracking-[-0.01em]">
                  {artist.name}
                </span>
                {artist.legalName && artist.legalName !== artist.name && (
                  <span className="text-mono text-[10px] text-[--color-fg-subtle]">
                    ({artist.legalName})
                  </span>
                )}
                {artist.local && <Chip label="Local" />}
                {artist.archivedAt && <Chip label="Archived" muted />}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[--color-fg-muted]">
                {artist.agency && <span>{artist.agency}</span>}
                {artist.nationality && <span>{artist.nationality}</span>}
                {artist.visaStatus && (
                  <span className="text-[--color-fg-subtle]">
                    Visa: {artist.visaStatus}
                  </span>
                )}
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                {artist.email && (
                  <a
                    href={`mailto:${artist.email}`}
                    className="text-[--color-fg-muted] hover:text-brand transition-colors font-mono"
                  >
                    {artist.email}
                  </a>
                )}
                {artist.phone && (
                  <span className="text-[--color-fg-subtle] font-mono">
                    {artist.phone}
                  </span>
                )}
                {artist.agentEmail && (
                  <a
                    href={`mailto:${artist.agentEmail}`}
                    className="text-[--color-fg-subtle] hover:text-brand transition-colors font-mono"
                  >
                    Agent: {artist.agentEmail}
                  </a>
                )}
              </div>

              {/* Links */}
              {(artist.pressKitUrl ||
                artist.instagram ||
                artist.soundcloud) && (
                <div className="flex flex-wrap gap-3 pt-0.5">
                  {artist.pressKitUrl && (
                    <ExtLink href={artist.pressKitUrl} label="Press kit" />
                  )}
                  {artist.instagram && (
                    <ExtLink
                      href={maybeUrl(
                        artist.instagram,
                        "https://instagram.com/",
                      )}
                      label="Instagram"
                    />
                  )}
                  {artist.soundcloud && (
                    <ExtLink
                      href={maybeUrl(
                        artist.soundcloud,
                        "https://soundcloud.com/",
                      )}
                      label="Soundcloud"
                    />
                  )}
                  {artist.passportFileUrl && (
                    <ExtLink href={artist.passportFileUrl} label="Passport" />
                  )}
                </div>
              )}

              {artist.comments && (
                <p className="text-[13px] text-[--color-fg-subtle] whitespace-pre-wrap pt-1 border-t border-white/[0.05] mt-2">
                  {artist.comments}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Logistics checklist */}
        <div
          className="rounded-[--radius-lg] overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
              Logistics
            </h2>
          </div>

          <div className="divide-y divide-white/[0.04]">
            <Step
              label="Set"
              status={set ? setLevel(set.set.status) : "missing"}
              badge={set ? set.set.status.replace(/_/g, " ") : "not scheduled"}
              detail={
                set
                  ? `${set.stage.name} · ${set.slot.date} · ${set.slot.startTime}–${set.slot.endTime}`
                  : null
              }
              action={
                set
                  ? { label: "View lineup", href: "/lineup" }
                  : { label: "Add to lineup", href: "/lineup" }
              }
            />

            <Step
              label="Contract"
              status={contract ? contractLevel(contract.status) : "missing"}
              badge={contract ? contract.status : "none"}
              detail={
                contract
                  ? contract.signedAt
                    ? `Signed ${format(new Date(contract.signedAt), "d MMM yyyy")}`
                    : "Unsigned"
                  : null
              }
              action={{
                label: contract ? "View" : "Add contract",
                href: "/contracts",
              }}
            />

            <Step
              label="Inbound flight"
              status={
                inboundFlight ? flightLevel(inboundFlight.status) : "missing"
              }
              badge={inboundFlight ? inboundFlight.status : "not booked"}
              detail={
                inboundFlight
                  ? `${[inboundFlight.airline, inboundFlight.flightNumber].filter(Boolean).join(" ")} · ${inboundFlight.fromAirport ?? "?"} → ${inboundFlight.toAirport ?? "?"}${inboundFlight.scheduledDt ? ` · ${format(new Date(inboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
                  : null
              }
              action={{
                label: inboundFlight ? "View flights" : "Add flight",
                href: "/flights",
              }}
            />

            <Step
              label="Outbound flight"
              status={
                outboundFlight ? flightLevel(outboundFlight.status) : "missing"
              }
              badge={outboundFlight ? outboundFlight.status : "not booked"}
              detail={
                outboundFlight
                  ? `${[outboundFlight.airline, outboundFlight.flightNumber].filter(Boolean).join(" ")} · ${outboundFlight.fromAirport ?? "?"} → ${outboundFlight.toAirport ?? "?"}${outboundFlight.scheduledDt ? ` · ${format(new Date(outboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
                  : null
              }
              action={{
                label: outboundFlight ? "View flights" : "Add flight",
                href: "/flights",
              }}
            />

            <Step
              label="Hotel"
              status={hotel ? hotelLevel(hotel.booking.status) : "missing"}
              badge={hotel ? hotel.booking.status : "no booking"}
              detail={
                hotel
                  ? `${hotel.hotelName} · ${hotel.booking.checkin} → ${hotel.booking.checkout}${hotel.booking.roomType ? ` · ${hotel.booking.roomType}` : ""}`
                  : null
              }
              action={{
                label: hotel ? "View booking" : "Add booking",
                href: "/hotels/bookings",
              }}
            />

            <Step
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
                      .join("  ·  ") +
                    (pickups.length > 2 ? ` +${pickups.length - 2} more` : "")
                  : null
              }
              action={{
                label: pickups.length > 0 ? "View pickups" : "Add pickup",
                href: "/ground",
              }}
            />

            <Step
              label="Technical rider"
              status={
                techRider ? (techRider.confirmed ? "ok" : "warn") : "missing"
              }
              badge={
                techRider
                  ? techRider.confirmed
                    ? "confirmed"
                    : "pending"
                  : "not uploaded"
              }
              detail={techRider?.fileUrl ? "File attached" : null}
              action={{
                label: techRider ? "View rider" : "Add rider",
                href: "/riders",
              }}
            />

            <Step
              label="Hospitality rider"
              status={
                hospRider ? (hospRider.confirmed ? "ok" : "warn") : "missing"
              }
              badge={
                hospRider
                  ? hospRider.confirmed
                    ? "confirmed"
                    : "pending"
                  : "not uploaded"
              }
              detail={hospRider?.fileUrl ? "File attached" : null}
              action={{
                label: hospRider ? "View rider" : "Add rider",
                href: "/riders",
              }}
            />

            <Step
              label="Payments"
              status={outstandingPayments.length === 0 ? "ok" : "warn"}
              badge={
                outstandingPayments.length === 0
                  ? "all clear"
                  : `${outstandingPayments.length} outstanding`
              }
              detail={
                outstandingPayments.length > 0
                  ? outstandingPayments
                      .slice(0, 2)
                      .map(
                        (p) =>
                          `${formatCents(p.amountCents)} ${p.currency}${p.dueDate ? ` · due ${p.dueDate}` : ""}`,
                      )
                      .join("  ·  ")
                  : null
              }
              action={{
                label:
                  outstandingPayments.length > 0 ? "View payments" : "Payments",
                href: "/payments",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

type Level = "ok" | "warn" | "missing";

function setLevel(s: string): Level {
  return s === "confirmed" || s === "live" || s === "done" ? "ok" : "warn";
}
function contractLevel(s: string): Level {
  return s === "signed" ? "ok" : "warn";
}
function flightLevel(s: string): Level {
  if (s === "not_needed") return "ok";
  return s === "confirmed" || s === "landed" || s === "departed"
    ? "ok"
    : "warn";
}
function hotelLevel(s: string): Level {
  if (s === "not_needed") return "ok";
  return s === "confirmed" || s === "checked_in" || s === "checked_out"
    ? "ok"
    : "warn";
}

const DOT: Record<Level, string> = {
  ok: "bg-[--color-brand]",
  warn: "bg-[--color-warn]",
  missing: "bg-white/20",
};

const BADGE: Record<Level, string> = {
  ok: "text-[--color-brand]",
  warn: "text-[--color-warn]",
  missing: "text-[--color-fg-subtle]",
};

function Step({
  label,
  status,
  badge,
  detail,
  action,
}: {
  label: string;
  status: Level;
  badge: string;
  detail: string | null;
  action: { label: string; href: string };
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 group">
      <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[status]}`} />
      <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-[--color-fg-muted] w-32 shrink-0">
        {label}
      </span>
      <span className={`text-mono text-[10px] shrink-0 w-24 ${BADGE[status]}`}>
        {badge}
      </span>
      <span className="text-[12px] text-[--color-fg-subtle] truncate flex-1 min-w-0">
        {detail ?? ""}
      </span>
      <Link
        href={action.href as Route}
        className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-brand transition-colors shrink-0 opacity-0 group-hover:opacity-100"
      >
        {action.label} &rarr;
      </Link>
    </div>
  );
}

function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-mono text-[9px] uppercase tracking-[0.14em] border ${
        muted
          ? "border-white/[0.08] text-[--color-fg-subtle]"
          : "border-[--color-brand]/25 text-[--color-brand]"
      }`}
    >
      {label}
    </span>
  );
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] hover:text-brand transition-colors underline-offset-2 hover:underline"
    >
      {label}
    </a>
  );
}

function maybeUrl(value: string, base: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, "");
}
