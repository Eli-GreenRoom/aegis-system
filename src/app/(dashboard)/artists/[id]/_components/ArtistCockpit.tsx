"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { format } from "date-fns";
import LogisticsSheet, { type LogisticsTab } from "./LogisticsSheet";
import { pickupPrefill } from "./pickup-prefill";
import type { ArtistRoadsheet } from "@/lib/aggregators";
import type { Person } from "@/lib/people";
import type { Hotel, RoomBlock } from "@/lib/hotels/repo";
import type { Artist } from "@/lib/artists/repo";
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
  };
  /** When non-null, open the Logistics sheet on this tab on first render.
   *  Driven by `?focus=` on the artist page (set server-side). */
  initialFocus?: LogisticsTab | null;
}

type Level = "ok" | "warn" | "missing" | "na";

const NEXT_ACTION_TINT: Record<CockpitGap, string> = {
  set: "tinted-amber",
  contract: "tinted-emerald",
  inbound_flight: "tinted-sky",
  hotel: "tinted-violet",
  pickup: "tinted-amber",
  payment: "tinted-emerald",
};

/** Map a legacy SheetKind to the tab in the consolidated LogisticsSheet. */
function sheetKindToTab(k: SheetKind): LogisticsTab {
  switch (k) {
    case "flight_inbound":
    case "flight_outbound":
      return "travel";
    case "hotel":
      return "stay";
    case "pickup":
      return "ground";
    case "contract":
    case "rider_tech":
    case "rider_hosp":
      return "docs";
    case "payment":
    case "invoice":
      return "money";
  }
}

export default function ArtistCockpit({
  sheet,
  progress,
  reference,
  initialFocus,
}: Props) {
  const router = useRouter();
  // Honor ?focus= (passed in from server) so the sheet opens on the right
  // tab when the operator arrives from a home-page gap pill.
  const [logisticsTab, setLogisticsTab] = useState<LogisticsTab | null>(
    initialFocus ?? null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { artist } = sheet;

  function openTab(k: SheetKind) {
    setLogisticsTab(sheetKindToTab(k));
  }
  function close() {
    setLogisticsTab(null);
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

  const pct =
    progress.totalSteps === 0
      ? 100
      : Math.round((progress.doneSteps / progress.totalSteps) * 100);

  const barColor =
    pct === 100
      ? "bg-[--color-brand]"
      : pct >= 60
        ? "bg-[--color-warn]"
        : "bg-coral";

  return (
    <>
      <div className="px-6 py-6 max-w-3xl space-y-6">
        {/* ─── Next action card ───────────────────────────────────────── */}
        {progress.next ? (
          <NextCard
            progress={progress}
            tint={NEXT_ACTION_TINT[progress.next.gap] ?? "tinted-emerald"}
            onOpen={(k) => openTab(k)}
          />
        ) : (
          <AllClearCard />
        )}

        {/* ─── Progress ───────────────────────────────────────────────── */}
        <section
          className="rounded-[--radius-lg] overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-4">
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] shrink-0">
              Progress
            </h2>
            {/* bar */}
            <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-mono text-[10px] text-[--color-fg-subtle] shrink-0 tabular-nums">
              {progress.doneSteps}/{progress.totalSteps}
            </span>
          </div>

          <div className="divide-y divide-white/4">
            {/* Set — always shown */}
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
                  ? `${sheet.set.stage.name} · ${sheet.set.slot.date} · ${sheet.set.slot.startTime}-${sheet.set.slot.endTime}`
                  : null
              }
              cta={{ label: sheet.set ? "Open" : "Add", href: "/lineup" }}
            />

            {/* Contract */}
            {artist.needsContract ? (
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
                    : { label: "Add", onClick: () => openTab("contract") }
                }
              />
            ) : (
              <Row
                label="Contract"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Inbound flight */}
            {artist.needsFlight ? (
              <Row
                label="Inbound flight"
                level={flightLevel(sheet.inboundFlight?.status)}
                badge={sheet.inboundFlight?.status ?? "not booked"}
                detail={
                  sheet.inboundFlight
                    ? `${[sheet.inboundFlight.airline, sheet.inboundFlight.flightNumber].filter(Boolean).join(" ")} · ${sheet.inboundFlight.fromAirport ?? "?"} -> ${sheet.inboundFlight.toAirport ?? "?"}${sheet.inboundFlight.scheduledDt ? ` · ${format(new Date(sheet.inboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
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
                        onClick: () => openTab("flight_inbound"),
                      }
                }
              />
            ) : (
              <Row
                label="Inbound flight"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Outbound flight */}
            {artist.needsFlight ? (
              <Row
                label="Outbound flight"
                level={flightLevel(sheet.outboundFlight?.status)}
                badge={sheet.outboundFlight?.status ?? "not booked"}
                detail={
                  sheet.outboundFlight
                    ? `${[sheet.outboundFlight.airline, sheet.outboundFlight.flightNumber].filter(Boolean).join(" ")} · ${sheet.outboundFlight.fromAirport ?? "?"} -> ${sheet.outboundFlight.toAirport ?? "?"}${sheet.outboundFlight.scheduledDt ? ` · ${format(new Date(sheet.outboundFlight.scheduledDt), "EEE d MMM HH:mm")}` : ""}`
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
                        onClick: () => openTab("flight_outbound"),
                      }
                }
              />
            ) : (
              <Row
                label="Outbound flight"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Hotel */}
            {artist.needsHotel ? (
              <Row
                label="Hotel"
                level={hotelLevel(sheet.hotel?.booking.status)}
                badge={sheet.hotel?.booking.status ?? "no booking"}
                detail={
                  sheet.hotel
                    ? `${sheet.hotel.hotelName} · ${sheet.hotel.booking.checkin} -> ${sheet.hotel.booking.checkout}${sheet.hotel.booking.roomType ? ` · ${sheet.hotel.booking.roomType}` : ""}`
                    : null
                }
                cta={
                  sheet.hotel
                    ? { label: "Open", href: "/hotels/bookings" }
                    : { label: "Add", onClick: () => openTab("hotel") }
                }
              />
            ) : (
              <Row
                label="Hotel"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Ground */}
            {artist.needsGround ? (
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
                            `${format(new Date(p.pickupDt), "EEE HH:mm")} ${p.routeFrom} -> ${p.routeTo}`,
                        )
                        .join("  ·  ") +
                      (sheet.pickups.length > 2
                        ? ` +${sheet.pickups.length - 2} more`
                        : "")
                    : null
                }
                cta={{ label: "Add", onClick: () => openTab("pickup") }}
              />
            ) : (
              <Row
                label="Ground transport"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Technical rider */}
            {artist.needsRider ? (
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
                        onClick: () => openTab("rider_tech"),
                      }
                }
              />
            ) : (
              <Row
                label="Technical rider"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Hospitality rider */}
            {artist.needsRider ? (
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
                        onClick: () => openTab("rider_hosp"),
                      }
                }
              />
            ) : (
              <Row
                label="Hospitality rider"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}

            {/* Payments */}
            {artist.needsPayment ? (
              <PaymentsSection
                artistId={artist.id}
                payments={sheet.payments}
                outstandingCount={outstandingPayments.length}
                onAddInvoice={() => openTab("invoice")}
                onRefresh={onSuccess}
              />
            ) : (
              <Row
                label="Payments"
                level="na"
                badge="N/A"
                detail={null}
                cta={{ label: "Edit", href: `/artists/${artist.id}/edit` }}
              />
            )}
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
            className="w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/2 transition-colors"
            aria-expanded={detailsOpen}
          >
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
              Identity &amp; links
            </h2>
            <span className="text-[--color-fg-subtle] text-[12px]">
              {detailsOpen ? "-" : "+"}
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
                <p className="text-[13px] text-[--color-fg-subtle] whitespace-pre-wrap pt-2 border-t border-white/5">
                  {artist.comments}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ─── Logistics sheet (single, tabbed) ─────────────────────────── */}
      <LogisticsSheet
        open={logisticsTab !== null}
        initialTab={logisticsTab ?? "travel"}
        sheet={sheet}
        reference={reference}
        pickupPrefill={pickupPrefill(sheet)}
        onClose={close}
        onSuccess={onSuccess}
      />
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
        All required modules are complete.
      </p>
    </div>
  );
}

const ROW_BAR: Record<Level, string> = {
  ok: "bg-[--color-brand]",
  warn: "bg-[--color-warn]",
  missing: "bg-white/15",
  na: "bg-white/6",
};

const BADGE_CLS: Record<Level, string> = {
  ok: "text-[--color-brand]",
  warn: "text-[--color-warn]",
  missing: "text-coral",
  na: "text-[--color-fg-subtle]",
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
  const isNa = level === "na";
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${isNa ? "opacity-40" : ""}`}
    >
      <span
        className={`w-0.5 self-stretch shrink-0 rounded-sm ${ROW_BAR[level]}`}
      />
      <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-[--color-fg-muted] w-36 shrink-0">
        {label}
      </span>
      <span
        className={`text-mono text-[10px] shrink-0 w-28 ${BADGE_CLS[level]}`}
      >
        {badge}
      </span>
      <span className="text-[12px] text-[--color-fg-subtle] truncate flex-1 min-w-0">
        {detail ?? ""}
      </span>
      {!isNa &&
        (cta.onClick ? (
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
        ) : null)}
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

// ── PaymentsSection ──────────────────────────────────────────────────────────

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paid: "text-[--color-brand]",
  pending: "text-[--color-warn]",
  due: "text-[--color-warn]",
  overdue: "text-coral",
  void: "text-[--color-fg-subtle]",
};

function PaymentsSection({
  artistId,
  payments,
  outstandingCount,
  onAddInvoice,
  onRefresh,
}: {
  artistId: string;
  payments: ArtistRoadsheet["payments"];
  outstandingCount: number;
  onAddInvoice: () => void;
  onRefresh: () => void;
}) {
  const level: Level =
    payments.length === 0 ? "missing" : outstandingCount === 0 ? "ok" : "warn";

  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [popUploadId, setPopUploadId] = useState<string | null>(null);
  const [popBusy, setPopBusy] = useState(false);

  async function markPaid(id: string) {
    setMarkingPaid(id);
    try {
      await fetch(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      onRefresh();
    } finally {
      setMarkingPaid(null);
    }
  }

  async function attachPop(paymentId: string, url: string) {
    setPopBusy(true);
    try {
      await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ popUrl: url }),
      });
      setPopUploadId(null);
      onRefresh();
    } finally {
      setPopBusy(false);
    }
  }

  return (
    <div className="px-4 py-3.5">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`w-0.5 self-stretch shrink-0 rounded-sm ${ROW_BAR[level]}`}
          style={{ minHeight: "1.25rem" }}
        />
        <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-[--color-fg-muted] w-36 shrink-0">
          Payments
        </span>
        <span className={`text-mono text-[10px] shrink-0 ${BADGE_CLS[level]}`}>
          {payments.length === 0
            ? "none"
            : outstandingCount === 0
              ? "all clear"
              : `${outstandingCount} outstanding`}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onAddInvoice}
          className="text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded border border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-white/30 transition-colors shrink-0"
        >
          Add invoice
        </button>
      </div>

      {/* Payment rows */}
      {payments.length > 0 && (
        <div className="ml-4 divide-y divide-white/4 rounded-md border border-white/6 overflow-hidden">
          {payments.map((p) => {
            const isPaid = p.status === "paid" || p.status === "void";
            const isMarkingThis = markingPaid === p.id;
            const isPopOpen = popUploadId === p.id;

            return (
              <div key={p.id} className="px-3 py-2.5 space-y-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Status */}
                  <span
                    className={`text-mono text-[10px] shrink-0 w-16 ${PAYMENT_STATUS_COLOR[p.status] ?? "text-[--color-fg-muted]"}`}
                  >
                    {p.status}
                  </span>
                  {/* Description */}
                  <span className="text-[12px] text-[--color-fg] truncate flex-1 min-w-0">
                    {p.description}
                  </span>
                  {/* Amount */}
                  <span className="text-mono text-[11px] text-[--color-fg-muted] shrink-0 tabular-nums">
                    {formatCents(p.amountCents)} {p.currency}
                  </span>
                  {/* Due */}
                  {p.dueDate && !isPaid && (
                    <span className="text-mono text-[10px] text-[--color-fg-subtle] shrink-0 hidden sm:block">
                      due {p.dueDate}
                    </span>
                  )}
                  {/* POP icon */}
                  {isPaid && (
                    <button
                      type="button"
                      title={
                        p.popUrl
                          ? "View proof of payment"
                          : "Attach proof of payment"
                      }
                      onClick={() =>
                        p.popUrl
                          ? window.open(p.popUrl, "_blank")
                          : setPopUploadId(isPopOpen ? null : p.id)
                      }
                      className={`text-mono text-[10px] shrink-0 px-1.5 py-0.5 rounded border transition-colors ${
                        p.popUrl
                          ? "border-[--color-brand]/30 text-[--color-brand]"
                          : "border-[--color-border-strong] text-[--color-fg-subtle] hover:text-[--color-fg]"
                      }`}
                    >
                      {p.popUrl ? "POP" : "+ POP"}
                    </button>
                  )}
                  {/* Mark paid */}
                  {!isPaid && (
                    <button
                      type="button"
                      disabled={!!isMarkingThis}
                      onClick={() => markPaid(p.id)}
                      className="text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded border border-[--color-brand]/30 text-[--color-brand] hover:bg-[--color-brand]/10 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isMarkingThis ? "..." : "Mark paid"}
                    </button>
                  )}
                  {/* Edit link */}
                  <Link
                    href={`/payments/${p.id}` as Route}
                    className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-brand shrink-0"
                    title="Edit payment"
                  >
                    edit
                  </Link>
                </div>

                {/* POP upload inline */}
                {isPopOpen && (
                  <div className="pl-[4.5rem]">
                    <InlinePop
                      paymentId={p.id}
                      busy={popBusy}
                      onAttach={attachPop}
                      onCancel={() => setPopUploadId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {payments.length === 0 && (
        <div className="ml-4 text-[12px] text-[--color-fg-subtle]">
          No payments yet.{" "}
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={onAddInvoice}
          >
            Add invoice
          </button>
        </div>
      )}
    </div>
  );
}

function InlinePop({
  paymentId,
  busy,
  onAttach,
  onCancel,
}: {
  paymentId: string;
  busy: boolean;
  onAttach: (paymentId: string, url: string) => void;
  onCancel: () => void;
}) {
  const inputId = `pop-file-${paymentId}`;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("entityType", "payment");
    form.append("entityId", paymentId);
    form.append("tags", "pop");
    try {
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Upload failed");
        return;
      }
      const body = await res.json();
      onAttach(paymentId, body.document.proxyUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={inputId}
        className={`text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded border border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg] cursor-pointer transition-colors ${
          uploading || busy ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {uploading ? "Uploading..." : "Choose file"}
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={onPick}
        disabled={uploading || busy}
      />
      <button
        type="button"
        className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-[--color-fg]"
        onClick={onCancel}
      >
        cancel
      </button>
      {error && <span className="text-xs text-coral">{error}</span>}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

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
