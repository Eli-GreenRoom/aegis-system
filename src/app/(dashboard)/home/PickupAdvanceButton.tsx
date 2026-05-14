"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PickupStatus } from "@/lib/ground/schema";

const NEXT_LABEL: Partial<Record<PickupStatus, string>> = {
  scheduled: "Dispatch",
  dispatched: "Picked up",
  in_transit: "Delivered",
};

export default function PickupAdvanceButton({
  id,
  status,
}: {
  id: string;
  status: PickupStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const label = NEXT_LABEL[status];
  if (!label) return null;

  async function advance() {
    setLoading(true);
    await fetch(`/api/pickups/${id}/advance`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={advance}
      disabled={loading}
      className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded border border-[--color-border] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-[--color-border-strong] transition-colors disabled:opacity-40"
    >
      {loading ? "…" : `${label} ›`}
    </button>
  );
}
