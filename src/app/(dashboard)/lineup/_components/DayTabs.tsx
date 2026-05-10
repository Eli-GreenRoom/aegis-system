"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useTransition } from "react";
import type { Route } from "next";

const DAYS = [
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const;

function DayTabsInner({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setDay(day: string) {
    const sp = new URLSearchParams(params.toString());
    if (day === "friday") sp.delete("day");
    else sp.set("day", day);
    const qs = sp.toString();
    startTransition(() => {
      router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
    });
  }

  return (
    <div className="flex items-center gap-1 mb-5">
      {DAYS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => setDay(value)}
            className={[
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              isActive
                ? "bg-brand text-[--color-brand-fg]"
                : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface]",
            ].join(" ")}
          >
            {label}
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

export default function DayTabs(props: { active: string }) {
  return (
    <Suspense>
      <DayTabsInner {...props} />
    </Suspense>
  );
}
