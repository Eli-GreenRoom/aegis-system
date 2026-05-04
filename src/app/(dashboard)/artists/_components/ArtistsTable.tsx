import Link from "next/link";
import type { Artist } from "@/lib/artists/repo";

export default function ArtistsTable({ artists }: { artists: Artist[] }) {
  if (artists.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No artists.</p>
      </div>
    );
  }

  return (
    <div className="border border-[--color-border] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
          <tr>
            <th className="text-left px-4 py-2 font-normal">Name</th>
            <th className="text-left px-4 py-2 font-normal">Agency</th>
            <th className="text-left px-4 py-2 font-normal">Country</th>
            <th className="text-left px-4 py-2 font-normal">Email</th>
            <th className="text-left px-4 py-2 font-normal">Local</th>
            <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
          </tr>
        </thead>
        <tbody>
          {artists.map((a) => (
            <tr
              key={a.id}
              className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
            >
              <td className="px-4 py-2">
                <Link
                  href={`/artists/${a.id}`}
                  className="text-[--color-fg] hover:text-brand"
                >
                  {a.name}
                </Link>
                {a.archivedAt && (
                  <span className="ml-2 text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
                    archived
                  </span>
                )}
                <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                  {a.slug}
                </div>
              </td>
              <td className="px-4 py-2 text-[--color-fg-muted]">{a.agency ?? ""}</td>
              <td className="px-4 py-2 text-[--color-fg-muted]">{a.nationality ?? ""}</td>
              <td className="px-4 py-2 text-[--color-fg-muted] text-mono text-xs">
                {a.email ?? ""}
              </td>
              <td className="px-4 py-2 text-[--color-fg-muted]">
                {a.local ? "yes" : ""}
              </td>
              <td className="px-4 py-2 text-right">
                <Link
                  href={`/artists/${a.id}/edit`}
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
  );
}
