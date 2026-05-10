"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { PickupInWindow } from "@/lib/aggregators";
import type { PickupStatus } from "@/lib/ground/schema";

interface Props {
  next2h: PickupInWindow[];
  later: PickupInWindow[];
}

const ADVANCE_LABEL: Partial<Record<PickupStatus, string>> = {
  scheduled: "Dispatch",
  dispatched: "Picked up",
  in_transit: "Delivered",
};

const STATUS_CLASS: Record<PickupStatus, string> = {
  scheduled: "border-l-[--color-border-strong]",
  dispatched: "border-l-brand",
  in_transit: "border-l-[--color-stage-alt]",
  completed: "border-l-[--color-brand]",
  cancelled: "border-l-[--color-danger]",
};

export default function PickupsBoard({ next2h, later }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function advance(id: string) {
    setError("");
    setBusyId(id);
    const res = await fetch(`/api/pickups/${id}/advance`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't advance.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error && <p className="text-sm text-coral mb-3">{error}</p>}

      <Section
        title="Next 2h"
        rows={next2h}
        busyId={busyId}
        onAdvance={advance}
      />
      <Section
        title="Later today"
        rows={later}
        busyId={busyId}
        onAdvance={advance}
        muted
      />
    </>
  );
}

function Section({
  title,
  rows,
  busyId,
  onAdvance,
  muted,
}: {
  title: string;
  rows: PickupInWindow[];
  busyId: string | null;
  onAdvance: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <section className={muted ? "mt-10 opacity-90" : "mt-2"}>
      <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] mb-3">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-[--color-fg-subtle] text-sm italic">Nothing.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ pickup, person, vendor }) => {
            const label = ADVANCE_LABEL[pickup.status as PickupStatus];
            return (
              <li
                key={pickup.id}
                className={`flex items-center gap-3 rounded-md border border-[--color-border] border-l-4 ${STATUS_CLASS[pickup.status as PickupStatus]} bg-[--color-surface]/40 p-3`}
              >
                <div className="text-mono text-[12px] text-[--color-fg] tabular-nums w-[68px] shrink-0">
                  {format(new Date(pickup.pickupDt), "HH:mm")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[--color-fg] text-sm truncate">
                    {person?.name ?? "Unknown"}
                    <span className="text-mono text-[11px] text-[--color-fg-muted] ml-2">
                      {pickup.routeFrom} {"->"} {pickup.routeTo}
                    </span>
                  </div>
                  <div className="text-mono text-[11px] text-[--color-fg-muted] mt-0.5 truncate">
                    {vendor?.name ?? "—"}
                    {pickup.driverName && ` · ${pickup.driverName}`}
                    {pickup.driverPhone && (
                      <a
                        href={`tel:${pickup.driverPhone.replace(/\s/g, "")}`}
                        className="text-brand underline-offset-4 hover:underline ml-2"
                      >
                        {pickup.driverPhone}
                      </a>
                    )}
                  </div>
                </div>
                {label ? (
                  <Button
                    onClick={() => onAdvance(pickup.id)}
                    disabled={busyId === pickup.id}
                  >
                    {busyId === pickup.id ? "..." : label}
                  </Button>
                ) : (
                  <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] px-2">
                    {pickup.status}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
