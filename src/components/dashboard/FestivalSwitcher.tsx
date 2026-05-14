"use client";

import { useState } from "react";
import { useFestival } from "./FestivalContext";

export default function FestivalSwitcher() {
  const { festival, festivals } = useFestival();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!festival) return null;

  if (festivals.length <= 1) {
    return (
      <span className="text-[11px] font-medium text-[--color-fg-muted] shrink-0">
        {festival.name}
      </span>
    );
  }

  async function switchTo(id: string) {
    if (id === festival?.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    await fetch("/api/festivals/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ festivalId: id }),
    });
    window.location.reload();
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="text-[11px] font-medium text-[--color-fg-muted] hover:text-[--color-fg] flex items-center gap-1 transition-colors"
      >
        {festival.name}
        <svg
          className="w-3 h-3 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-md border border-[--color-border] bg-[--color-surface] shadow-lg overflow-hidden">
            {festivals.map((f) => (
              <button
                key={f.id}
                onClick={() => switchTo(f.id)}
                className={`w-full text-left px-3 py-2 text-[12px] hover:bg-[--color-surface-raised] transition-colors ${
                  f.id === festival.id
                    ? "text-brand font-medium"
                    : "text-[--color-fg]"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
