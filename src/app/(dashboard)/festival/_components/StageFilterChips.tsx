"use client";

import { useEffect, useState } from "react";

interface Stage {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  stages: Stage[];
  /** Current active filter value: a stage id, or "all". */
  value: string;
  onChange: (next: string) => void;
}

const STORAGE_KEY = "aegis.festival.stageFilter";

/**
 * Sticky stage filter chip strip. Selection persists in localStorage so
 * Eli's choice survives page reloads. The parent page reads the value and
 * filters its rows accordingly.
 *
 * Rendered as the first child of every festival page so it always sits
 * directly below the topbar.
 */
export default function StageFilterChips({ stages, value, onChange }: Props) {
  // Hydrate from localStorage on first client render. We deliberately
  // don't read it on the server side - the parent passes its own
  // initial value (typically "all") and we override here once mounted.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== value) onChange(stored);
    } catch {
      /* localStorage unavailable - ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(next: string) {
    onChange(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[--color-bg]/95 backdrop-blur border-b border-[--color-border] mb-6 flex flex-wrap gap-2">
      <Chip active={value === "all"} onClick={() => pick("all")}>
        All
      </Chip>
      {stages.map((s) => (
        <Chip
          key={s.id}
          active={value === s.id}
          color={s.color}
          onClick={() => pick(s.id)}
        >
          {s.name}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-mono text-[11px] uppercase tracking-[0.16em] px-3 py-2 rounded-md border transition-colors ${
        active
          ? "border-brand text-brand bg-[--color-surface-raised]"
          : "border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-brand/40"
      }`}
      style={
        active && color ? { borderColor: color, color: color } : undefined
      }
    >
      {children}
    </button>
  );
}
