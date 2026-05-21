"use client";

import { useFestival } from "./FestivalContext";
import FestivalSwitcher from "./FestivalSwitcher";

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

function isLiveMode(
  festival: {
    startDate: string;
    endDate: string;
    festivalModeActive: boolean;
  } | null,
): boolean {
  if (!festival) return false;
  if (festival.festivalModeActive) return true;
  const today = new Date().toISOString().slice(0, 10);
  return today >= festival.startDate && today <= festival.endDate;
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
  const { startDate, festival } = useFestival();
  const daysOut = startDate ? tMinus(startDate) : null;
  const festivalMode = isLiveMode(festival);

  return (
    <header className="sticky top-0 z-10 shrink-0 flex flex-col bg-[--color-bg]/80 backdrop-blur-xl border-b border-white/5">
      <div className="h-14 flex items-center px-6 gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-[--color-fg] leading-none tracking-[-0.01em] truncate">
            {title}
          </h1>
          {subtitle && (
            <div className="text-[11px] text-[--color-fg-subtle] mt-1 truncate">
              {subtitle}
            </div>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}

        <div className="flex items-center gap-3 shrink-0">
          <FestivalSwitcher />

          {daysOut !== null && (
            <div
              className="text-[11px] text-[--color-fg-subtle]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {daysOut > 0 ? (
                <>
                  <span className="text-[--color-fg-subtle]">T-</span>
                  <span className="text-brand font-medium">{daysOut}d</span>
                </>
              ) : daysOut === 0 ? (
                <span className="text-brand font-medium">Day 0</span>
              ) : (
                <span className="text-[--color-fg-subtle]">post-festival</span>
              )}
            </div>
          )}
        </div>
      </div>

      {festivalMode && <div className="live-strip" />}
    </header>
  );
}
