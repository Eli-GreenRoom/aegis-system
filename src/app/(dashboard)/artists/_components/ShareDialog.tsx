"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  function selectAll() {
    setPicked(new Set(artists.map((a) => a.id)));
  }

  function clearAll() {
    setPicked(new Set());
  }

  function buildUrl(): string {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/share/press`
        : "/share/press";
    if (noneSelected || allSelected) return base;
    const ids = Array.from(picked).join(",");
    return `${base}?artists=${ids}`;
  }

  async function copy() {
    const url = buildUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this URL:", url);
    }
  }

  function openUrl() {
    window.open(buildUrl(), "_blank", "noreferrer");
  }

  const url = buildUrl();
  const withoutLinks = artists.filter((a) => !a.pressKitUrl).length;
  const selectedLabel =
    noneSelected || allSelected
      ? `All ${artists.length} active`
      : `${picked.size} of ${artists.length}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[--radius-lg] shadow-elevated border border-white/[0.08] bg-[--color-surface]/90 backdrop-blur-xl p-6 space-y-5 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[--color-fg]">
              Share press kit
            </h2>
            <p className="text-xs text-[--color-fg-muted] mt-1">
              Select artists to include — empty selection shares all active.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[--color-fg-subtle] hover:text-[--color-fg] text-[20px] leading-none mt-0.5"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Search + controls */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or agency"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={selectAll}
            className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand whitespace-nowrap transition-colors"
          >
            All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral whitespace-nowrap transition-colors"
          >
            None
          </button>
        </div>

        {/* Artist list */}
        <div className="flex-1 overflow-y-auto rounded-[--radius-md] border border-white/[0.06]">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-[--color-fg-muted] text-sm">
              No matches.
            </p>
          ) : (
            <ul>
              {filtered.map((a, i) => (
                <li
                  key={a.id}
                  className={i > 0 ? "border-t border-white/[0.04]" : ""}
                >
                  <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={picked.has(a.id)}
                      onChange={() => toggle(a.id)}
                    />
                    <span className="flex-1 min-w-0 text-[13px] text-[--color-fg] truncate">
                      {a.name}
                    </span>
                    {a.agency && (
                      <span className="text-mono text-[10px] text-[--color-fg-subtle] truncate">
                        {a.agency}
                      </span>
                    )}
                    {!a.pressKitUrl && (
                      <span className="text-mono text-[9px] uppercase tracking-[0.12em] text-[--color-danger]/60">
                        no link
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* URL preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
              Share URL
            </span>
            <span className="text-mono text-[10px] text-[--color-fg-subtle]">
              {selectedLabel}
              {withoutLinks > 0 && (
                <span className="text-[--color-fg-subtle]/60 ml-2">
                  · {withoutLinks} without link
                </span>
              )}
            </span>
          </div>
          <div className="text-mono text-[11px] text-[--color-fg-muted] break-all rounded-[--radius-sm] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 leading-relaxed">
            {url}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" onClick={copy} size="sm">
            {copied ? "Copied!" : "Copy URL"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={openUrl}>
            Open
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
