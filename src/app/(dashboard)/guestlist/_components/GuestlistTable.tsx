"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { GuestlistEntry } from "@/lib/guestlist/repo";
import type { GuestCategory } from "@/lib/guestlist/schema";

interface Props {
  entries: GuestlistEntry[];
  artistsById: Map<string, string>;
}

export default function GuestlistTable({ entries, artistsById }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    setBusyId(id);
    const res = await fetch(`/api/guestlist/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Couldn't update.");
      return;
    }
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No entries.</p>
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
              <th className="text-left px-4 py-2 font-normal">Name</th>
              <th className="text-left px-4 py-2 font-normal">Category</th>
              <th className="text-left px-4 py-2 font-normal">Host</th>
              <th className="text-left px-4 py-2 font-normal">Day</th>
              <th className="text-left px-4 py-2 font-normal">Contact</th>
              <th className="text-center px-4 py-2 font-normal">Invite</th>
              <th className="text-center px-4 py-2 font-normal">Checked in</th>
              <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((g) => (
              <tr
                key={g.id}
                className="border-t border-[--color-border] hover:bg-[linear-gradient(90deg,var(--color-pink-glow),transparent_50%)] transition-colors"
              >
                <td className="px-4 py-2 text-[--color-fg]">
                  <Link
                    href={`/guestlist/${g.id}` as Route}
                    className="hover:text-brand"
                  >
                    {g.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <CategoryPill category={g.category} />
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                  {g.hostArtistId ? (
                    (artistsById.get(g.hostArtistId) ?? "(deleted)")
                  ) : (
                    <span className="text-[--color-fg-subtle]">-</span>
                  )}
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted] capitalize">
                  {g.day ?? ""}
                </td>
                <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                  {g.email ?? ""}
                  {g.phone && (
                    <div className="text-[10px] text-[--color-fg-subtle] mt-0.5">
                      {g.phone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => patch(g.id, { inviteSent: !g.inviteSent })}
                    disabled={busyId === g.id}
                    className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded hover:opacity-80 transition-opacity ${
                      g.inviteSent ? "pill-emerald" : "pill-amber"
                    }`}
                  >
                    {g.inviteSent ? "sent" : "pending"}
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => patch(g.id, { checkedIn: !g.checkedIn })}
                    disabled={busyId === g.id}
                    className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded hover:opacity-80 transition-opacity ${
                      g.checkedIn ? "pill-emerald" : "pill-amber"
                    }`}
                  >
                    {g.checkedIn ? "yes" : "no"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/guestlist/${g.id}` as Route}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                  >
                    edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const CATEGORY_LABEL: Record<GuestCategory, string> = {
  dj_guest: "DJ guest",
  competition_winner: "Comp winner",
  free_list: "Free list",
  international: "International",
  general_admission: "GA",
};

const CATEGORY_PILL: Record<GuestCategory, string> = {
  dj_guest: "pill-pink",
  competition_winner: "pill-pink",
  free_list: "pill-amber",
  international: "pill-sky",
  general_admission: "pill-amber",
};

function CategoryPill({ category }: { category: GuestCategory }) {
  return (
    <span
      className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded ${CATEGORY_PILL[category]}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}
