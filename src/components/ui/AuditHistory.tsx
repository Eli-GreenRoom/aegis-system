import { format } from "date-fns";
import type { AuditEntityType } from "@/lib/audit";
import { getAuditHistory } from "@/lib/audit";

interface Props {
  entityType: AuditEntityType;
  entityId: string;
}

export default async function AuditHistory({ entityType, entityId }: Props) {
  const events = await getAuditHistory(entityType, entityId);

  if (events.length === 0) return null;

  return (
    <details className="rounded-md border border-[--color-border] bg-[--color-surface] mt-6">
      <summary className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] px-4 py-3 cursor-pointer select-none hover:text-[--color-fg] transition-colors">
        History · {events.length}
      </summary>
      <ul className="border-t border-[--color-border] divide-y divide-[--color-border]">
        {events.map((e) => {
          const diff = e.diff as {
            field?: string;
            from?: unknown;
            to?: unknown;
          } | null;
          return (
            <li
              key={e.id}
              className="px-4 py-2.5 flex items-baseline justify-between gap-4 text-sm"
            >
              <span className="text-[--color-fg-muted]">
                {diff?.field === "status" ? (
                  <>
                    <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-[--color-fg-subtle]">
                      {String(diff.from ?? "—")}
                    </span>
                    <span className="text-[--color-fg-subtle] mx-1.5">→</span>
                    <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-[--color-fg]">
                      {String(diff.to ?? "—")}
                    </span>
                  </>
                ) : (
                  <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-[--color-fg-subtle]">
                    {e.action}
                    {diff?.field ? ` · ${diff.field}` : ""}
                  </span>
                )}
              </span>
              <span className="text-mono text-[10px] text-[--color-fg-subtle] shrink-0">
                {format(new Date(e.createdAt), "d MMM yyyy HH:mm")}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
