"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Vendor } from "@/lib/ground/repo";

export default function VendorsAdmin({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteVendor(id: string, name: string) {
    if (!confirm(`Delete ${name}? Pickups already linked to it will keep the row but lose the vendor link.`)) return;
    setBusy(true);
    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't delete vendor.");
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
              <th className="text-left px-4 py-2 font-normal">Name</th>
              <th className="text-left px-4 py-2 font-normal">Service</th>
              <th className="text-left px-4 py-2 font-normal">Contact</th>
              <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[--color-fg-muted]">
                  No vendors yet.
                </td>
              </tr>
            )}
            {vendors.map((v) => (
              <tr key={v.id} className="border-t border-[--color-border]">
                <td className="px-4 py-2 text-[--color-fg]">{v.name}</td>
                <td className="px-4 py-2 text-[--color-fg-muted]">{v.service}</td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                  {v.contactName ?? ""}
                  {v.contactName && v.contactPhone ? " · " : ""}
                  {v.contactPhone ?? ""}
                </td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => setEditing(v)}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => deleteVendor(v.id, v.name)}
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

      <Button onClick={() => setAdding(true)}>New vendor</Button>

      {editing && (
        <VendorDialog
          vendor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {adding && (
        <VendorDialog
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

function VendorDialog({
  vendor,
  onClose,
  onSaved,
}: {
  vendor?: Vendor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!vendor;
  const [name, setName] = useState(vendor?.name ?? "");
  const [service, setService] = useState(vendor?.service ?? "");
  const [contactName, setContactName] = useState(vendor?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(vendor?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(vendor?.contactPhone ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const url = isEdit ? `/api/vendors/${vendor!.id}` : "/api/vendors";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        service,
        contactName,
        contactEmail,
        contactPhone,
        notes,
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
          {isEdit ? `Edit ${vendor!.name}` : "New vendor"}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Service</Label>
            <Input
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="Taxi, car service, mini-bus..."
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            />
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
