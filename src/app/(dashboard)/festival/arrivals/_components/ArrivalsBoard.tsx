"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { ArrivalToday } from "@/lib/aggregators";
import type { FlightStatus } from "@/lib/flights/schema";

interface Props {
  arrivals: ArrivalToday[];
}

const ADVANCE_LABEL: Partial<Record<FlightStatus, string>> = {
  scheduled: "Boarded",
  boarded: "In air",
  in_air: "Landed",
};

const STATUS_CLASS: Record<FlightStatus, string> = {
  scheduled: "border-l-[--color-border-strong]",
  boarded: "border-l-brand",
  in_air: "border-l-[--color-stage-alt]",
  landed: "border-l-[--color-brand]",
  delayed: "border-l-[--color-danger]",
  cancelled: "border-l-[--color-danger]",
};

export default function ArrivalsBoard({ arrivals }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function advance(id: string) {
    setError("");
    setBusyId(id);
    const res = await fetch(`/api/flights/${id}/advance`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't advance.");
      return;
    }
    router.refresh();
  }

  if (arrivals.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No arrivals today.</p>
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-coral mb-3">{error}</p>}
      <ul className="space-y-2">
        {arrivals.map(({ flight, person, linkedPickup }) => {
          const label = ADVANCE_LABEL[flight.status as FlightStatus];
          const pickupAlert =
            flight.status === "landed" &&
            linkedPickup &&
            linkedPickup.status === "scheduled";
          return (
            <li
              key={flight.id}
              className={`flex items-center gap-3 rounded-md border border-[--color-border] border-l-4 ${STATUS_CLASS[flight.status as FlightStatus]} bg-[--color-surface]/40 p-3 ${pickupAlert ? "ring-1 ring-[--color-danger]/40" : ""}`}
            >
              <div className="text-mono text-[12px] text-[--color-fg] tabular-nums w-[80px] shrink-0">
                {flight.scheduledDt
                  ? format(new Date(flight.scheduledDt), "HH:mm")
                  : "—"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[--color-fg] text-sm truncate">
                  <span className="text-mono">
                    {flight.flightNumber ?? "—"}
                  </span>
                  <span className="text-mono text-[11px] text-[--color-fg-muted] ml-2">
                    {flight.fromAirport ?? "?"} {"->"} {flight.toAirport ?? "?"}
                  </span>
                </div>
                <div className="text-mono text-[11px] text-[--color-fg-muted] mt-0.5 truncate">
                  {person?.name ?? "Unknown"} · {flight.airline ?? "—"}
                </div>
                {pickupAlert && (
                  <div className="text-mono text-[11px] text-coral mt-1">
                    Pickup still scheduled — dispatch driver.
                  </div>
                )}
              </div>
              <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] px-2">
                {flight.status}
              </span>
              {label && (
                <Button
                  onClick={() => advance(flight.id)}
                  disabled={busyId === flight.id}
                >
                  {busyId === flight.id ? "..." : label}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
