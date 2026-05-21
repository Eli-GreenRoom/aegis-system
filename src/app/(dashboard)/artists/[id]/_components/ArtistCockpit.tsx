"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { format } from "date-fns";
import SideSheet from "@/components/ui/SideSheet";
import FlightForm from "@/app/(dashboard)/flights/_components/FlightForm";
import BookingForm from "@/app/(dashboard)/hotels/bookings/_components/BookingForm";
import PickupForm from "@/app/(dashboard)/ground/_components/PickupForm";
import ContractForm from "@/app/(dashboard)/contracts/_components/ContractForm";
import RiderForm from "@/app/(dashboard)/riders/_components/RiderForm";
import PaymentForm from "@/app/(dashboard)/payments/_components/PaymentForm";
import type { ArtistRoadsheet } from "@/lib/aggregators";
import type { Person } from "@/lib/people";
import type { Hotel, RoomBlock } from "@/lib/hotels/repo";
import type { Vendor } from "@/lib/ground/repo";
import type { Artist } from "@/lib/artists/repo";
import type { Invoice } from "@/lib/payments/repo";
import type {
  CockpitProgress,
  CockpitGap,
  SheetKind,
} from "@/lib/artists/next-action";
import { formatCents } from "@/lib/utils";

interface Props {
  sheet: ArtistRoadsheet;
  progress: CockpitProgress;
  reference: {
    people: Person[];
    artists: Artist[];
    hotels: Hotel[];
    blocks: RoomBlock[];
    vendors: Vendor[];
    invoices: Invoice[];
  };
}

type Level = "ok" | "warn" | "missing";

const NEXT_ACTION_TINT: Record<CockpitGap, string> = {
  set: "tinted-amber",
  contract: "tinted-emerald",
  inbound_flight: "tinted-sky",
  hotel: "tinted-violet",
  pickup: "tinted-amber",
  payment: "tinted-emerald",
};

export default function ArtistCockpit({ sheet, progress, reference }: Props) {
  const router = useRouter();
  const [openSheet, setOpenSheet] = useState<SheetKind | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { artist } = sheet;

  function close() {
    setOpenSheet(null);
  }
  function onSuccess() {
    close();
    router.refresh();
  }

  const techRider = sheet.riders.find((r) => r.kind === "technical");
  const hospRider = sheet.riders.find((r) => r.kind === "hospitality");
  const outstandingPayments = sheet.payments.filter(
    (p) => p.status !== "paid" && p.status !== "void",
  );

  return (
    <>
      <div className="px-6 py-6 max-w-3xl space-y-6">
        {/* ─── NEXT card ─────────────────────────────────────────────── */}
        {progress.next ? (
          <NextCard
            progress={progress}
            tint={NEXT_ACTION_TINT[progress.next.gap] ?? "tinted-emerald"}
            onOpen={(k) => setOpenSheet(k)}
          />
        ) : (
          <AllClearCard />
        )}

        {/* ─── Progress rail ──────────────────────────────────────────── */}
        <section
          className="rounded-[--radius-lg] overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
              Progress
            </h2>
            <span className="text-mono text-[10px] text-[--color-fg-subtle]">
              {progress.doneSteps} / {progress.totalSteps}
            </span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            <Row
              label="Set"
              level={
                sheet.set
                  ? sheet.set.set.status === "confirmed" ||
                    sheet.set.set.status === "live" ||
                    sheet.set.set.status === "done"
                    ? "ok"
                    : "warn"
                  : "missing"
              }
              badge={
                sheet.set
                  ? sheet.set.set.status.replace(/_/g, " ")
                  : "not scheduled"
              }
              detail={
                sheet.set
                  ? `${sheet.set.stage.name} · ${sheet.set.slot.date} · ${sheet.set.slot.startTime}–${sheet.set.slot.endTime}`
                  : null
              }
              cta={{ label: sheet.set ? "Open" : "Add", href: "/lineup" }}
            />

            <Row
              label="Contract"
              level={
                sheet.contract
                  ? sheet.contract.status === "signed"
                    ? "ok"
                    : "warn"
                  : "missing"
              }
              badge={sheet.contract ? sheet.contract.status : "none"}
              detail={
                sheet.contract?.signedAt
                  ? `Signed ${format(new Date(sheet.contract.signedAt), "d MMM yyyy")}`
                  : sheet.contract
                    ? "Unsigned"
                    : null
              }
              cta={
                sheet.contract
                  ? { label: "Open", href: `/contracts/${sheet.contract.id}` }
                  : { label: "Add", onClick: () => setOpenSheet("contract") }
              }
            />

            <Row
              label="Inbound flight"
              level={flightLevel(sheet.inboundFlight?.status)}
              badge={sheet.inboundFlight?.status ?? "not booked"}
              detail={
                sheet.inboundFlight
                  ? `${[sheet.inboundFlight.airline, sheet.inboundFlight.flightNumber].filter(Boolean).join(" ")} · ${sheet.inboundFlight.fromAirport ?? "?"} → ${sheet.inboundFlight.toAirport ?? "?"}${sheet.inboundFlight.scheduledDt ? ` · ${format(new Date(sheet.inboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
                  : null
              }
              cta={
                sheet.inboundFlight
                  ? {
                      label: "Open",
                      href: `/flights/${sheet.inboundFlight.id}`,
                    }
                  : {
                      label: "Add",
                      onClick: () => setOpenSheet("flight_inbound"),
                    }
              }
            />

            <Row
              label="Outbound flight"
              level={flightLevel(sheet.outboundFlight?.status)}
              badge={sheet.outboundFlight?.status ?? "not booked"}
              detail={
                sheet.outboundFlight
                  ? `${[sheet.outboundFlight.airline, sheet.outboundFlight.flightNumber].filter(Boolean).join(" ")} · ${sheet.outboundFlight.fromAirport ?? "?"} → ${sheet.outboundFlight.toAirport ?? "?"}${sheet.outboundFlight.scheduledDt ? ` · ${format(new Date(sheet.outboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
                  : null
              }
              cta={
                sheet.outboundFlight
                  ? {
                      label: "Open",
                      href: `/flights/${sheet.outboundFlight.id}`,
                    }
                  : {
                      label: "Add",
                      onClick: () => setOpenSheet("flight_outbound"),
                    }
              }
            />

            <Row
              label="Hotel"
              level={hotelLevel(sheet.hotel?.booking.status)}
              badge={sheet.hotel?.booking.status ?? "no booking"}
              detail={
                sheet.hotel
                  ? `${sheet.hotel.hotelName} · ${sheet.hotel.booking.checkin} → ${sheet.hotel.booking.checkout}${sheet.hotel.booking.roomType ? ` · ${sheet.hotel.booking.roomType}` : ""}`
                  : null
              }
              cta={
                sheet.hotel
                  ? { label: "Open", href: "/hotels/bookings" }
                  : { label: "Add", onClick: () => setOpenSheet("hotel") }
              }
            />

            <Row
              label="Ground transport"
              level={sheet.pickups.length > 0 ? "ok" : "missing"}
              badge={
                sheet.pickups.length > 0
                  ? `${sheet.pickups.length} pickup${sheet.pickups.length !== 1 ? "s" : ""}`
                  : "none"
              }
              detail={
                sheet.pickups.length > 0
                  ? sheet.pickups
                      .slice(0, 2)
                      .map(
                        (p) =>
                          `${format(new Date(p.pickupDt), "EEE HH:mm")} ${p.routeFrom} → ${p.routeTo}`,
                      )
                      .join("  ·  ") +
                    (sheet.pickups.length > 2
                      ? ` +${sheet.pickups.length - 2} more`
                      : "")
                  : null
              }
              cta={{ label: "Add", onClick: () => setOpenSheet("pickup") }}
            />

            <Row
              label="Technical rider"
              level={
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
              cta={
                techRider
                  ? { label: "Open", href: `/riders/${techRider.id}` }
                  : {
                      label: "Add",
                      onClick: () => setOpenSheet("rider_tech"),
                    }
              }
            />

            <Row
              label="Hospitality rider"
              level={
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
              cta={
                hospRider
                  ? { label: "Open", href: `/riders/${hospRider.id}` }
                  : {
                      label: "Add",
                      onClick: () => setOpenSheet("rider_hosp"),
                    }
              }
            />

            <Row
              label="Payments"
              level={
                sheet.payments.length === 0
                  ? "missing"
                  : outstandingPayments.length === 0
                    ? "ok"
                    : "warn"
              }
              badge={
                sheet.payments.length === 0
                  ? "none"
                  : outstandingPayments.length === 0
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
              cta={{
                label: sheet.payments.length === 0 ? "Add" : "View",
                onClick:
                  sheet.payments.length === 0
                    ? () => setOpenSheet("payment")
                    : undefined,
                href: sheet.payments.length === 0 ? undefined : "/payments",
              }}
            />
          </div>
        </section>

        {/* ─── Identity & links (collapsible) ─────────────────────────── */}
        <section
          className="rounded-[--radius-lg] overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
            aria-expanded={detailsOpen}
          >
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
              Identity & links
            </h2>
            <span className="text-[--color-fg-subtle] text-[12px]">
              {detailsOpen ? "−" : "+"}
            </span>
          </button>
          {detailsOpen && (
            <div className="p-5 space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[--color-fg-muted]">
                {artist.agency && <span>{artist.agency}</span>}
                {artist.nationality && <span>{artist.nationality}</span>}
                {artist.visaStatus && (
                  <span className="text-[--color-fg-subtle]">
                    Visa: {artist.visaStatus}
                  </span>
                )}
                {artist.legalName && artist.legalName !== artist.name && (
                  <span className="text-mono text-[11px] text-[--color-fg-subtle]">
                    ({artist.legalName})
                  </span>
                )}
              </div>

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

              {(artist.pressKitUrl ||
                artist.instagram ||
                artist.soundcloud ||
                artist.passportFileUrl) && (
                <div className="flex flex-wrap gap-3">
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
                <p className="text-[13px] text-[--color-fg-subtle] whitespace-pre-wrap pt-2 border-t border-white/[0.05]">
                  {artist.comments}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ─── Side sheets ──────────────────────────────────────────────── */}

      <SideSheet
        open={openSheet === "contract"}
        onClose={close}
        title="Add contract"
        subtitle={artist.name}
      >
        <ContractForm
          artists={reference.artists}
          defaultArtistId={artist.id}
          onSuccess={onSuccess}
        />
      </SideSheet>

      <SideSheet
        open={openSheet === "flight_inbound"}
        onClose={close}
        title="Add inbound flight"
        subtitle={artist.name}
      >
        <FlightForm
          people={reference.people}
          defaultPerson={{ id: artist.id, kind: "artist" }}
          defaultDirection="inbound"
          onSuccess={onSuccess}
        />
      </SideSheet>

      <SideSheet
        open={openSheet === "flight_outbound"}
        onClose={close}
        title="Add outbound flight"
        subtitle={artist.name}
      >
        <FlightForm
          people={reference.people}
          defaultPerson={{ id: artist.id, kind: "artist" }}
          defaultDirection="outbound"
          onSuccess={onSuccess}
        />
      </SideSheet>

      <SideSheet
        open={openSheet === "hotel"}
        onClose={close}
        title="Add hotel booking"
        subtitle={artist.name}
      >
        {reference.hotels.length === 0 ? (
          <EmptyHint
            label="No hotels in the catalogue yet."
            href="/hotels"
            cta="Add a hotel first →"
          />
        ) : (
          <BookingForm
            hotels={reference.hotels}
            blocks={reference.blocks}
            people={reference.people}
            defaultPerson={{ id: artist.id, kind: "artist" }}
            onSuccess={onSuccess}
          />
        )}
      </SideSheet>

      <SideSheet
        open={openSheet === "pickup"}
        onClose={close}
        title="Schedule pickup"
        subtitle={artist.name}
      >
        <PickupForm
          people={reference.people}
          vendors={reference.vendors}
          defaultPerson={{ id: artist.id, kind: "artist" }}
          onSuccess={onSuccess}
        />
      </SideSheet>

      <SideSheet
        open={openSheet === "rider_tech"}
        onClose={close}
        title="Add technical rider"
        subtitle={artist.name}
      >
        <RiderForm
          artists={reference.artists}
          defaultArtistId={artist.id}
          defaultKind="technical"
          onSuccess={onSuccess}
        />
      </SideSheet>

      <SideSheet
        open={openSheet === "rider_hosp"}
        onClose={close}
        title="Add hospitality rider"
        subtitle={artist.name}
      >
        <RiderForm
          artists={reference.artists}
          defaultArtistId={artist.id}
          defaultKind="hospitality"
          onSuccess={onSuccess}
        />
      </SideSheet>

      <SideSheet
        open={openSheet === "payment"}
        onClose={close}
        title="Add payment"
        subtitle={artist.name}
      >
        <PaymentForm
          artists={reference.artists}
          vendors={reference.vendors}
          invoices={reference.invoices}
          prefill={{ artistId: artist.id }}
          onSuccess={onSuccess}
        />
      </SideSheet>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function NextCard({
  progress,
  tint,
  onOpen,
}: {
  progress: CockpitProgress;
  tint: string;
  onOpen: (k: SheetKind) => void;
}) {
  const next = progress.next!;
  return (
    <div
      className={`rounded-[--radius-lg] p-5 ${tint}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[--color-brand] animate-pulse" />
        <span
          className="text-[10px] uppercase tracking-[0.18em] text-[--color-brand] font-semibold"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Next
        </span>
      </div>
      <div className="text-[17px] font-semibold text-[--color-fg] mb-1.5">
        {next.title}
      </div>
      <p className="text-[13px] text-[--color-fg-muted] mb-4 leading-relaxed">
        {next.reason}
      </p>
      {next.sheet ? (
        <button
          type="button"
          onClick={() => onOpen(next.sheet!)}
          className="text-[12px] font-medium px-3 py-1.5 rounded-md bg-[--color-brand] text-[--color-brand-fg] hover:opacity-90 transition-opacity"
        >
          {next.ctaLabel}
        </button>
      ) : (
        <Link
          href={(next.href ?? "/home") as Route}
          className="text-[12px] font-medium px-3 py-1.5 rounded-md bg-[--color-brand] text-[--color-brand-fg] hover:opacity-90 transition-opacity inline-block"
        >
          {next.ctaLabel}
        </Link>
      )}
    </div>
  );
}

function AllClearCard() {
  return (
    <div
      className="rounded-[--radius-lg] p-5 tinted-emerald"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[--color-brand]" />
        <span className="text-[13px] text-[--color-fg]">Fully prepped</span>
      </div>
      <p className="text-[12px] text-[--color-fg-muted] mt-1">
        Set, contract, flight, hotel, pickup and payment are all in place.
      </p>
    </div>
  );
}

const ROW_BAR: Record<Level, string> = {
  ok: "bg-[--color-brand]",
  warn: "bg-[--color-warn]",
  missing: "bg-white/15",
};

const BADGE: Record<Level, string> = {
  ok: "text-[--color-brand]",
  warn: "text-[--color-warn]",
  missing: "text-[--color-fg-subtle]",
};

function Row({
  label,
  level,
  badge,
  detail,
  cta,
}: {
  label: string;
  level: Level;
  badge: string;
  detail: string | null;
  cta: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={`w-0.5 self-stretch shrink-0 rounded-sm ${ROW_BAR[level]}`}
      />
      <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-[--color-fg-muted] w-32 shrink-0">
        {label}
      </span>
      <span className={`text-mono text-[10px] shrink-0 w-24 ${BADGE[level]}`}>
        {badge}
      </span>
      <span className="text-[12px] text-[--color-fg-subtle] truncate flex-1 min-w-0">
        {detail ?? ""}
      </span>
      {cta.onClick ? (
        <button
          type="button"
          onClick={cta.onClick}
          className="text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded border border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-white/30 transition-colors shrink-0"
        >
          {cta.label}
        </button>
      ) : cta.href ? (
        <Link
          href={cta.href as Route}
          className="text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded border border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-white/30 transition-colors shrink-0"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
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

function EmptyHint({
  label,
  href,
  cta,
}: {
  label: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="text-[13px] text-[--color-fg-muted] space-y-2">
      <p>{label}</p>
      <Link
        href={href as Route}
        className="inline-block text-[12px] text-[--color-brand] hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function flightLevel(s: string | undefined): Level {
  if (!s) return "missing";
  if (s === "not_needed") return "ok";
  if (s === "cancelled") return "missing";
  return s === "confirmed" || s === "landed" || s === "departed"
    ? "ok"
    : "warn";
}

function hotelLevel(s: string | undefined): Level {
  if (!s) return "missing";
  if (s === "not_needed") return "ok";
  if (s === "cancelled" || s === "no_show") return "missing";
  return s === "confirmed" || s === "checked_in" || s === "checked_out"
    ? "ok"
    : "warn";
}

function maybeUrl(value: string, base: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, "");
}
