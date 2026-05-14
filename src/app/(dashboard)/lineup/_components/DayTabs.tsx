"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useTransition } from "react";
import type { Route } from "next";
import { festivalDates, dateToDayLabel } from "@/lib/festival-utils";
import type { Festival } from "@/lib/festivals";

interface DayTabsInnerProps {
  active: string;
  festival: Pick<Festival, "startDate" | "endDate">;
}

function DayTabsInner({ active, festival }: DayTabsInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const dates = festivalDates(festival);
  const firstDate = dates[0] ?? "";

  function setDate(date: string) {
    const sp = new URLSearchParams(params.toString());
    if (date === firstDate) sp.delete("date");
    else sp.set("date", date);
    const qs = sp.toString();
    startTransition(() => {
      router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
    });
  }

  return (
    <div className="flex items-center gap-1 mb-5">
      {dates.map((date) => {
        const isActive = active === date;
        return (
          <button
            key={date}
            onClick={() => setDate(date)}
            className={[
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              isActive
                ? "bg-brand text-[--color-brand-fg]"
                : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface]",
            ].join(" ")}
          >
            {dateToDayLabel(date)}
          </button>
        );
      })}
      {pending && (
        <span className="ml-3 text-mono text-[10px] text-[--color-fg-subtle]">
          loading
        </span>
      )}
    </div>
  );
}

export default function DayTabs(props: {
  active: string;
  festival: Pick<Festival, "startDate" | "endDate">;
}) {
  return (
    <Suspense>
      <DayTabsInner {...props} />
    </Suspense>
  );
}
