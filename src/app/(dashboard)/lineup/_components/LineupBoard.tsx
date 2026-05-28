"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CreatableCombobox, {
  type ComboOption,
} from "@/components/ui/CreatableCombobox";
import ArtistForm from "@/app/(dashboard)/artists/_components/ArtistForm";
import { formatCents } from "@/lib/utils";
import type { SetStatus } from "@/lib/lineup/schema";
import type { Artist } from "@/lib/artists/repo";
import type {
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

// ---- utility ---------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toArtistComboOptions(arr: ArtistOption[]): ComboOption[] {
  return arr.map((a) => ({ id: a.id, label: a.name, sublabel: a.agency }));
}

/** Create an artist via the API and return it as an ArtistOption. */
async function createArtistByName(name: string): Promise<ArtistOption | null> {
  const res = await fetch("/api/artists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, slug: slugify(name) }),
  });
  if (!res.ok) return null;
  const { artist } = await res.json();
  return { id: artist.id, name: artist.name, agency: artist.agency ?? null };
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
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
        }}
      />
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

// ---- "Create slot" sheet (times only) --------------------------------------

interface SlotSheetProps {
  day: string;
  stageId: string;
  stageName: string;
  onClose: () => void;
  onSaved: () => void;
}

function SlotSheet({
  day,
  stageId,
  stageName,
  onClose,
  onSaved,
}: SlotSheetProps) {
  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("23:30");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, date: day, startTime, endTime }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't create slot.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet title="New slot" onClose={onClose}>
      <p className="text-[12px] text-[--color-fg-subtle] mb-5">
        {stageName} - {day}
      </p>
      <form onSubmit={submit} className="space-y-5">
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

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create slot"}
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
  slotStartTime: string;
  slotEndTime: string;
  onClose: () => void;
  onSaved: () => void;
}

function EditSetSheet({
  set,
  isLastOnSlot,
  slotId,
  slotStartTime,
  slotEndTime,
  onClose,
  onSaved,
}: EditSetSheetProps) {
  const [status, setStatus] = useState<SetStatus>(set.status as SetStatus);
  const [startTime, setStartTime] = useState(slotStartTime);
  const [endTime, setEndTime] = useState(slotEndTime);
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

    const setRes = await fetch(`/api/sets/${set.id}`, {
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
    if (!setRes.ok) {
      setSaving(false);
      const body = await setRes.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }

    if (startTime !== slotStartTime || endTime !== slotEndTime) {
      const slotRes = await fetch(`/api/slots/${slotId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      if (!slotRes.ok) {
        setSaving(false);
        const body = await slotRes.json().catch(() => ({}));
        setError(body.error ?? "Set saved, but couldn't update times.");
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  async function remove() {
    const msg = isLastOnSlot
      ? `Remove ${set.artist.name} from this slot? The slot will become empty.`
      : `Remove ${set.artist.name} from this slot?`;
    if (!confirm(msg)) return;

    setRemoving(true);
    const res = await fetch(`/api/sets/${set.id}`, { method: "DELETE" });
    setRemoving(false);
    if (!res.ok) {
      setError("Couldn't remove.");
      return;
    }
    onSaved();
  }

  return (
    <Sheet title={set.artist.name} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
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

        <div className="space-y-1.5">
          <Label>Announce batch</Label>
          <Input
            value={announceBatch}
            onChange={(e) => setAnnounceBatch(e.target.value)}
            placeholder="Batch 1"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Agency override</Label>
          <Input
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder={set.artist.agency ?? ""}
          />
        </div>

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

        <div className="pt-4 border-t border-[--color-border]">
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="text-[12px] text-coral hover:text-coral/80 transition-colors"
          >
            {removing ? "Removing..." : "Remove from slot"}
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
  onAssign: (slotId: string, artistId: string) => Promise<void>;
  onSwap: (setId: string, artistId: string) => Promise<void>;
  onDeleteSlot: (slotId: string) => Promise<void>;
  onEditSet: (set: SetWithArtist) => void;
  onAddB2b: (slot: SlotWithSets) => void;
  /** Open the full create-artist sheet. When `swapSetId` is non-null the
   *  new artist replaces that existing set; otherwise they're assigned
   *  to the slot. */
  onRequestCreate: (slotId: string, swapSetId: string | null) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function SlotCard({
  slot,
  stageColor,
  artists,
  onAssign,
  onSwap,
  onDeleteSlot,
  onEditSet,
  onAddB2b,
  onRequestCreate,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
}: SlotCardProps) {
  const [swapping, setSwapping] = useState<string | null>(null);
  const isEmpty = slot.sets.length === 0;
  const isB2b = slot.sets.length > 1;

  return (
    <div
      onDragOver={onDragOver}
      className={`border rounded-md p-2.5 transition-opacity ${
        isDragging
          ? "border-brand/60 opacity-40"
          : "border-[--color-border-subtle] hover:border-[--color-border]"
      }`}
    >
      {/* Time header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-[--color-fg] cursor-grab active:cursor-grabbing select-none leading-none"
            title="Drag to reorder"
          >
            ::
          </span>
          <span className="text-mono text-[11px] text-[--color-fg-muted] tabular-nums">
            {slot.startTime}
            <span className="text-[--color-fg-subtle] mx-0.5">-</span>
            {slot.endTime}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
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
          )}
          {isEmpty && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Delete this slot (${slot.startTime}-${slot.endTime})?`,
                  )
                ) {
                  void onDeleteSlot(slot.id);
                }
              }}
              className="text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral transition-colors"
              title="Delete empty slot"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {isEmpty ? (
        <div className="py-1 space-y-1.5">
          <CreatableCombobox
            options={toArtistComboOptions(artists)}
            value=""
            onChange={(id) => void onAssign(slot.id, id)}
            placeholder="Search artist..."
            emptyText="No artists found"
          />
          <button
            type="button"
            onClick={() => onRequestCreate(slot.id, null)}
            className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand transition-colors"
          >
            + new artist
          </button>
        </div>
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
              {swapping === s.id ? (
                <div className="space-y-1">
                  <CreatableCombobox
                    options={toArtistComboOptions(
                      artists.filter(
                        (a) =>
                          !slot.sets.some(
                            (other) =>
                              other.id !== s.id && other.artistId === a.id,
                          ),
                      ),
                    )}
                    value={s.artistId}
                    onChange={async (newId) => {
                      if (newId === s.artistId) {
                        setSwapping(null);
                        return;
                      }
                      await onSwap(s.id, newId);
                      setSwapping(null);
                    }}
                    placeholder="Swap to..."
                    emptyText="No other artists"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSwapping(null);
                        onRequestCreate(slot.id, s.id);
                      }}
                      className="text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand transition-colors"
                    >
                      + new artist
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwapping(null)}
                      className="text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-[--color-fg] transition-colors"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background:
                        stageColor ??
                        s.artist.color ??
                        "var(--color-fg-subtle)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSwapping(s.id)}
                    className="flex-1 min-w-0 text-left truncate text-[13px] text-[--color-fg] hover:text-brand transition-colors"
                    title="Click to swap artist"
                  >
                    {s.artist.name}
                  </button>
                  <Link
                    href={`/artists/${s.artist.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand transition-colors shrink-0"
                    title="Open artist page"
                  >
                    open
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEditSet(s)}
                    className={`text-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-px rounded-md shrink-0 ${STATUS_PILL[s.status as SetStatus]} hover:opacity-80`}
                  >
                    {STATUS_LABEL[s.status as SetStatus]}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- "Add b2b" sheet -------------------------------------------------------

interface AddB2bSheetProps {
  slotId: string;
  slotLabel: string;
  artists: ArtistOption[];
  existingArtistIds: string[];
  onArtistsChange: (next: ArtistOption[]) => void;
  onClose: () => void;
  onSaved: () => void;
}

function AddB2bSheet({
  slotId,
  slotLabel,
  artists,
  existingArtistIds,
  onArtistsChange,
  onClose,
  onSaved,
}: AddB2bSheetProps) {
  const available = artists.filter((a) => !existingArtistIds.includes(a.id));
  const [artistId, setArtistId] = useState("");
  const [status, setStatus] = useState<SetStatus>("option");
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
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slotId, artistId, status }),
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
    <Sheet title="Add b2b partner" onClose={onClose}>
      <p className="text-[12px] text-[--color-fg-subtle] mb-5">{slotLabel}</p>
      <form onSubmit={submit} className="space-y-5">
        {available.length === 0 && (
          <p className="text-xs text-coral">
            All artists are already on this slot.
          </p>
        )}

        <div className="space-y-1.5">
          <Label>Artist</Label>
          <CreatableCombobox
            options={toArtistComboOptions(available)}
            value={artistId}
            onChange={setArtistId}
            placeholder="Search or create artist..."
            emptyText="No artists available"
            onCreate={async (name) => {
              const created = await createArtistByName(name);
              if (!created) return null;
              onArtistsChange([...artists, created]);
              setArtistId(created.id);
              return {
                id: created.id,
                label: created.name,
                sublabel: created.agency,
              };
            }}
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

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving || !artistId}>
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

// ---- main board ------------------------------------------------------------

export default function LineupBoard({ day, grid, artists }: Props) {
  const router = useRouter();

  // Local artists list so inline-created ones show up immediately across the
  // board without waiting for a server refresh.
  const [localArtists, setLocalArtists] = useState<ArtistOption[]>(artists);

  // Sheet state
  const [createSlotFor, setCreateSlotFor] = useState<{
    stageId: string;
    stageName: string;
  } | null>(null);
  const [b2bSlot, setB2bSlot] = useState<SlotWithSets | null>(null);
  const [editingSet, setEditingSet] = useState<{
    set: SetWithArtist;
    slot: SlotWithSets;
  } | null>(null);
  // When set, the create-artist sheet is open. `swapSetId` non-null means
  // the new artist replaces an existing set; null means assign to the
  // empty slot.
  const [createArtistFor, setCreateArtistFor] = useState<{
    slotId: string;
    swapSetId: string | null;
  } | null>(null);

  const [error, setError] = useState("");

  // Drag-to-reorder state. localOrder[stageId] is a list of slot ids that
  // overrides the default order while the operator is dragging.
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<
    Record<string, string[] | undefined>
  >({});

  const refresh = useCallback(() => router.refresh(), [router]);

  // Assign an artist to an existing empty slot.
  async function assignArtist(slotId: string, artistId: string) {
    setError("");
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slotId, artistId, status: "option" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't assign artist.");
      return;
    }
    refresh();
  }

  // Swap the artist on an existing set.
  async function swapArtist(setId: string, artistId: string) {
    setError("");
    const res = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artistId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't swap artist.");
      return;
    }
    refresh();
  }

  async function deleteSlot(slotId: string) {
    setError("");
    const res = await fetch(`/api/slots/${slotId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete slot.");
      return;
    }
    refresh();
  }

  // Find the full slot for a given set (needed for edit sheet's time fields).
  function slotForSet(setId: string): SlotWithSets | undefined {
    for (const { slots } of grid) {
      for (const slot of slots) {
        if (slot.sets.some((s) => s.id === setId)) return slot;
      }
    }
  }

  // Default order: sortOrder (manual override) first, then startTime as a
  // tiebreaker. Operator can drag slots within a stage to override the
  // chronological default - useful for nights that cross midnight.
  function defaultOrder(stageSlots: SlotWithSets[]): SlotWithSets[] {
    return [...stageSlots].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  // Apply any in-flight localOrder override on top of the default order.
  function displaySlots(
    stageId: string,
    stageSlots: SlotWithSets[],
  ): SlotWithSets[] {
    const order = localOrder[stageId];
    const base = defaultOrder(stageSlots);
    if (!order) return base;
    const byId = new Map(base.map((s) => [s.id, s]));
    return order
      .map((id) => byId.get(id))
      .filter((s): s is SlotWithSets => !!s);
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
    const current =
      localOrder[stageId] ?? defaultOrder(stageSlots).map((s) => s.id);
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
    const baseline = defaultOrder(stageSlots).map((s) => s.id);
    if (order.every((id, i) => id === baseline[i])) {
      setLocalOrder((o) => ({ ...o, [stageId]: undefined }));
      return;
    }
    const res = await fetch("/api/slots/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, date: day, slotIds: order }),
    });
    setLocalOrder((o) => ({ ...o, [stageId]: undefined }));
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save order.");
    }
    refresh();
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
                onClick={() =>
                  setCreateSlotFor({ stageId: stage.id, stageName: stage.name })
                }
                className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand transition-colors"
              >
                + slot
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
                  onClick={() =>
                    setCreateSlotFor({
                      stageId: stage.id,
                      stageName: stage.name,
                    })
                  }
                  className="w-full border border-dashed border-[--color-border] rounded-md py-5 text-[11px] text-[--color-fg-subtle] hover:border-brand hover:text-brand transition-colors"
                >
                  + Create first slot
                </button>
              )}

              {displaySlots(stage.id, stageSlots).map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  stageColor={stage.color}
                  artists={localArtists}
                  onAssign={assignArtist}
                  onSwap={swapArtist}
                  onDeleteSlot={deleteSlot}
                  onEditSet={(s) => {
                    const fullSlot = slotForSet(s.id) ?? slot;
                    setEditingSet({ set: s, slot: fullSlot });
                  }}
                  onAddB2b={(sl) => setB2bSlot(sl)}
                  onRequestCreate={(slotId, swapSetId) =>
                    setCreateArtistFor({ slotId, swapSetId })
                  }
                  isDragging={dragSlotId === slot.id}
                  onDragStart={() => onSlotDragStart(slot.id)}
                  onDragOver={(e) =>
                    onSlotDragOver(e, slot.id, stage.id, stageSlots)
                  }
                  onDragEnd={() => {
                    setDragSlotId(null);
                    setLocalOrder({});
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create slot sheet */}
      {createSlotFor && (
        <SlotSheet
          day={day}
          stageId={createSlotFor.stageId}
          stageName={createSlotFor.stageName}
          onClose={() => setCreateSlotFor(null)}
          onSaved={() => {
            setCreateSlotFor(null);
            refresh();
          }}
        />
      )}

      {/* Create artist sheet */}
      {createArtistFor && (
        <Sheet title="New artist" onClose={() => setCreateArtistFor(null)}>
          <ArtistForm
            onCreated={async (created: Artist) => {
              setLocalArtists((prev) => [
                ...prev,
                {
                  id: created.id,
                  name: created.name,
                  agency: created.agency,
                },
              ]);
              if (createArtistFor.swapSetId) {
                await swapArtist(createArtistFor.swapSetId, created.id);
              } else {
                await assignArtist(createArtistFor.slotId, created.id);
              }
              setCreateArtistFor(null);
            }}
          />
        </Sheet>
      )}

      {/* B2b sheet */}
      {b2bSlot && (
        <AddB2bSheet
          slotId={b2bSlot.id}
          slotLabel={`${b2bSlot.startTime} - ${b2bSlot.endTime}`}
          artists={localArtists}
          existingArtistIds={b2bSlot.sets.map((s) => s.artistId)}
          onArtistsChange={setLocalArtists}
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
          slotStartTime={editingSet.slot.startTime}
          slotEndTime={editingSet.slot.endTime}
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
