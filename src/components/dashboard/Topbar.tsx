import { differenceInCalendarDays } from "date-fns";

const FESTIVAL_START = new Date("2026-08-14T00:00:00+03:00");

export default function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const daysOut = differenceInCalendarDays(FESTIVAL_START, new Date());

  return (
    <header className="h-14 shrink-0 border-b border-[--color-border] flex items-center px-6 gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-display text-[20px] leading-none truncate">{title}</h1>
        {subtitle && (
          <div className="text-[11px] text-[--color-fg-subtle] mt-1 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      <div
        className="text-mono text-[11px] text-[--color-fg-subtle] shrink-0"
        title="Aegis 2026 — Aranoon Village, Batroun"
      >
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
    </header>
  );
}
