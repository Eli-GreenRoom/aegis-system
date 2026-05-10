import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { getOpenIssues, type OpenIssue } from "@/lib/aggregators";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ scope?: string }>;
}

const SEV_CLASS: Record<OpenIssue["severity"], string> = {
  high: "border-l-[--color-danger] text-coral",
  medium: "border-l-brand text-brand",
  low: "border-l-[--color-fg-subtle] text-[--color-fg-muted]",
};

export default async function FestivalIssuesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const scope = sp.scope === "week" || sp.scope === "all" ? sp.scope : "today";

  const edition = await getCurrentEdition();
  const issues = await getOpenIssues(edition.id, scope);

  return (
    <>
      <Topbar
        title="Issues"
        subtitle={`${issues.length} open · scope: ${scope}`}
      />
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-6">
          <ScopeChip scope="today" current={scope} />
          <ScopeChip scope="week" current={scope} />
          <ScopeChip scope="all" current={scope} />
        </div>

        {issues.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">
              All clear. Nothing flagged in this scope.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.key}
                className={`flex items-start gap-3 rounded-md border border-[--color-border] border-l-4 ${SEV_CLASS[issue.severity]} bg-[--color-surface]/40 p-3`}
              >
                <span className="text-mono text-[10px] uppercase tracking-[0.16em] w-[68px] shrink-0">
                  {issue.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[--color-fg] text-sm">
                    {issue.message}
                  </div>
                  <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-1">
                    {issue.rule}
                    {issue.at && ` · ${issue.at.slice(11, 16)}`}
                  </div>
                </div>
                <EntityLink
                  entityType={issue.entityType}
                  entityId={issue.entityId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ScopeChip({
  scope,
  current,
}: {
  scope: "today" | "week" | "all";
  current: string;
}) {
  const active = scope === current;
  return (
    <Link
      href={`/festival/issues?scope=${scope}` as Route}
      className={`text-mono text-[11px] uppercase tracking-[0.16em] px-3 py-2 rounded-md border ${
        active
          ? "border-brand text-brand bg-[--color-surface-raised]"
          : "border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg]"
      }`}
    >
      {scope}
    </Link>
  );
}

function EntityLink({
  entityType,
  entityId,
}: {
  entityType: OpenIssue["entityType"];
  entityId: string;
}) {
  const map: Record<OpenIssue["entityType"], string> = {
    set: `/lineup`,
    flight: `/flights/${entityId}`,
    pickup: `/ground/${entityId}`,
    hotel_booking: `/hotels/bookings/${entityId}`,
    guestlist: `/guestlist/${entityId}`,
    payment: `/payments/${entityId}`,
  };
  const href = map[entityType];
  return (
    <Link
      href={href as Route}
      className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand whitespace-nowrap pt-0.5"
    >
      open
    </Link>
  );
}
