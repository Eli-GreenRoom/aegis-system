"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Route as TypedRoute } from "next";

interface VendorOption {
  id: string;
  name: string;
}

export default function PickupsFilters({ vendors }: { vendors: VendorOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const status = params.get("status") ?? "";
  const routeFrom = params.get("routeFrom") ?? "";
  const routeTo = params.get("routeTo") ?? "";
  const vendorId = params.get("vendorId") ?? "";

  useEffect(() => {
    const t = setTimeout(() => apply({ search }), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function apply(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.push((qs ? `${pathname}?${qs}` : pathname) as TypedRoute);
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
          placeholder="Driver, phone, vehicle, route detail"
          className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] placeholder:text-[--color-fg-subtle] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
        />
      </div>

      <div>
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => apply({ status: e.target.value })}
          className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
        >
          <option value="">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          From
        </label>
        <select
          value={routeFrom}
          onChange={(e) => apply({ routeFrom: e.target.value })}
          className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
        >
          <option value="">Any</option>
          <option value="airport">Airport</option>
          <option value="hotel">Hotel</option>
          <option value="stage">Stage</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          To
        </label>
        <select
          value={routeTo}
          onChange={(e) => apply({ routeTo: e.target.value })}
          className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
        >
          <option value="">Any</option>
          <option value="airport">Airport</option>
          <option value="hotel">Hotel</option>
          <option value="stage">Stage</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="text-mono block text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
          Vendor
        </label>
        <select
          value={vendorId}
          onChange={(e) => apply({ vendorId: e.target.value })}
          className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
        >
          <option value="">All</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {pending && (
        <span className="text-mono text-[10px] text-[--color-fg-subtle] pb-2">loading</span>
      )}
    </div>
  );
}
