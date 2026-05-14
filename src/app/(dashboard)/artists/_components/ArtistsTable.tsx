import Link from "next/link";
import type { Artist } from "@/lib/artists/repo";

export default function ArtistsTable({ artists }: { artists: Artist[] }) {
  if (artists.length === 0) {
    return (
      <div className="shadow-card rounded-[--radius-lg] p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No artists.</p>
      </div>
    );
  }

  return (
    <div className="shadow-card rounded-[--radius-lg] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 font-normal">Name</th>
            <th className="text-left px-4 py-3 font-normal">Agency</th>
            <th className="text-left px-4 py-3 font-normal hidden sm:table-cell">
              Country
            </th>
            <th className="text-left px-4 py-3 font-normal hidden md:table-cell">
              Email
            </th>
            <th className="text-right px-4 py-3 font-normal w-[1%]"></th>
          </tr>
        </thead>
        <tbody>
          {artists.map((a) => (
            <tr
              key={a.id}
              className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="shrink-0 w-2 h-2 rounded-full"
                    style={{ background: a.color ?? "var(--color-fg-subtle)" }}
                  />
                  <div>
                    <Link
                      href={`/artists/${a.id}`}
                      className="text-[--color-fg] hover:text-brand transition-colors font-medium"
                    >
                      {a.name}
                    </Link>
                    {a.archivedAt && (
                      <span className="ml-2 text-mono text-[9px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
                        archived
                      </span>
                    )}
                    {a.local && (
                      <span className="ml-2 text-mono text-[9px] uppercase tracking-[0.14em] text-[--color-brand]">
                        local
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[--color-fg-muted] text-[13px]">
                {a.agency ?? (
                  <span className="text-[--color-fg-subtle]">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-[--color-fg-muted] text-[13px] hidden sm:table-cell">
                {a.nationality ?? (
                  <span className="text-[--color-fg-subtle]">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-[--color-fg-muted] text-mono text-[11px] hidden md:table-cell">
                {a.email ?? <span className="text-[--color-fg-subtle]">-</span>}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/artists/${a.id}`}
                  className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] hover:text-brand transition-colors"
                >
                  view
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
