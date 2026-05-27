"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Route } from "next";

type View = "grid" | "pipeline" | "readiness";

interface Props {
  active: View;
}

const OPTIONS: { value: View; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "pipeline", label: "Pipeline" },
  { value: "readiness", label: "Readiness" },
];

function ViewToggleInner({ active }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(view: View): Route {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (view === "grid") {
      // grid is the default, omit the param
      next.delete("view");
    } else {
      next.set("view", view);
    }
    // Pipeline and readiness don't use a day filter; drop it when switching.
    if (view === "pipeline" || view === "readiness") next.delete("date");
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ""}` as Route;
  }

  return (
    <div
      className="inline-flex rounded-md border border-[--color-border-strong] bg-[--color-surface] p-0.5"
      role="tablist"
    >
      {OPTIONS.map((o) => {
        const isActive = o.value === active;
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            className={`px-3 py-1 rounded text-[11px] uppercase tracking-[0.14em] transition-colors ${
              isActive
                ? "bg-[--color-surface-raised] text-[--color-fg]"
                : "text-[--color-fg-muted] hover:text-[--color-fg]"
            }`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function ViewToggle(props: Props) {
  return (
    <Suspense>
      <ViewToggleInner {...props} />
    </Suspense>
  );
}
