import Link from "next/link";
import type { CrewMember } from "@/lib/crew/repo";

export default function CrewTable({ crew }: { crew: CrewMember[] }) {
  if (crew.length === 0) {
    return (
      <div className="border border-[--color-border] rounded-md p-10 text-center">
        <p className="text-[--color-fg-muted] text-sm">No crew.</p>
      </div>
    );
  }

  return (
    <div className="border border-[--color-border] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
          <tr>
            <th className="text-left px-4 py-2 font-normal">Name</th>
            <th className="text-left px-4 py-2 font-normal">Role</th>
            <th className="text-left px-4 py-2 font-normal">Email</th>
            <th className="text-left px-4 py-2 font-normal">Phone</th>
            <th className="text-left px-4 py-2 font-normal">Days</th>
            <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
          </tr>
        </thead>
        <tbody>
          {crew.map((c) => {
            const days = Array.isArray(c.days) ? (c.days as string[]) : [];
            return (
              <tr
                key={c.id}
                className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/crew/${c.id}`}
                    className="text-[--color-fg] hover:text-brand"
                  >
                    {c.name}
                  </Link>
                  {c.archivedAt && (
                    <span className="ml-2 text-mono text-[9px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
                      archived
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted]">{c.role}</td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-mono text-xs">
                  {c.email ?? ""}
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-mono text-xs">
                  {c.phone ?? ""}
                </td>
                <td className="px-4 py-2 text-[--color-fg-muted] text-mono text-xs">
                  {days.join(", ")}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/crew/${c.id}/edit`}
                    className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                  >
                    edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
