"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Stage } from "@/lib/lineup/repo";

export default function StagesAdmin({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Stage | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteStage(id: string, name: string) {
    if (!confirm(`Delete ${name}? Slots and sets on this stage will be deleted.`)) return;
    setBusy(true);
    const res = await fetch(`/api/stages/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't delete stage.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error && <p className="text-sm text-coral mb-3">{error}</p>}

      <div className="border border-[--color-border] rounded-md overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
            <tr>
              <th className="text-left px-4 py-2 font-normal w-[1%]">Color</th>
              <th className="text-left px-4 py-2 font-normal">Name</th>
              <th className="text-left px-4 py-2 font-normal">Slug</th>
              <th className="text-right px-4 py-2 font-normal">Order</th>
              <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.id} className="border-t border-[--color-border]">
                <td className="px-4 py-2">
                  <span
                    className="inline-block w-3 h-3 rounded-md"
                    style={{ background: s.color ?? "var(--color-fg-subtle)" }}
                  />
                </td>
                <td className="px-4 py-2 text-[--color-fg]">{s.name}</td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">{s.slug}</td>
                <td className="px-4 py-2 text-right text-mono text-[--color-fg-muted]">
                  {s.sortOrder}
                </td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => setEditing(s)}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => deleteStage(s.id, s.name)}
                    disabled={busy}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral"
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={() => setAdding(true)}>New stage</Button>

      {editing && (
        <StageDialog
          stage={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {adding && (
        <StageDialog
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function StageDialog({
  stage,
  onClose,
  onSaved,
}: {
  stage?: Stage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!stage;
  const [name, setName] = useState(stage?.name ?? "");
  const [slug, setSlug] = useState(stage?.slug ?? "");
  const [color, setColor] = useState(stage?.color ?? "#E5B85A");
  const [sortOrder, setSortOrder] = useState(stage?.sortOrder ?? 0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const url = isEdit ? `/api/stages/${stage!.id}` : "/api/stages";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, color, sortOrder }),
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
        className="w-full max-w-sm rounded-md border border-[--color-border-strong] bg-[--color-surface] p-5 space-y-4"
      >
        <h2 className="text-[15px] text-[--color-fg]">
          {isEdit ? `Edit ${stage!.name}` : "New stage"}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#E5B85A" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>
          {error && <p className="text-xs text-coral">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving" : isEdit ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
