"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { format } from "date-fns";
import type { Rider } from "@/lib/riders/repo";

interface Props {
  riders: Rider[];
  artistsById: Map<string, string>;
}

export default function RidersTable({ riders, artistsById }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggleConfirmed(id: string, confirmed: boolean) {
    setError("");
    setBusyId(id);
    const res = await fetch(`/api/riders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Couldn't update.");
      return;
    }
    router.refresh();
  }

  async function deleteRider(id: string) {
    if (!confirm("Delete this rider? This is permanent.")) return;
    setBusyId(id);
    const res = await fetch(`/api/riders/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError("Couldn't delete.");
      return;
    }
    router.refresh();
  }

  if (riders.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No riders.</p>
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-coral mb-2">{error}</p>}
      <div className="border border-[--color-border] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
            <tr>
              <th className="text-left px-4 py-2 font-normal">Artist</th>
              <th className="text-left px-4 py-2 font-normal">Kind</th>
              <th className="text-left px-4 py-2 font-normal">File</th>
              <th className="text-left px-4 py-2 font-normal">Received</th>
              <th className="text-left px-4 py-2 font-normal">Confirmed</th>
              <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr
                key={r.id}
                className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
              >
                <td className="px-4 py-2 text-[--color-fg]">
                  {artistsById.get(r.artistId) ?? "(deleted artist)"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${
                      r.kind === "hospitality"
                        ? "border-brand/40 text-brand"
                        : "border-[--color-fg-subtle]/40 text-[--color-fg-muted]"
                    }`}
                  >
                    {r.kind}
                  </span>
                </td>
                <td className="px-4 py-2 text-mono text-xs">
                  {r.fileUrl ? (
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand underline-offset-4 hover:underline"
                    >
                      open
                    </a>
                  ) : (
                    <span className="text-[--color-fg-subtle]">-</span>
                  )}
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                  {r.receivedAt
                    ? format(new Date(r.receivedAt), "EEE d MMM HH:mm")
                    : ""}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleConfirmed(r.id, !r.confirmed)}
                    disabled={busyId === r.id}
                    className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${
                      r.confirmed
                        ? "border-[--color-brand]/60 text-mint"
                        : "border-[--color-border-strong] text-[--color-fg-muted] hover:text-brand hover:border-brand/40"
                    }`}
                  >
                    {r.confirmed ? "confirmed" : "pending"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Link
                    href={`/riders/${r.id}` as Route}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand mr-3"
                  >
                    edit
                  </Link>
                  <button
                    onClick={() => deleteRider(r.id)}
                    disabled={busyId === r.id}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-coral"
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
