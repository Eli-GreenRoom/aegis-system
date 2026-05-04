"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/utils";
import type {
  Day,
  SetStatus,
} from "@/lib/lineup/schema";
import type { StageWithSlots, SetWithArtist } from "@/lib/lineup/repo";

interface ArtistOption {
  id: string;
  name: string;
  agency: string | null;
}

interface Props {
  day: Day;
  grid: StageWithSlots[];
  artists: ArtistOption[];
}

const STATUS_LABEL: Record<SetStatus, string> = {
  confirmed: "Confirmed",
  option: "Option",
  not_available: "N/A",
};

const STATUS_CLASSES: Record<SetStatus, string> = {
  confirmed: "border-[--color-brand-mint]/40 text-mint",
  option: "border-brand/40 text-brand",
  not_available: "border-[--color-brand-coral]/40 text-coral",
};

export default function LineupBoard({ day, grid, artists }: Props) {
  const router = useRouter();
  const [addSlotForStage, setAddSlotForStage] = useState<string | null>(null);
  const [addSetForSlot, setAddSetForSlot] = useState<string | null>(null);
  const [editSet, setEditSet] = useState<SetWithArtist | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteSlot(id: string) {
    if (!confirm("Delete this slot? Any sets on it will be deleted too.")) return;
    setBusy(true);
    const res = await fetch(`/api/slots/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't delete slot.");
      return;
    }
    router.refresh();
  }

  async function deleteSet(id: string) {
    if (!confirm("Remove this artist from the slot?")) return;
    setBusy(true);
    const res = await fetch(`/api/sets/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't delete set.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error && <p className="text-sm text-coral mb-3">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {grid.map(({ stage, slots }) => (
          <div
            key={stage.id}
            className="border border-[--color-border] rounded-md flex flex-col"
          >
            <header className="flex items-center justify-between px-3 py-2 border-b border-[--color-border]">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: stage.color ?? "var(--color-fg-subtle)" }}
                />
                <span className="text-[13px] text-[--color-fg]">{stage.name}</span>
                <span className="text-mono text-[10px] text-[--color-fg-subtle]">
                  {slots.length}
                </span>
              </div>
              <button
                onClick={() => setAddSlotForStage(stage.id)}
                disabled={busy}
                className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
              >
                + slot
              </button>
            </header>

            <div className="flex-1 p-2 space-y-2 min-h-20">
              {slots.length === 0 && (
                <p className="text-[--color-fg-subtle] text-[12px] italic px-1 py-2">
                  No slots.
                </p>
              )}
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="border border-[--color-border-subtle] rounded-md p-2"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-mono text-[12px] text-[--color-fg]">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAddSetForSlot(slot.id)}
                        disabled={busy}
                        className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                      >
                        + set
                      </button>
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        disabled={busy}
                        className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral"
                      >
                        x
                      </button>
                    </div>
                  </div>

                  {slot.sets.length === 0 ? (
                    <p className="text-[--color-fg-subtle] text-[11px] italic">empty</p>
                  ) : (
                    <ul className="space-y-1">
                      {slot.sets.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 text-[12px]"
                        >
                          <button
                            onClick={() => setEditSet(s)}
                            className="flex items-center gap-2 text-left flex-1 min-w-0 hover:text-brand"
                          >
                            <span className="truncate text-[--color-fg]">{s.artist.name}</span>
                            {s.artist.agency && (
                              <span className="text-mono text-[10px] text-[--color-fg-subtle] truncate">
                                {s.artist.agency}
                              </span>
                            )}
                          </button>
                          <span
                            className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${STATUS_CLASSES[s.status as SetStatus]}`}
                          >
                            {STATUS_LABEL[s.status as SetStatus]}
                          </span>
                          <button
                            onClick={() => deleteSet(s.id)}
                            disabled={busy}
                            className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-coral"
                          >
                            x
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {addSlotForStage && (
        <AddSlotDialog
          stageId={addSlotForStage}
          day={day}
          stageName={
            grid.find((g) => g.stage.id === addSlotForStage)?.stage.name ?? ""
          }
          onClose={() => setAddSlotForStage(null)}
          onSaved={() => {
            setAddSlotForStage(null);
            router.refresh();
          }}
        />
      )}

      {addSetForSlot && (
        <AddSetDialog
          slotId={addSetForSlot}
          artists={artists}
          onClose={() => setAddSetForSlot(null)}
          onSaved={() => {
            setAddSetForSlot(null);
            router.refresh();
          }}
        />
      )}

      {editSet && (
        <EditSetDialog
          set={editSet}
          onClose={() => setEditSet(null)}
          onSaved={() => {
            setEditSet(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-[--color-bg]/70 flex items-center justify-center px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-md border border-[--color-border-strong] bg-[--color-surface] p-5 space-y-4"
      >
        <h2 className="text-[15px] text-[--color-fg]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AddSlotDialog({
  stageId,
  day,
  stageName,
  onClose,
  onSaved,
}: {
  stageId: string;
  day: Day;
  stageName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("23:30");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, day, startTime, endTime }),
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
    <Dialog title={`New slot - ${stageName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[12px] text-[--color-fg-muted] capitalize">{day}</p>
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
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving" : "Add"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function AddSetDialog({
  slotId,
  artists,
  onClose,
  onSaved,
}: {
  slotId: string;
  artists: ArtistOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [status, setStatus] = useState<SetStatus>("option");
  const [announceBatch, setAnnounceBatch] = useState("");
  const [feeUsd, setFeeUsd] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
        announceBatch,
        feeAmountCents,
        feeCurrency: feeAmountCents != null ? "USD" : "",
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
    <Dialog title="Add artist to slot" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {artists.length === 0 && (
          <p className="text-xs text-coral">
            No artists yet. Create one on /artists first.
          </p>
        )}
        <div className="space-y-1.5">
          <Label>Artist</Label>
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.agency ? ` - ${a.agency}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SetStatus)}
              className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            >
              <option value="option">Option</option>
              <option value="confirmed">Confirmed</option>
              <option value="not_available">N/A</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Input
              value={announceBatch}
              onChange={(e) => setAnnounceBatch(e.target.value)}
              placeholder="Batch 1"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Fee (USD)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={feeUsd}
            onChange={(e) => setFeeUsd(e.target.value)}
            placeholder="2500.00"
          />
        </div>
        {error && <p className="text-xs text-coral">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={saving || artists.length === 0}>
            {saving ? "Saving" : "Add"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditSetDialog({
  set,
  onClose,
  onSaved,
}: {
  set: SetWithArtist;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<SetStatus>(set.status as SetStatus);
  const [announceBatch, setAnnounceBatch] = useState(set.announceBatch ?? "");
  const [feeUsd, setFeeUsd] = useState(
    set.feeAmountCents != null ? (set.feeAmountCents / 100).toFixed(2) : ""
  );
  const [agency, setAgency] = useState(set.agency ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
        feeCurrency: feeAmountCents != null ? "USD" : "",
        agency,
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
    <Dialog title={set.artist.name} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SetStatus)}
              className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            >
              <option value="option">Option</option>
              <option value="confirmed">Confirmed</option>
              <option value="not_available">N/A</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Input
              value={announceBatch}
              onChange={(e) => setAnnounceBatch(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Fee (USD)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={feeUsd}
              onChange={(e) => setFeeUsd(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Agency override</Label>
            <Input
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            />
          </div>
        </div>
        {set.feeAmountCents != null && (
          <p className="text-mono text-[10px] text-[--color-fg-subtle]">
            current: ${formatCents(set.feeAmountCents)}
          </p>
        )}
        {error && <p className="text-xs text-coral">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
