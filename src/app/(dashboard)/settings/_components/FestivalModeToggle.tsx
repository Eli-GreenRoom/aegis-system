"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  initialActive: boolean;
  /** Auto-detected mode (today within festival dates). */
  auto: boolean;
  /** Resolved current mode (the OR of `initialActive` and `auto`). */
  effective: boolean;
}

export default function FestivalModeToggle({
  initialActive,
  auto,
  effective,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function flip(next: boolean) {
    setError("");
    setBusy(true);
    const res = await fetch("/api/settings/festival-mode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }
    setActive(next);
    router.refresh();
  }

  return (
    <div className="border border-[--color-border] rounded-md p-4 bg-[--color-surface]/40 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[--color-fg] text-sm">
            {active ? "Force on" : "Auto"}
          </div>
          <div className="text-mono text-[11px] text-[--color-fg-muted] mt-1">
            Auto detect:{" "}
            <span className={auto ? "text-mint" : "text-[--color-fg-subtle]"}>
              {auto ? "ON (today is in range)" : "off"}
            </span>
          </div>
          <div className="text-mono text-[11px] text-[--color-fg-muted]">
            Effective right now:{" "}
            <span className={effective ? "text-mint" : "text-coral"}>
              {effective ? "ON" : "OFF"}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant={active ? "danger" : "secondary"}
          onClick={() => flip(!active)}
          disabled={busy}
        >
          {busy
            ? "Saving"
            : active
              ? "Disable force-on"
              : "Force on"}
        </Button>
      </div>
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
