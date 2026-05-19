"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { SetStatus } from "@/lib/lineup/schema";
import type { PipelineCard } from "@/lib/lineup/repo";
import { formatCents } from "@/lib/utils";

interface Props {
  cards: PipelineCard[];
}

const STATUS_COLUMNS: { status: SetStatus; label: string }[] = [
  { status: "option", label: "Option" },
  { status: "confirmed", label: "Confirmed" },
  { status: "not_available", label: "N/A" },
  { status: "live", label: "Live" },
  { status: "done", label: "Done" },
  { status: "withdrawn", label: "Withdrawn" },
];

const COLUMN_ACCENT: Record<SetStatus, string> = {
  option: "border-l-brand/50",
  confirmed: "border-l-[--color-brand]/60",
  not_available: "border-l-[--color-danger]/50",
  live: "border-l-[--color-brand]",
  done: "border-l-[--color-fg-subtle]/50",
  withdrawn: "border-l-[--color-danger]/50",
};

const CARD_ACCENT: Record<SetStatus, string> = {
  option: "border-brand/30",
  confirmed: "border-[--color-brand]/40",
  not_available: "border-[--color-danger]/30",
  live: "border-[--color-brand]/60 shadow-[0_0_0_1px_var(--color-brand)]/30",
  done: "border-[--color-border]",
  withdrawn: "border-[--color-danger]/30 opacity-60",
};

export default function LineupPipeline({ cards }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Local optimistic status override: setId -> SetStatus
  const [override, setOverride] = useState<Record<string, SetStatus>>({});
  const [dragSetId, setDragSetId] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<SetStatus | null>(null);

  // Apply optimistic override when grouping.
  const grouped = useMemo(() => {
    const out: Record<SetStatus, PipelineCard[]> = {
      option: [],
      confirmed: [],
      not_available: [],
      live: [],
      done: [],
      withdrawn: [],
    };
    for (const c of cards) {
      const status = override[c.set.id] ?? c.set.status;
      out[status].push(c);
    }
    return out;
  }, [cards, override]);

  async function moveSet(setId: string, toStatus: SetStatus) {
    const current = cards.find((c) => c.set.id === setId);
    if (!current) return;
    const fromStatus = override[setId] ?? current.set.status;
    if (fromStatus === toStatus) return;

    // Optimistic update.
    setOverride((o) => ({ ...o, [setId]: toStatus }));
    setError("");
    setBusy(true);

    const res = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: toStatus }),
    });

    setBusy(false);

    if (!res.ok) {
      // Revert.
      setOverride((o) => {
        const next = { ...o };
        next[setId] = fromStatus;
        return next;
      });
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't move set.");
      return;
    }

    // Server confirmed -- refresh and clear override.
    setOverride((o) => {
      const next = { ...o };
      delete next[setId];
      return next;
    });
    router.refresh();
  }

  function onDragStart(setId: string) {
    setDragSetId(setId);
    setError("");
  }

  function onDragEnd() {
    setDragSetId(null);
    setHoverColumn(null);
  }

  function onColumnDragOver(
    e: React.DragEvent<HTMLDivElement>,
    status: SetStatus,
  ) {
    if (!dragSetId) return;
    e.preventDefault();
    setHoverColumn(status);
  }

  function onColumnDrop(status: SetStatus) {
    if (!dragSetId) return;
    const id = dragSetId;
    setDragSetId(null);
    setHoverColumn(null);
    void moveSet(id, status);
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-coral">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATUS_COLUMNS.map(({ status, label }) => {
          const items = grouped[status];
          const isHover = hoverColumn === status;
          return (
            <div
              key={status}
              onDragOver={(e) => onColumnDragOver(e, status)}
              onDragLeave={() => hoverColumn === status && setHoverColumn(null)}
              onDrop={() => onColumnDrop(status)}
              className={`rounded-md border border-[--color-border] bg-[--color-surface] flex flex-col min-h-[200px] border-l-2 ${COLUMN_ACCENT[status]} ${
                isHover ? "ring-1 ring-[--color-brand]/40" : ""
              } transition-all`}
            >
              <header className="px-3 py-2.5 border-b border-[--color-border] flex items-baseline justify-between">
                <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-muted]">
                  {label}
                </span>
                <span className="text-mono text-[10px] text-[--color-fg-subtle]">
                  {items.length}
                </span>
              </header>

              <div className="flex-1 p-2 space-y-1.5">
                {items.length === 0 && (
                  <div className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] text-center py-6">
                    {isHover ? "drop here" : "empty"}
                  </div>
                )}
                {items.map((c) => (
                  <Card
                    key={c.set.id}
                    card={c}
                    dragging={dragSetId === c.set.id}
                    busy={busy}
                    onDragStart={() => onDragStart(c.set.id)}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
        drag a card across columns to advance status. audit row written
        automatically.
      </p>
    </div>
  );
}

// -- Card --------------------------------------------------------------

function Card({
  card,
  dragging,
  busy,
  onDragStart,
  onDragEnd,
}: {
  card: PipelineCard;
  dragging: boolean;
  busy: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const status = card.set.status;
  const accent = CARD_ACCENT[status];

  return (
    <Link
      href={`/artists/${card.artist.id}` as Route}
      draggable={!busy}
      onDragStart={(e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        // Required for Firefox + some browsers to actually start a drag.
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.set.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // Prevent navigation if a drag is happening (DnD doesn't reliably
        // suppress the click).
        if (dragging) e.preventDefault();
      }}
      className={`block rounded-md border ${accent} bg-[--color-surface-raised] px-2.5 py-2 cursor-grab active:cursor-grabbing transition-opacity ${
        dragging ? "opacity-40" : "hover:brightness-110"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: card.stage?.color ?? "var(--color-fg-subtle)",
          }}
        />
        <span className="text-[12px] text-[--color-fg] truncate flex-1 min-w-0">
          {card.artist.name}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 text-[10px] text-[--color-fg-subtle]">
        <span className="truncate">
          {card.stage?.name ?? "no stage"}
          {card.slot ? (
            <>
              <span className="text-[--color-fg-subtle]"> · </span>
              <span className="text-mono">
                {dayShort(card.slot.date)} {card.slot.startTime}
              </span>
            </>
          ) : null}
        </span>
        {card.set.feeAmountCents != null && card.set.feeAmountCents > 0 && (
          <span
            className="text-mono shrink-0"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {formatCents(card.set.feeAmountCents)} {card.set.feeCurrency}
          </span>
        )}
      </div>

      {card.artist.agency && (
        <div className="text-[10px] text-[--color-fg-subtle] truncate mt-0.5">
          {card.artist.agency}
        </div>
      )}
    </Link>
  );
}

function dayShort(iso: string): string {
  // Render as "Sat 15 Aug" without an extra date-fns import (it's a hot
  // path while rendering cards).
  const d = new Date(`${iso}T00:00:00.000Z`);
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getUTCMonth()];
  return `${dow} ${d.getUTCDate()} ${month}`;
}
