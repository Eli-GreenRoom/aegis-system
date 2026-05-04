"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Route } from "next";

interface Props {
  agencies: string[];
}

export default function ArtistsFilters({ agencies }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const agency = params.get("agency") ?? "";
  const archived = params.get("archived") ?? "active";

  useEffect(() => {
    const t = setTimeout(() => {
      apply({ search });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function apply(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "" || (k === "archived" && v === "active")) {
        sp.delete(k);
      } else {
        sp.set(k, v);
      }
    }
    const qs = sp.toString();
    startTransition(() => {
      router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      <div className="flex-1 min-w-[200px]">
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          Search
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, agency, slug, email"
          className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] placeholder:text-[--color-fg-subtle] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
        />
      </div>

      <div>
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          Agency
        </label>
        <select
          value={agency}
          onChange={(e) => apply({ agency: e.target.value })}
          className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
        >
          <option value="">All</option>
          {agencies.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          Show
        </label>
        <select
          value={archived}
          onChange={(e) => apply({ archived: e.target.value })}
          className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {pending && (
        <span className="text-mono text-[10px] text-[--color-fg-subtle] pb-2">loading</span>
      )}
    </div>
  );
}
