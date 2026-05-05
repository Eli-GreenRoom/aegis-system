"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RoomBlock, BlockCapacity } from "@/lib/hotels/repo";
import { formatCents } from "@/lib/utils";

interface BlockWithCapacity extends RoomBlock {
  capacity: BlockCapacity;
}

interface Props {
  hotelId: string;
  blocks: BlockWithCapacity[];
}

export default function RoomBlocksSection({ hotelId, blocks }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BlockWithCapacity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteBlock(id: string) {
    if (
      !confirm(
        "Delete this room block? Bookings linked to it become walk-ups (no block link)."
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/room-blocks/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't delete block.");
      return;
    }
    router.refresh();
  }

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] text-[--color-fg]">
          Room blocks (this edition)
        </h2>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          New block
        </Button>
      </header>

      {error && <p className="text-sm text-coral mb-2">{error}</p>}

      {blocks.length === 0 ? (
        <p className="text-[--color-fg-subtle] text-sm italic">
          No blocks yet. Add one to start assigning bookings.
        </p>
      ) : (
        <div className="border border-[--color-border] rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
              <tr>
                <th className="text-left px-4 py-2 font-normal">Label</th>
                <th className="text-left px-4 py-2 font-normal">Room type</th>
                <th className="text-right px-4 py-2 font-normal">Nights</th>
                <th className="text-right px-4 py-2 font-normal">Reserved</th>
                <th className="text-right px-4 py-2 font-normal">Free</th>
                <th className="text-right px-4 py-2 font-normal">Price/night</th>
                <th className="text-left px-4 py-2 font-normal">Breakfast</th>
                <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
                >
                  <td className="px-4 py-2 text-[--color-fg]">
                    {b.label ?? <span className="text-[--color-fg-subtle]">-</span>}
                  </td>
                  <td className="px-4 py-2 text-[--color-fg-muted]">
                    {b.roomType}
                  </td>
                  <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg-muted]">
                    {b.nights ?? ""}
                  </td>
                  <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg]">
                    {b.roomsReserved ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <CapacityPill capacity={b.capacity} />
                  </td>
                  <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg-muted]">
                    {b.pricePerNightAmountCents != null
                      ? `${formatCents(b.pricePerNightAmountCents)} ${b.pricePerNightCurrency ?? ""}`.trim()
                      : ""}
                  </td>
                  <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                    {b.breakfastNote ?? ""}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(b)}
                      className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand mr-3"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => deleteBlock(b.id)}
                      disabled={busy}
                      className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral"
                    >
                      x
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <BlockDialog
          hotelId={hotelId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <BlockDialog
          hotelId={hotelId}
          block={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function CapacityPill({ capacity }: { capacity: BlockCapacity }) {
  const { reserved, peakAssigned, free } = capacity;
  if (reserved === 0) {
    return (
      <span className="text-mono text-xs text-[--color-fg-subtle]">
        -
      </span>
    );
  }
  const overbooked = free < 0;
  const tone = overbooked
    ? "text-coral"
    : free === 0
      ? "text-brand"
      : "text-mint";
  return (
    <span className={`text-mono text-xs ${tone}`}>
      {free} <span className="text-[--color-fg-subtle]">/ {reserved}</span>
      {peakAssigned > 0 && (
        <span className="text-[--color-fg-subtle] text-[10px]">
          {" "}(peak {peakAssigned})
        </span>
      )}
    </span>
  );
}

function BlockDialog({
  hotelId,
  block,
  onClose,
  onSaved,
}: {
  hotelId: string;
  block?: BlockWithCapacity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!block;
  const [label, setLabel] = useState(block?.label ?? "");
  const [roomType, setRoomType] = useState(block?.roomType ?? "");
  const [nights, setNights] = useState(
    block?.nights != null ? String(block.nights) : ""
  );
  const [roomsReserved, setRoomsReserved] = useState(
    block?.roomsReserved != null ? String(block.roomsReserved) : ""
  );
  const [priceUsd, setPriceUsd] = useState(
    block?.pricePerNightAmountCents != null
      ? (block.pricePerNightAmountCents / 100).toFixed(2)
      : ""
  );
  const [currency, setCurrency] = useState<"USD" | "EUR">(
    (block?.pricePerNightCurrency as "USD" | "EUR" | null) ?? "USD"
  );
  const [breakfastNote, setBreakfastNote] = useState(block?.breakfastNote ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const priceCents =
      priceUsd === "" ? null : Math.round(Number(priceUsd) * 100);

    const payload = {
      hotelId,
      label,
      roomType,
      nights: nights === "" ? null : Number(nights),
      roomsReserved: roomsReserved === "" ? null : Number(roomsReserved),
      pricePerNightAmountCents: priceCents,
      pricePerNightCurrency: priceCents != null ? currency : "",
      breakfastNote,
    };

    const url = isEdit ? `/api/room-blocks/${block!.id}` : "/api/room-blocks";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
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
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-[--color-bg]/70 flex items-center justify-center px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-md border border-[--color-border-strong] bg-[--color-surface] p-5 space-y-4"
      >
        <h2 className="text-[15px] text-[--color-fg]">
          {isEdit ? "Edit room block" : "New room block"}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Artists - Deluxe"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Room type *</Label>
              <Input
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="Deluxe sea view"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nights</Label>
              <Input
                type="number"
                min={0}
                value={nights}
                onChange={(e) => setNights(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rooms reserved</Label>
              <Input
                type="number"
                min={0}
                value={roomsReserved}
                onChange={(e) => setRoomsReserved(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price/night</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                placeholder="250.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "EUR")}
                className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Breakfast note</Label>
              <Input
                value={breakfastNote}
                onChange={(e) => setBreakfastNote(e.target.value)}
                placeholder="incl. for 2"
              />
            </div>
          </div>

          {error && <p className="text-xs text-coral">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving" : isEdit ? "Save" : "Add"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
