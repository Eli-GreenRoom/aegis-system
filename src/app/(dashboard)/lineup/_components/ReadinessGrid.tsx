"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ArtistStatusSummary } from "@/lib/artists/status-types";
import { hasGap } from "@/lib/artists/status-types";

export interface ReadinessRow {
  artist: { id: string; name: string; agency: string | null };
  status: ArtistStatusSummary;
}

interface Props {
  rows: ReadinessRow[];
}

// ---- cell helpers ----------------------------------------------------------

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-[11px] whitespace-nowrap border-b border-[--color-border]">
      {children}
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

function SetCell({ status }: { status: ArtistStatusSummary }) {
  if (!status.setStatus)
    return (
      <Cell>
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
    <Cell>
      <span className={`${cls} text-[9px] uppercase tracking-[0.1em]`}>
        {status.setStatus}
      </span>
    </Cell>
  );
}

function FlightCell({ status }: { status: ArtistStatusSummary }) {
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
      <Cell>
        <PillMissing />
      </Cell>
    );
  if (!inOk || !outOk)
    return (
      <Cell>
        <PillWarn label={!inOk ? "no inbound" : "no outbound"} />
      </Cell>
    );
  return (
    <Cell>
      <PillOk label={`in + out`} />
    </Cell>
  );
}

function HotelCell({ status }: { status: ArtistStatusSummary }) {
  if (!status.needsHotel)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.hotelStatus)
    return (
      <Cell>
        <PillMissing />
      </Cell>
    );
  const ok = ["booked", "checked_in", "checked_out"].includes(
    status.hotelStatus,
  );
  if (ok)
    return (
      <Cell>
        <PillOk label={status.hotelStatus} />
      </Cell>
    );
  if (status.hotelStatus === "cancelled" || status.hotelStatus === "no_show")
    return (
      <Cell>
        <PillMissing />
      </Cell>
    );
  return (
    <Cell>
      <PillWarn label={status.hotelStatus} />
    </Cell>
  );
}

function GroundCell({ status }: { status: ArtistStatusSummary }) {
  if (!status.needsGround)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.groundStatus)
    return (
      <Cell>
        <PillMissing />
      </Cell>
    );
  const ok = ["completed"].includes(status.groundStatus);
  const warn = ["scheduled", "dispatched", "in_transit"].includes(
    status.groundStatus,
  );
  if (ok)
    return (
      <Cell>
        <PillOk label="scheduled" />
      </Cell>
    );
  if (warn)
    return (
      <Cell>
        <PillWarn label={status.groundStatus} />
      </Cell>
    );
  return (
    <Cell>
      <PillMissing />
    </Cell>
  );
}

function ContractCell({ status }: { status: ArtistStatusSummary }) {
  if (!status.needsContract)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (!status.contractStatus)
    return (
      <Cell>
        <PillMissing />
      </Cell>
    );
  if (status.contractStatus === "signed")
    return (
      <Cell>
        <PillOk label="signed" />
      </Cell>
    );
  return (
    <Cell>
      <PillWarn label={status.contractStatus} />
    </Cell>
  );
}

function PaymentCell({ status }: { status: ArtistStatusSummary }) {
  if (!status.needsPayment)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (status.outstandingPayments > 0)
    return (
      <Cell>
        <PillWarn label={`${status.outstandingPayments} pending`} />
      </Cell>
    );
  return (
    <Cell>
      <PillOk label="clear" />
    </Cell>
  );
}

function RiderCell({ status }: { status: ArtistStatusSummary }) {
  if (!status.needsRider)
    return (
      <Cell>
        <PillNA />
      </Cell>
    );
  if (status.ridersReady === null)
    return (
      <Cell>
        <PillMissing />
      </Cell>
    );
  if (status.ridersReady)
    return (
      <Cell>
        <PillOk label="confirmed" />
      </Cell>
    );
  return (
    <Cell>
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

export default function ReadinessGrid({ rows }: Props) {
  const gaps = rows.filter((r) => hasGap(r.status));
  const ready = rows.filter((r) => !hasGap(r.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
        <span>
          <span className="text-coral font-medium">{gaps.length}</span> with
          gaps
        </span>
        <span>
          <span className="text-brand font-medium">{ready.length}</span> ready
        </span>
        <span>{rows.length} total</span>
      </div>

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
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLS.length}
                  className="px-3 py-8 text-center text-[11px] text-[--color-fg-subtle]"
                >
                  No artists yet.
                </td>
              </tr>
            )}
            {/* Gap artists first, then ready */}
            {[...gaps, ...ready].map((row) => {
              const gap = hasGap(row.status);
              return (
                <tr
                  key={row.artist.id}
                  className={
                    gap
                      ? "hover:bg-[rgba(255,107,122,0.04)]"
                      : "hover:bg-white/[0.02]"
                  }
                >
                  <td className="px-3 py-2 border-b border-[--color-border]">
                    <div className="flex items-center gap-2 min-w-0">
                      {gap && (
                        <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/artists/${row.artist.id}` as Route}
                          className="text-[13px] text-[--color-fg] hover:text-brand transition-colors truncate block"
                        >
                          {row.artist.name}
                        </Link>
                        {row.artist.agency && (
                          <div className="text-[10px] text-[--color-fg-subtle] truncate">
                            {row.artist.agency}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <SetCell status={row.status} />
                  <FlightCell status={row.status} />
                  <HotelCell status={row.status} />
                  <GroundCell status={row.status} />
                  <ContractCell status={row.status} />
                  <PaymentCell status={row.status} />
                  <RiderCell status={row.status} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
        gaps listed first. click an artist name to open their cockpit. mark
        modules N/A on the artist edit form.
      </p>
    </div>
  );
}
