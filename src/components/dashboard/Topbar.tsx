"use client";

import { useFestival } from "./FestivalContext";

/** T-minus in UTC calendar days — no timezone drift. */
function tMinus(startDateIso: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const [y, m, d] = startDateIso.split("-").map(Number);
  const festUtc = Date.UTC(y, m - 1, d);
  return Math.round((festUtc - todayUtc) / 86_400_000);
}

export default function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { startDate } = useFestival();
  const daysOut = startDate ? tMinus(startDate) : null;

  return (
    <header className="h-14 shrink-0 border-b border-[--color-border] flex items-center px-6 gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-display text-[20px] leading-none truncate">
          {title}
        </h1>
        {subtitle && (
          <div className="text-[11px] text-[--color-fg-subtle] mt-1 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {daysOut !== null && (
        <div className="text-mono text-[11px] text-[--color-fg-subtle] shrink-0">
          {daysOut > 0 ? (
            <>
              <span className="text-[--color-fg-muted]">T-</span>
              <span className="text-brand">{daysOut}d</span>
            </>
          ) : daysOut === 0 ? (
            <span className="text-brand">Day 0</span>
          ) : (
            <span className="text-[--color-fg-subtle]">post-festival</span>
          )}
        </div>
      )}
    </header>
  );
}
