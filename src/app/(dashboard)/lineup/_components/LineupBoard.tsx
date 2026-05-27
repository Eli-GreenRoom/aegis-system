"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/utils";
import type { SetStatus } from "@/lib/lineup/schema";
import type {
  Slot,
  SlotWithSets,
  StageWithSlots,
  SetWithArtist,
} from "@/lib/lineup/repo";

// ---- types -----------------------------------------------------------------

interface ArtistOption {
  id: string;
  name: string;
  agency: string | null;
}

interface Props {
  day: string;
  grid: StageWithSlots[];
  artists: ArtistOption[];
}

// ---- constants -------------------------------------------------------------

const STATUS_LABEL: Record<SetStatus, string> = {
  confirmed: "Confirmed",
  option: "Option",
  not_available: "N/A",
  live: "Live",
  done: "Done",
  withdrawn: "Withdrawn",
};

const STATUS_PILL: Record<SetStatus, string> = {
  confirmed: "pill-emerald",
  option: "pill-amber",
  not_available: "pill-coral",
  live: "pill-emerald",
  done: "pill-emerald",
  withdrawn: "pill-coral",
};

const SET_STATUSES: SetStatus[] = [
  "option",
  "confirmed",
  "live",
  "done",
  "not_available",
  "withdrawn",
];

// ---- artist combobox -------------------------------------------------------

function ArtistCombobox({
  artists,
  value,
  onChange,
}: {
  artists: ArtistOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selected = artists.find((a) => a.id === value);

  const filtered =
    query.length === 0
      ? artists
      : artists.filter(
          (a) =>
            a.name.toLowerCase().includes(query.toLowerCase()) ||
            (a.agency ?? "").toLowerCase().includes(query.toLowerCase()),
        );

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(a: ArtistOption) {
    onChange(a.id);
    setQuery("");
    setOpen(false);
    setFocused(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[focused]) pick(filtered[focused]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        {!open && selected ? (
          <div className="flex-1 min-w-0">
            <span className="text-sm text-[--color-fg] truncate block">
              {selected.name}
            </span>
            {selected.agency && (
              <span className="text-[10px] text-[--color-fg-subtle] truncate block">
                {selected.agency}
              </span>
            )}
          </div>
        ) : (
          <input
            autoFocus={open}
            className="flex-1 bg-transparent text-sm text-[--color-fg] outline-none placeholder:text-[--color-fg-subtle] min-w-0"
            placeholder={selected ? selected.name : "Search artist..."}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocused(0);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
          />
        )}
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-[--color-border] shadow-xl overflow-y-auto"
          style={{
            background: "var(--color-surface-raised)",
            maxHeight: "220px",
          }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-[--color-fg-subtle]">
              No artists found
            </p>
          ) : (
            filtered.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onMouseDown={() => pick(a)}
                className={`w-full text-left px-3 py-2 transition-colors ${
                  i === focused
                    ? "bg-white/[0.07] text-[--color-fg]"
                    : "hover:bg-white/4 text-[--color-fg]"
                }`}
              >
                <span className="text-sm block">{a.name}</span>
                {a.agency && (
                  <span className="text-[10px] text-[--color-fg-subtle] block">
                    {a.agency}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- slide-over sheet ------------------------------------------------------

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Trap focus, close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
        }}
      />
      {/* panel */}
      <div
        className="relative flex flex-col w-full max-w-sm h-full overflow-y-auto"
        style={{
          background: "var(--color-surface-raised)",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.6)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--color-border]">
          <h2 className="text-[15px] font-semibold text-[--color-fg]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[--color-fg-subtle] hover:text-[--color-fg] text-[18px] leading-none"
          >
            x
          </button>
        </div>
        <div className="flex-1 px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ---- "Add to lineup" sheet -------------------------------------------------

interface AddSheetProps {
  day: string;
  grid: StageWithSlots[];
  artists: ArtistOption[];
  preStageId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddSheet({
  day,
  grid,
  artists,
  preStageId,
  onClose,
  onSaved,
}: AddSheetProps) {
  const [stageId, setStageId] = useState(preStageId ?? grid[0]?.stage.id ?? "");
  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("23:30");
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [status, setStatus] = useState<SetStatus>("option");
  const [feeUsd, setFeeUsd] = useState("");
  const [feeCurrency, setFeeCurrency] = useState<"USD" | "EUR">("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!artistId) {
      setError("Pick an artist.");
      return;
    }
    setError("");
    setSaving(true);

    const feeAmountCents =
      feeUsd === "" ? null : Math.round(Number(feeUsd) * 100);

    const res = await fetch("/api/sets/quick-add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stageId,
        date: day,
        startTime,
        endTime,
        artistId,
        status,
        feeAmountCents,
        feeCurrency: feeAmountCents != null ? feeCurrency : "",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet title="Add to lineup" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {artists.length === 0 && (
          <p className="text-xs text-coral">
            No artists yet. Add some on the Artists page first.
          </p>
        )}

        {/* Stage */}
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {grid.map(({ stage }) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Start</Label>
            <Input
              type="time"
              step={60}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>End</Label>
            <Input
              type="time"
              step={60}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Artist */}
        <div className="space-y-1.5">
          <Label>Artist</Label>
          <ArtistCombobox
            artists={artists}
            value={artistId}
            onChange={setArtistId}
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SetStatus)}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {SET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Fee */}
        <div className="space-y-1.5">
          <Label>Fee (optional)</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              value={feeUsd}
              onChange={(e) => setFeeUsd(e.target.value)}
              placeholder="2500.00"
              className="flex-1"
            />
            <select
              value={feeCurrency}
              onChange={(e) => setFeeCurrency(e.target.value as "USD" | "EUR")}
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-2 py-2 text-sm text-[--color-fg]"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving || artists.length === 0}>
            {saving ? "Adding..." : "Add to lineup"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

// ---- "Add second artist" sheet (b2b) ----------------------------------------

interface AddB2bSheetProps {
  slotId: string;
  slotLabel: string;
  artists: ArtistOption[];
  existingArtistIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

function AddB2bSheet({
  slotId,
  slotLabel,
  artists,
  existingArtistIds,
  onClose,
  onSaved,
}: AddB2bSheetProps) {
  const available = artists.filter((a) => !existingArtistIds.includes(a.id));
  const [artistId, setArtistId] = useState(available[0]?.id ?? "");
  const [status, setStatus] = useState<SetStatus>("option");
  const [feeUsd, setFeeUsd] = useState("");
  const [feeCurrency, setFeeCurrency] = useState<"USD" | "EUR">("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!artistId) {
      setError("Pick an artist.");
      return;
    }
    setError("");
    setSaving(true);

    const feeAmountCents =
      feeUsd === "" ? null : Math.round(Number(feeUsd) * 100);

    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slotId,
        artistId,
        status,
        feeAmountCents,
        feeCurrency: feeAmountCents != null ? feeCurrency : "",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet title={`Add b2b partner`} onClose={onClose}>
      <p className="text-[12px] text-[--color-fg-subtle] mb-5">{slotLabel}</p>
      <form onSubmit={submit} className="space-y-5">
        {available.length === 0 && (
          <p className="text-xs text-coral">
            All artists are already on this slot.
          </p>
        )}

        <div className="space-y-1.5">
          <Label>Artist</Label>
          <ArtistCombobox
            artists={available}
            value={artistId}
            onChange={setArtistId}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SetStatus)}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {SET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Fee (optional)</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              value={feeUsd}
              onChange={(e) => setFeeUsd(e.target.value)}
              placeholder="2500.00"
              className="flex-1"
            />
            <select
              value={feeCurrency}
              onChange={(e) => setFeeCurrency(e.target.value as "USD" | "EUR")}
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-2 py-2 text-sm text-[--color-fg]"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving || available.length === 0}>
            {saving ? "Adding..." : "Add b2b partner"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

// ---- Edit set sheet --------------------------------------------------------

interface EditSetSheetProps {
  set: SetWithArtist;
  isLastOnSlot: boolean;
  slotId: string;
  onClose: () => void;
  onSaved: () => void;
}

function EditSetSheet({
  set,
  isLastOnSlot,
  slotId,
  onClose,
  onSaved,
}: EditSetSheetProps) {
  const [status, setStatus] = useState<SetStatus>(set.status as SetStatus);
  const [announceBatch, setAnnounceBatch] = useState(set.announceBatch ?? "");
  const [feeUsd, setFeeUsd] = useState(
    set.feeAmountCents != null ? (set.feeAmountCents / 100).toFixed(2) : "",
  );
  const [feeCurrency, setFeeCurrency] = useState<"USD" | "EUR">(
    (set.feeCurrency as "USD" | "EUR") ?? "USD",
  );
  const [agency, setAgency] = useState(set.agency ?? "");
  const [comments, setComments] = useState(set.comments ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const feeAmountCents =
      feeUsd === "" ? null : Math.round(Number(feeUsd) * 100);
    const res = await fetch(`/api/sets/${set.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        announceBatch,
        feeAmountCents,
        feeCurrency: feeAmountCents != null ? feeCurrency : "",
        agency,
        comments,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }
    onSaved();
  }

  async function remove() {
    const msg = isLastOnSlot
      ? `Remove ${set.artist.name} from this slot? The empty slot will also be deleted.`
      : `Remove ${set.artist.name} from this slot?`;
    if (!confirm(msg)) return;

    setRemoving(true);
    // Delete the set first
    const res = await fetch(`/api/sets/${set.id}`, { method: "DELETE" });
    if (!res.ok) {
      setRemoving(false);
      setError("Couldn't remove.");
      return;
    }
    // If last artist on slot, delete the slot too
    if (isLastOnSlot) {
      await fetch(`/api/slots/${slotId}`, { method: "DELETE" });
    }
    setRemoving(false);
    onSaved();
  }

  return (
    <Sheet title={set.artist.name} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SetStatus)}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {SET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Fee */}
        <div className="space-y-1.5">
          <Label>Fee</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              value={feeUsd}
              onChange={(e) => setFeeUsd(e.target.value)}
              placeholder="0.00"
              className="flex-1"
            />
            <select
              value={feeCurrency}
              onChange={(e) => setFeeCurrency(e.target.value as "USD" | "EUR")}
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-2 py-2 text-sm text-[--color-fg]"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {set.feeAmountCents != null && (
            <p className="text-mono text-[10px] text-[--color-fg-subtle]">
              current: {set.feeCurrency ?? "USD"}{" "}
              {formatCents(set.feeAmountCents)}
            </p>
          )}
        </div>

        {/* Announce batch */}
        <div className="space-y-1.5">
          <Label>Announce batch</Label>
          <Input
            value={announceBatch}
            onChange={(e) => setAnnounceBatch(e.target.value)}
            placeholder="Batch 1"
          />
        </div>

        {/* Agency override */}
        <div className="space-y-1.5">
          <Label>Agency override</Label>
          <Input
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder={set.artist.agency ?? ""}
          />
        </div>

        {/* Comments */}
        <div className="space-y-1.5">
          <Label>Comments</Label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] resize-none placeholder:text-[--color-fg-subtle] outline-none focus:border-brand"
            placeholder="Internal notes..."
          />
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Danger zone */}
        <div className="pt-4 border-t border-[--color-border]">
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="text-[12px] text-coral hover:text-coral/80 transition-colors"
          >
            {removing ? "Removing..." : "Remove from lineup"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

// ---- Slot card -------------------------------------------------------------

interface SlotCardProps {
  slot: SlotWithSets;
  stageColor: string | null;
  artists: ArtistOption[];
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEditSet: (set: SetWithArtist) => void;
  onAddB2b: (slot: SlotWithSets) => void;
}

function SlotCard({
  slot,
  stageColor,
  artists,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEditSet,
  onAddB2b,
}: SlotCardProps) {
  const isB2b = slot.sets.length > 1;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`border rounded-md p-2.5 cursor-move transition-opacity select-none ${
        isDragging
          ? "border-brand/60 opacity-40"
          : "border-[--color-border-subtle] hover:border-[--color-border]"
      }`}
    >
      {/* Time header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-mono text-[11px] text-[--color-fg-muted] tabular-nums">
          {slot.startTime}
          <span className="text-[--color-fg-subtle] mx-0.5">-</span>
          {slot.endTime}
        </span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            onAddB2b(slot);
          }}
          className="text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand transition-colors"
          title="Add b2b partner"
        >
          + b2b
        </button>
      </div>

      {/* Sets */}
      {slot.sets.length === 0 ? (
        <p className="text-[11px] text-[--color-fg-subtle] italic">empty</p>
      ) : (
        <ul className="space-y-1.5">
          {slot.sets.map((s, idx) => (
            <li key={s.id}>
              {isB2b && idx > 0 && (
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="flex-1 h-px bg-[--color-border]" />
                  <span className="text-mono text-[8px] uppercase tracking-[0.2em] text-[--color-fg-subtle] px-1">
                    b2b
                  </span>
                  <div className="flex-1 h-px bg-[--color-border]" />
                </div>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      stageColor ?? s.artist.color ?? "var(--color-fg-subtle)",
                  }}
                />
                <Link
                  href={`/artists/${s.artist.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 truncate text-[13px] text-[--color-fg] hover:text-brand transition-colors"
                >
                  {s.artist.name}
                </Link>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onEditSet(s);
                  }}
                  className={`text-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-px rounded-md shrink-0 ${STATUS_PILL[s.status as SetStatus]} hover:opacity-80`}
                >
                  {STATUS_LABEL[s.status as SetStatus]}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- main board ------------------------------------------------------------

export default function LineupBoard({ day, grid, artists }: Props) {
  const router = useRouter();

  // Sheet state
  const [showAdd, setShowAdd] = useState(false);
  const [addPreStageId, setAddPreStageId] = useState<string | undefined>();
  const [b2bSlot, setB2bSlot] = useState<SlotWithSets | null>(null);
  const [editingSet, setEditingSet] = useState<{
    set: SetWithArtist;
    slot: SlotWithSets;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Drag state
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<
    Record<string, string[] | undefined>
  >({});

  const refresh = useCallback(() => router.refresh(), [router]);

  function openAdd(stageId?: string) {
    setAddPreStageId(stageId);
    setShowAdd(true);
  }

  function onSlotDragStart(slotId: string) {
    setDragSlotId(slotId);
    setError("");
  }

  function onSlotDragOver(
    e: React.DragEvent,
    targetSlotId: string,
    stageId: string,
    stageSlots: SlotWithSets[],
  ) {
    if (!dragSlotId || dragSlotId === targetSlotId) return;
    const sourceBelongs = stageSlots.some((s) => s.id === dragSlotId);
    if (!sourceBelongs) return;
    e.preventDefault();
    const current = localOrder[stageId] ?? stageSlots.map((s) => s.id);
    const fromIdx = current.indexOf(dragSlotId);
    const toIdx = current.indexOf(targetSlotId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const next = [...current];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragSlotId);
    setLocalOrder((o) => ({ ...o, [stageId]: next }));
  }

  async function onSlotDrop(stageId: string, stageSlots: SlotWithSets[]) {
    const order = localOrder[stageId];
    setDragSlotId(null);
    if (!order) return;
    const baseline = stageSlots.map((s) => s.id);
    if (order.every((id, i) => id === baseline[i])) {
      setLocalOrder((o) => ({ ...o, [stageId]: undefined }));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/slots/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, day, slotIds: order }),
    });
    setBusy(false);
    setLocalOrder((o) => ({ ...o, [stageId]: undefined }));
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save order.");
    }
    refresh();
  }

  function displaySlots(
    stageId: string,
    stageSlots: SlotWithSets[],
  ): SlotWithSets[] {
    const order = localOrder[stageId];
    if (!order) return stageSlots;
    const byId = new Map(stageSlots.map((s) => [s.id, s]));
    return order
      .map((id) => byId.get(id))
      .filter((s): s is SlotWithSets => !!s);
  }

  // Find the full slot for a given set (needed for edit sheet)
  function slotForSet(setId: string): SlotWithSets | undefined {
    for (const { slots } of grid) {
      for (const slot of slots) {
        if (slot.sets.some((s) => s.id === setId)) return slot;
      }
    }
  }

  return (
    <>
      {error && <p className="text-sm text-coral mb-3">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {grid.map(({ stage, slots: stageSlots }) => (
          <div
            key={stage.id}
            className="stage-wash border rounded-md flex flex-col"
            style={
              {
                "--stage-color": stage.color ?? undefined,
              } as React.CSSProperties
            }
          >
            {/* Stage header */}
            <header className="flex items-center justify-between px-3 py-2 border-b border-[--color-border]">
              <div className="flex items-center gap-2">
                <span className="text-display text-[13pt] stage-text leading-none">
                  {stage.name}
                </span>
                <span className="text-mono text-[10px] text-[--color-fg-subtle]">
                  {stageSlots.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openAdd(stage.id)}
                disabled={busy}
                className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand transition-colors"
              >
                + add
              </button>
            </header>

            {/* Slots */}
            <div
              className="flex-1 p-2 space-y-2 min-h-20"
              onDrop={() => onSlotDrop(stage.id, stageSlots)}
              onDragOver={(e) => {
                if (dragSlotId) e.preventDefault();
              }}
            >
              {stageSlots.length === 0 && (
                <button
                  type="button"
                  onClick={() => openAdd(stage.id)}
                  className="w-full border border-dashed border-[--color-border] rounded-md py-5 text-[11px] text-[--color-fg-subtle] hover:border-brand hover:text-brand transition-colors"
                >
                  + Add to lineup
                </button>
              )}

              {displaySlots(stage.id, stageSlots).map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  stageColor={stage.color}
                  artists={artists}
                  isDragging={dragSlotId === slot.id}
                  onDragStart={() => onSlotDragStart(slot.id)}
                  onDragOver={(e) =>
                    onSlotDragOver(e, slot.id, stage.id, stageSlots)
                  }
                  onDragEnd={() => {
                    setDragSlotId(null);
                    setLocalOrder({});
                  }}
                  onEditSet={(s) => {
                    const fullSlot = slotForSet(s.id) ?? slot;
                    setEditingSet({ set: s, slot: fullSlot });
                  }}
                  onAddB2b={(sl) => setB2bSlot(sl)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add sheet */}
      {showAdd && (
        <AddSheet
          day={day}
          grid={grid}
          artists={artists}
          preStageId={addPreStageId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}

      {/* B2b sheet */}
      {b2bSlot && (
        <AddB2bSheet
          slotId={b2bSlot.id}
          slotLabel={`${b2bSlot.startTime} - ${b2bSlot.endTime}`}
          artists={artists}
          existingArtistIds={b2bSlot.sets.map((s) => s.artistId)}
          onClose={() => setB2bSlot(null)}
          onSaved={() => {
            setB2bSlot(null);
            refresh();
          }}
        />
      )}

      {/* Edit set sheet */}
      {editingSet && (
        <EditSetSheet
          set={editingSet.set}
          slotId={editingSet.slot.id}
          isLastOnSlot={editingSet.slot.sets.length === 1}
          onClose={() => setEditingSet(null)}
          onSaved={() => {
            setEditingSet(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
