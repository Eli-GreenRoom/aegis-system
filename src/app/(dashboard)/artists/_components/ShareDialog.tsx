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
      <Button variant="secondary" onClick={() => setOpen(true)}>
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
        (a.agency ?? "").toLowerCase().includes(q)
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
    if (noneSelected || allSelected) {
      // No filter param -> page shows all active artists.
      return base;
    }
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
      // clipboard blocked — show the URL in a prompt instead
      window.prompt("Copy this URL:", url);
    }
  }

  function open() {
    window.open(buildUrl(), "_blank", "noreferrer");
  }

  const url = buildUrl();
  const withoutLinks = artists.filter((a) => !a.pressKitUrl).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-[--color-bg]/70 flex items-center justify-center px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-md border border-[--color-border-strong] bg-[--color-surface] p-5 space-y-4 max-h-[80vh] flex flex-col"
      >
        <header>
          <h2 className="text-[15px] text-[--color-fg]">Share press kit</h2>
          <p className="text-xs text-[--color-fg-muted] mt-1">
            Pick artists to include. Empty selection = all active artists.
            {withoutLinks > 0 && (
              <span className="text-[--color-fg-subtle]">
                {" "}{withoutLinks} {withoutLinks === 1 ? "artist has" : "artists have"} no
                press kit URL set yet.
              </span>
            )}
          </p>
        </header>

        <div className="flex items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or agency"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={selectAll}
            className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand whitespace-nowrap"
          >
            All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral whitespace-nowrap"
          >
            None
          </button>
        </div>

        <div className="flex-1 overflow-y-auto border border-[--color-border] rounded-md">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-[--color-fg-muted] text-sm">
              No matches.
            </p>
          ) : (
            <ul className="divide-y divide-[--color-border]">
              {filtered.map((a) => (
                <li key={a.id}>
                  <label className="flex items-center gap-3 px-3 py-2 hover:bg-[--color-surface-raised]/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={picked.has(a.id)}
                      onChange={() => toggle(a.id)}
                      className="rounded-md border border-[--color-border-strong] bg-[--color-surface]"
                    />
                    <span className="flex-1 min-w-0 text-sm text-[--color-fg] truncate">
                      {a.name}
                    </span>
                    {a.agency && (
                      <span className="text-mono text-[10px] text-[--color-fg-subtle] truncate">
                        {a.agency}
                      </span>
                    )}
                    {!a.pressKitUrl && (
                      <span
                        title="No press kit URL set"
                        className="text-mono text-[9px] uppercase tracking-[0.14em] text-coral"
                      >
                        no link
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-muted]">
            Share URL ({noneSelected || allSelected ? "all active" : `${picked.size} selected`})
          </div>
          <div className="text-mono text-xs text-[--color-fg] break-all border border-[--color-border] rounded-md px-3 py-2">
            {url}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy URL"}
          </Button>
          <Button type="button" variant="secondary" onClick={open}>
            Open
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
