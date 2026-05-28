"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { ArtistStatusSummary } from "@/lib/artists/status-types";
import { hasGap } from "@/lib/artists/status-types";

export interface ReadinessRow {
  artist: { id: string; name: string; agency: string | null };
  status: ArtistStatusSummary;
  stageId: string | null;
  stageName: string | null;
  slotDate: string | null;
}

interface StageOption {
  id: string;
  name: string;
}

interface Props {
  rows: ReadinessRow[];
  stageOptions: StageOption[];
  dayOptions: string[];
  /** Outside the festival window, the "live" and "done" chips are hidden -
   *  they're operationally meaningful only during the show. */
  festivalMode: boolean;
}

// ---- types -----------------------------------------------------------------

type LogisticsTab = "travel" | "stay" | "ground" | "docs" | "money";

const ALL_SET_STATUS_OPTIONS = [
  "no_set",
  "confirmed",
  "option",
  "live",
  "done",
  "not_available",
  "withdrawn",
] as const;
type SetStatusFilter = (typeof ALL_SET_STATUS_OPTIONS)[number];

// ---- cell helpers ----------------------------------------------------------

function Cell({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <td className="px-3 py-2 text-[11px] whitespace-nowrap border-b border-[--color-border]">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          title={title}
          className="text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          {children}
        </button>
      ) : (
        children
      )}
    </td>
  );
}

function PillOk({ label }: { label: string }) {
  return (
    <span className="pill-emerald text-[9px] uppercase tracking-[0.1em]">
      {label}
    </span>
  );
}

function PillWarn({ label }: { label: string }) {
  return (
    <span className="pill-amber text-[9px] uppercase tracking-[0.1em]">
      {label}
    </span>
  );
}

function PillMissing() {
  return (
    <span className="pill-coral text-[9px] uppercase tracking-[0.1em]">
      missing
    </span>
  );
}

function PillNA() {
  return (
    <span className="text-mono text-[10px] text-[--color-fg-subtle] px-1.5 py-0.5 rounded border border-[--color-border]">
      N/A
    </span>
  );
}

// ---- per-module cell renderers ---------------------------------------------

function SetCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.setStatus)
    return (
      <Cell onClick={onClick} title="Open lineup">
        <PillMissing />
      </Cell>
    );
  const pills: Record<string, string> = {
    confirmed: "pill-emerald",
    option: "pill-amber",
    live: "pill-emerald",
    done: "pill-emerald",
    not_available: "pill-coral",
    withdrawn: "pill-coral",
  };
  const cls = pills[status.setStatus] ?? "pill-amber";
  return (
    <Cell onClick={onClick} title="Open lineup">
      <span className={`${cls} text-[9px] uppercase tracking-[0.1em]`}>
        {status.setStatus}
      </span>
    </Cell>
  );
}

function FlightCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.needsFlight)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  const inOk = status.inboundFlight && status.inboundFlight !== "cancelled";
  const outOk = status.outboundFlight && status.outboundFlight !== "cancelled";
  if (!inOk && !outOk)
    return (
      <Cell onClick={onClick} title="Add flights">
        <PillMissing />
      </Cell>
    );
  if (!inOk || !outOk)
    return (
      <Cell onClick={onClick} title="Add missing flight">
        <PillWarn label={!inOk ? "no inbound" : "no outbound"} />
      </Cell>
    );
  return (
    <Cell onClick={onClick} title="Edit flights">
      <PillOk label="in + out" />
    </Cell>
  );
}

function HotelCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.needsHotel)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.hotelStatus)
    return (
      <Cell onClick={onClick} title="Add hotel booking">
        <PillMissing />
      </Cell>
    );
  const ok = ["booked", "checked_in", "checked_out"].includes(
    status.hotelStatus,
  );
  if (ok)
    return (
      <Cell onClick={onClick} title="Edit hotel">
        <PillOk label={status.hotelStatus} />
      </Cell>
    );
  if (status.hotelStatus === "cancelled" || status.hotelStatus === "no_show")
    return (
      <Cell onClick={onClick} title="Re-book hotel">
        <PillMissing />
      </Cell>
    );
  return (
    <Cell onClick={onClick} title="Edit hotel">
      <PillWarn label={status.hotelStatus} />
    </Cell>
  );
}

function GroundCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.needsGround)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.groundStatus)
    return (
      <Cell onClick={onClick} title="Add pickup">
        <PillMissing />
      </Cell>
    );
  const ok = ["completed"].includes(status.groundStatus);
  const warn = ["scheduled", "dispatched", "in_transit"].includes(
    status.groundStatus,
  );
  if (ok)
    return (
      <Cell onClick={onClick} title="Edit pickups">
        <PillOk label="scheduled" />
      </Cell>
    );
  if (warn)
    return (
      <Cell onClick={onClick} title="Edit pickups">
        <PillWarn label={status.groundStatus} />
      </Cell>
    );
  return (
    <Cell onClick={onClick} title="Add pickup">
      <PillMissing />
    </Cell>
  );
}

function ContractCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.needsContract)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.contractStatus)
    return (
      <Cell onClick={onClick} title="Add contract">
        <PillMissing />
      </Cell>
    );
  if (status.contractStatus === "signed")
    return (
      <Cell onClick={onClick} title="Open contract">
        <PillOk label="signed" />
      </Cell>
    );
  return (
    <Cell onClick={onClick} title="Open contract">
      <PillWarn label={status.contractStatus} />
    </Cell>
  );
}

function PaymentCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.needsPayment)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.hasAnyPayment)
    return (
      <Cell onClick={onClick} title="Add invoice + payment">
        <PillMissing />
      </Cell>
    );
  if (status.outstandingPayments > 0)
    return (
      <Cell onClick={onClick} title="View payments">
        <PillWarn label={`${status.outstandingPayments} pending`} />
      </Cell>
    );
  return (
    <Cell onClick={onClick} title="View payments">
      <PillOk label="clear" />
    </Cell>
  );
}

function RiderCell({
  status,
  onClick,
}: {
  status: ArtistStatusSummary;
  onClick: () => void;
}) {
  if (!status.needsRider)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (status.ridersReady === null)
    return (
      <Cell onClick={onClick} title="Add rider">
        <PillMissing />
      </Cell>
    );
  if (status.ridersReady)
    return (
      <Cell onClick={onClick} title="Edit riders">
        <PillOk label="confirmed" />
      </Cell>
    );
  return (
    <Cell onClick={onClick} title="Edit riders">
      <PillWarn label="unconfirmed" />
    </Cell>
  );
}

// ---- main component --------------------------------------------------------

const COLS = [
  "Artist",
  "Set",
  "Flights",
  "Hotel",
  "Ground",
  "Contract",
  "Payment",
  "Rider",
] as const;

export default function ReadinessGrid({
  rows,
  stageOptions,
  dayOptions,
  festivalMode,
}: Props) {
  // Outside the festival window, "live" and "done" are operationally
  // irrelevant - drop them from the chip row.
  const setStatusOptions = festivalMode
    ? ALL_SET_STATUS_OPTIONS
    : ALL_SET_STATUS_OPTIONS.filter((s) => s !== "live" && s !== "done");

  // Filter state. readiness is a tri-state: all / gaps only / ready only.
  const [search, setSearch] = useState("");
  const [readiness, setReadiness] = useState<"all" | "gaps" | "ready">("all");
  const [setStatusChips, setSetStatusChips] = useState<Set<SetStatusFilter>>(
    new Set(),
  );
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const matchesName = r.artist.name.toLowerCase().includes(q);
        const matchesAgency = (r.artist.agency ?? "").toLowerCase().includes(q);
        if (!matchesName && !matchesAgency) return false;
      }
      if (readiness === "gaps" && !hasGap(r.status)) return false;
      if (readiness === "ready" && hasGap(r.status)) return false;
      if (setStatusChips.size > 0) {
        const v: SetStatusFilter = r.status.setStatus
          ? (r.status.setStatus as SetStatusFilter)
          : "no_set";
        if (!setStatusChips.has(v)) return false;
      }
      if (stageFilter.size > 0) {
        if (!r.stageId || !stageFilter.has(r.stageId)) return false;
      }
      if (dayFilter.size > 0) {
        if (!r.slotDate || !dayFilter.has(r.slotDate)) return false;
      }
      return true;
    });
  }, [rows, search, readiness, setStatusChips, stageFilter, dayFilter]);

  const gaps = filtered.filter((r) => hasGap(r.status));
  const ready = filtered.filter((r) => !hasGap(r.status));

  const anyFilter =
    !!search ||
    readiness !== "all" ||
    setStatusChips.size > 0 ||
    stageFilter.size > 0 ||
    dayFilter.size > 0;

  function clearFilters() {
    setSearch("");
    setReadiness("all");
    setSetStatusChips(new Set());
    setStageFilter(new Set());
    setDayFilter(new Set());
  }

  function toggleInSet<T>(s: Set<T>, value: T): Set<T> {
    const next = new Set(s);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function cellHref(artistId: string, tab: LogisticsTab): Route {
    return `/artists/${artistId}?focus=${tab}` as Route;
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="space-y-3 rounded-md border border-[--color-border] bg-[--color-surface]/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search artist or agency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-1.5 text-sm text-[--color-fg] placeholder:text-[--color-fg-subtle] focus:border-brand focus:outline-none"
          />
          <div className="flex items-center gap-1 rounded-md border border-[--color-border] p-0.5">
            {(["all", "gaps", "ready"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setReadiness(v)}
                className={`text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-[--radius-sm] transition-colors ${
                  readiness === v
                    ? "bg-[--color-surface-raised] text-[--color-fg]"
                    : "text-[--color-fg-subtle] hover:text-[--color-fg]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {anyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] hover:text-brand transition-colors"
            >
              clear
            </button>
          )}
        </div>

        <ChipRow
          label="Set"
          options={setStatusOptions.map((s) => ({
            id: s,
            label: s === "no_set" ? "no set" : s.replace(/_/g, " "),
          }))}
          selected={setStatusChips}
          onToggle={(id) =>
            setSetStatusChips(
              toggleInSet(setStatusChips, id as SetStatusFilter),
            )
          }
        />

        {stageOptions.length > 0 && (
          <ChipRow
            label="Stage"
            options={stageOptions.map((s) => ({ id: s.id, label: s.name }))}
            selected={stageFilter}
            onToggle={(id) => setStageFilter(toggleInSet(stageFilter, id))}
          />
        )}

        {dayOptions.length > 0 && (
          <ChipRow
            label="Day"
            options={dayOptions.map((d) => ({ id: d, label: d }))}
            selected={dayFilter}
            onToggle={(id) => setDayFilter(toggleInSet(dayFilter, id))}
          />
        )}
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
        <span>
          <span className="text-coral font-medium">{gaps.length}</span> with
          gaps
        </span>
        <span>
          <span className="text-brand font-medium">{ready.length}</span> ready
        </span>
        <span>
          {filtered.length} shown / {rows.length} total
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[--color-border]">
        <table className="w-full min-w-[700px] border-collapse bg-[--color-surface]">
          <thead>
            <tr className="border-b border-[--color-border] bg-[--color-surface-raised]">
              {COLS.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-muted] font-normal whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={COLS.length}
                  className="px-3 py-8 text-center text-[11px] text-[--color-fg-subtle]"
                >
                  {rows.length === 0
                    ? "No artists yet."
                    : "No artists match the current filters."}
                </td>
              </tr>
            )}
            {/* Gap artists first, then ready */}
            {[...gaps, ...ready].map((row) => {
              const gap = hasGap(row.status);
              const aid = row.artist.id;
              return (
                <tr
                  key={aid}
                  className={
                    gap
                      ? "hover:bg-[rgba(255,107,122,0.04)]"
                      : "hover:bg-white/2"
                  }
                >
                  <td className="px-3 py-2 border-b border-[--color-border]">
                    <div className="flex items-center gap-2 min-w-0">
                      {gap && (
                        <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/artists/${aid}` as Route}
                          className="text-[13px] text-[--color-fg] hover:text-brand transition-colors truncate block"
                        >
                          {row.artist.name}
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] text-[--color-fg-subtle] truncate">
                          {row.artist.agency && (
                            <span className="truncate">
                              {row.artist.agency}
                            </span>
                          )}
                          {(row.stageName || row.slotDate) && (
                            <span className="text-mono whitespace-nowrap">
                              {row.stageName ?? ""}
                              {row.stageName && row.slotDate ? " - " : ""}
                              {row.slotDate ?? ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <SetCell
                    status={row.status}
                    onClick={() => (window.location.href = "/lineup")}
                  />
                  <FlightCell
                    status={row.status}
                    onClick={() =>
                      (window.location.href = cellHref(aid, "travel"))
                    }
                  />
                  <HotelCell
                    status={row.status}
                    onClick={() =>
                      (window.location.href = cellHref(aid, "stay"))
                    }
                  />
                  <GroundCell
                    status={row.status}
                    onClick={() =>
                      (window.location.href = cellHref(aid, "ground"))
                    }
                  />
                  <ContractCell
                    status={row.status}
                    onClick={() =>
                      (window.location.href = cellHref(aid, "docs"))
                    }
                  />
                  <PaymentCell
                    status={row.status}
                    onClick={() =>
                      (window.location.href = cellHref(aid, "money"))
                    }
                  />
                  <RiderCell
                    status={row.status}
                    onClick={() =>
                      (window.location.href = cellHref(aid, "docs"))
                    }
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
        gaps first. click any cell to jump to that module on the artist cockpit.
      </p>
    </div>
  );
}

// ---- chip row --------------------------------------------------------------

function ChipRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1 flex-wrap">
        {options.map((o) => {
          const on = selected.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={`text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-md border transition-colors ${
                on
                  ? "border-brand text-brand bg-brand/10"
                  : "border-[--color-border] text-[--color-fg-subtle] hover:border-[--color-border-strong] hover:text-[--color-fg]"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
