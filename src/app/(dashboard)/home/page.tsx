import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { and, eq, inArray } from "drizzle-orm";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getOpenIssues, getPickupsInWindow } from "@/lib/aggregators";
import type { OpenIssue } from "@/lib/aggregators";
import { db } from "@/db/client";
import { artists, payments } from "@/db/schema";
import type { PickupStatus } from "@/lib/ground/schema";
import PickupAdvanceButton from "./PickupAdvanceButton";

export const dynamic = "force-dynamic";

function issueHref(
  entityType: OpenIssue["entityType"],
  entityId: string,
): Route {
  switch (entityType) {
    case "set":
      return "/lineup" as Route;
    case "flight":
      return `/flights/${entityId}` as Route;
    case "pickup":
      return "/ground" as Route;
    case "hotel_booking":
      return "/hotels" as Route;
    case "guestlist":
      return "/guestlist" as Route;
    case "payment":
      return "/payments" as Route;
    default:
      return "/home" as Route;
  }
}

const SEV_LABEL: Record<string, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

const SEV_TEXT: Record<string, string> = {
  high: "text-[--color-danger]",
  medium: "text-[--color-warn]",
  low: "text-[--color-fg-subtle]",
};

const SEV_ROW: Record<string, string> = {
  high: "border-[--color-danger]/15 bg-[--color-danger]/5",
  medium: "border-[--color-warn]/15 bg-[--color-warn]/5",
  low: "border-[--color-border] bg-[--color-surface-raised]",
};

function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function fmtTime(dt: Date | null | undefined): string {
  if (!dt) return "--:--";
  return dt.toISOString().slice(11, 16);
}

export default async function DashboardHomePage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival) redirect("/onboarding/festival" as Route);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const [artistRows, issues, pickups, pendingPayments] = await Promise.all([
    db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.festivalId, festival.id)),
    getOpenIssues(festival.id, "all"),
    getPickupsInWindow(festival.id, now, in6h),
    db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(
        and(
          eq(payments.festivalId, festival.id),
          inArray(payments.status, ["pending", "due", "overdue"]),
        ),
      ),
  ]);

  void today;

  const highCount = issues.filter((i) => i.severity === "high").length;
  const overdueCount = pendingPayments.filter(
    (p) => p.status === "overdue",
  ).length;
  const topIssues = issues.slice(0, 6);

  // T-minus (UTC calendar days)
  const [fy, fm, fd] = festival.startDate.split("-").map(Number);
  const festMs = Date.UTC(fy, fm - 1, fd);
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const daysOut = Math.round((festMs - todayMs) / 86_400_000);

  return (
    <>
      <Topbar title="Home" />

      <div className="px-6 py-6 space-y-6 max-w-4xl">
        {/* Festival hero */}
        <div className="rounded-[--radius-lg] bg-[--color-surface-raised] shadow-card px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[17px] font-semibold text-[--color-fg] leading-snug">
              {festival.name}
            </div>
            <div className="mt-1 text-[13px] text-[--color-fg-muted]">
              {fmtDate(festival.startDate)} – {fmtDate(festival.endDate)}
              {festival.location && (
                <span className="text-[--color-fg-subtle]">
                  {" "}
                  · {festival.location}
                </span>
              )}
            </div>
          </div>
          <div
            className="text-[13px] shrink-0"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {daysOut > 0 ? (
              <>
                <span className="text-[--color-fg-subtle]">T-</span>
                <span className="text-brand font-semibold">{daysOut}d</span>
              </>
            ) : daysOut === 0 ? (
              <span className="text-brand font-semibold">Day 0</span>
            ) : (
              <span className="text-[--color-fg-subtle]">post-festival</span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            value={String(artistRows.length)}
            label="Artists"
            href="/artists"
          />
          <StatCard
            value={String(issues.length)}
            label="Open issues"
            hint={highCount > 0 ? `${highCount} high` : undefined}
            hintColor="danger"
            href="/festival/issues"
          />
          <StatCard
            value={String(pendingPayments.length)}
            label="Unpaid"
            hint={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
            hintColor="warn"
            href="/payments"
          />
          <StatCard
            value={String(pickups.length)}
            label="Pickups next 6h"
            href="/ground"
          />
        </div>

        {/* Open issues */}
        {topIssues.length > 0 && (
          <section>
            <SectionHeader
              title="Open Issues"
              count={issues.length}
              href="/festival/issues"
            />
            <div className="space-y-1.5">
              {topIssues.map((issue) => (
                <Link
                  key={issue.key}
                  href={issueHref(issue.entityType, issue.entityId)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[--radius-md] transition-colors hover:brightness-125 ${SEV_ROW[issue.severity]}`}
                >
                  <span
                    className={`text-[10px] font-semibold w-8 shrink-0 ${SEV_TEXT[issue.severity]}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {SEV_LABEL[issue.severity]}
                  </span>
                  <span className="flex-1 text-[13px] text-[--color-fg]">
                    {issue.message}
                  </span>
                  <span className="text-[--color-fg-subtle] text-[12px]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming pickups */}
        {pickups.length > 0 && (
          <section>
            <SectionHeader
              title="Upcoming Pickups"
              count={pickups.length}
              countSuffix="next 6h"
              href="/ground"
            />
            <div className="space-y-1.5">
              {pickups.map(({ pickup, person, vendor }) => (
                <div
                  key={pickup.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[--radius-md] bg-[--color-surface-raised] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                >
                  <span
                    className="text-[12px] text-[--color-fg-subtle] w-10 shrink-0"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {fmtTime(pickup.pickupDt)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[--color-fg] truncate">
                      {person?.name ?? "—"}
                    </div>
                    <div className="text-[11px] text-[--color-fg-muted]">
                      {[pickup.routeFrom, pickup.routeTo]
                        .filter(Boolean)
                        .join(" → ")}
                      {vendor && (
                        <span className="text-[--color-fg-subtle]">
                          {" "}
                          · {vendor.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <PickupAdvanceButton
                    id={pickup.id}
                    status={pickup.status as PickupStatus}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {topIssues.length === 0 && pickups.length === 0 && (
          <div className="text-center py-16 text-[--color-fg-subtle] text-[13px]">
            All clear — no open issues or upcoming pickups.
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  hint,
  hintColor,
  href,
}: {
  value: string;
  label: string;
  hint?: string;
  hintColor?: "danger" | "warn";
  href: string;
}) {
  const hintClass =
    hintColor === "danger"
      ? "text-[--color-danger]"
      : hintColor === "warn"
        ? "text-[--color-warn]"
        : "text-[--color-fg-muted]";

  return (
    <Link
      href={href as Route}
      className="rounded-[--radius-lg] bg-[--color-surface-raised] shadow-card px-4 py-3.5 hover:brightness-110 transition-all block"
    >
      <div
        className="text-[22px] font-semibold leading-none text-[--color-fg]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-[--color-fg-muted]">{label}</div>
      {hint && <div className={`mt-0.5 text-[11px] ${hintClass}`}>{hint}</div>}
    </Link>
  );
}

function SectionHeader({
  title,
  count,
  countSuffix,
  href,
}: {
  title: string;
  count?: number;
  countSuffix?: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[--color-fg-subtle]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-[11px] text-[--color-fg-subtle]">
          · {count}
          {countSuffix ? ` ${countSuffix}` : ""}
        </span>
      )}
      <Link
        href={href as Route}
        className="ml-auto text-[11px] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
      >
        View all →
      </Link>
    </div>
  );
}
