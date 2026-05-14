"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Artist } from "@/lib/artists/repo";

interface Props {
  artists: Pick<Artist, "id" | "name" | "agency" | "pressKitUrl">[];
}

export default function ShareDialog({ artists }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Share press kit
      </Button>
      {open && <Dialog artists={artists} onClose={() => setOpen(false)} />}
    </>
  );
}

function Dialog({
  artists,
  onClose,
}: {
  artists: Props["artists"];
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.agency ?? "").toLowerCase().includes(q),
    );
  }, [artists, filter]);

  const allSelected = picked.size === artists.length;
  const noneSelected = picked.size === 0;

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  function buildUrl(): string {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/share/press`
        : "/share/press";
    if (noneSelected || allSelected) return base;
    return `${base}?artists=${Array.from(picked).join(",")}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this URL:", buildUrl());
    }
  }

  const withoutLinks = artists.filter((a) => !a.pressKitUrl).length;

  return (
    /* backdrop — inline styles bypass any transform/overflow stacking context */
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        background: "rgba(0,0,0,0.72)",
      }}
    >
      {/* panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md flex flex-col rounded-2xl border border-white/[0.09]"
        style={{
          background: "var(--color-surface-raised)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.7)",
          maxHeight: "82vh",
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[15px] font-semibold text-[--color-fg]">
              Share press kit
            </p>
            <p className="text-xs text-[--color-fg-muted] mt-0.5">
              Select artists · empty = all active
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[--color-fg-subtle] hover:text-[--color-fg] hover:bg-white/[0.07] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* search */}
        <div className="px-5 pt-4 pb-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search artists…"
            autoComplete="off"
            className="w-full rounded-[--radius-md] border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-sm text-[--color-fg] placeholder:text-[--color-fg-subtle] focus:border-[--color-brand]/40 focus:outline-none focus:ring-1 focus:ring-[--color-brand]/20"
          />
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {/* select-all / clear row */}
          <div className="flex items-center justify-between px-3 py-1.5 mb-1">
            <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
              {picked.size === 0 ? "None selected" : `${picked.size} selected`}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setPicked(new Set(artists.map((a) => a.id)))}
                className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-brand transition-colors"
              >
                All
              </button>
              <button
                onClick={() => setPicked(new Set())}
                className="text-mono text-[10px] text-[--color-fg-subtle] hover:text-[--color-danger] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-[--color-fg-muted]">
              No matches.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((a) => (
                <li key={a.id}>
                  <label className="flex items-center gap-3 px-3 py-2.5 rounded-[--radius-md] hover:bg-white/[0.05] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={picked.has(a.id)}
                      onChange={() => toggle(a.id)}
                      className="shrink-0"
                    />
                    <span className="flex-1 min-w-0 text-[13px] text-[--color-fg] truncate">
                      {a.name}
                    </span>
                    {a.agency && (
                      <span className="text-mono text-[10px] text-[--color-fg-subtle] shrink-0 truncate max-w-[100px]">
                        {a.agency}
                      </span>
                    )}
                    {!a.pressKitUrl && (
                      <span className="text-mono text-[9px] text-[--color-danger]/50 shrink-0">
                        no link
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] space-y-3">
          {/* url */}
          <div
            className="rounded-[--radius-md] px-3 py-2.5 text-mono text-[11px] text-[--color-fg-muted] break-all leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {buildUrl()}
          </div>
          {withoutLinks > 0 && (
            <p className="text-mono text-[10px] text-[--color-fg-subtle]">
              {withoutLinks} artist{withoutLinks !== 1 ? "s have" : " has"} no
              press kit URL set.
            </p>
          )}
          {/* actions */}
          <div className="flex items-center gap-2">
            <Button onClick={copy} size="sm">
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(buildUrl(), "_blank", "noreferrer")}
            >
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
