import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { isFestivalMode } from "@/lib/festival-mode";
import {
  getOpenIssues,
  getFestivalReadiness,
  GAP_LABEL,
  GAP_PILL,
  type OpenIssue,
  type ReadinessGap,
} from "@/lib/aggregators";
import { getUnpaidTotal } from "@/lib/payments/repo";

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
      return `/ground/${entityId}` as Route;
    case "hotel_booking":
      return "/hotels/bookings" as Route;
    case "guestlist":
      return "/guestlist" as Route;
    case "payment":
      return "/payments" as Route;
    default:
      return "/home" as Route;
  }
}

function gapHref(artistId: string, gap: ReadinessGap): Route {
  // Land the operator on the artist cockpit with the right Logistics tab
  // already open, so they keep the artist's context instead of dropping
  // into a blank create form.
  switch (gap) {
    case "set":
      return "/lineup" as Route;
    case "contract":
      return `/artists/${artistId}?focus=docs` as Route;
    case "inbound_flight":
      return `/artists/${artistId}?focus=travel` as Route;
    case "hotel":
      return `/artists/${artistId}?focus=stay` as Route;
    case "pickup":
      return `/artists/${artistId}?focus=ground` as Route;
    case "payment":
      return `/artists/${artistId}?focus=money` as Route;
  }
}

const SEV_LABEL: Record<string, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

const SEV_BAR: Record<string, string> = {
  high: "bg-[--color-danger] shadow-[0_0_8px_var(--color-coral-glow)]",
  medium: "bg-[--color-warn]",
  low: "bg-[--color-fg-subtle]",
};

const SEV_TEXT: Record<string, string> = {
  high: "text-[--color-danger]",
  medium: "text-[--color-warn]",
  low: "text-[--color-fg-subtle]",
};

const SEV_HOVER: Record<string, string> = {
  high: "hover:bg-[rgba(255,107,122,0.06)]",
  medium: "hover:bg-[rgba(255,181,70,0.06)]",
  low: "hover:bg-[--color-surface-raised]",
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default async function DashboardHomePage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival) redirect("/onboarding/festival" as Route);

  // Live mode = home is not the right surface. Send Eli straight to /now.
  if (isFestivalMode(festival)) {
    redirect("/festival/now" as Route);
  }

  const now = new Date();

  const [weekIssues, readiness, unpaidTotal] = await Promise.all([
    getOpenIssues(festival.id, "week"),
    getFestivalReadiness(festival.id),
    getUnpaidTotal(festival.id),
  ]);

  // T-minus (UTC calendar days)
  const [fy, fm, fd] = festival.startDate.split("-").map(Number);
  const festMs = Date.UTC(fy, fm - 1, fd);
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const daysOut = Math.round((festMs - todayMs) / 86_400_000);

  const topIssues = weekIssues.slice(0, 5);
  const artistsWithGaps = readiness.byArtist.filter((a) => a.gaps.length > 0);
  const topArtists = artistsWithGaps.slice(0, 8);

  const highIssueCount = weekIssues.filter((i) => i.severity === "high").length;

  // Unpaid display: prefer EUR if non-zero, otherwise USD
  const unpaidDisplay =
    unpaidTotal.EUR > 0
      ? `€${formatCents(unpaidTotal.EUR)}`
      : unpaidTotal.USD > 0
        ? `$${formatCents(unpaidTotal.USD)}`
        : null;

  const allClear = topIssues.length === 0 && artistsWithGaps.length === 0;

  return (
    <>
      <Topbar title="Home" />

      <div className="px-6 py-6 space-y-7 max-w-3xl">
        {/* Festival strip: name + hero T-minus */}
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="text-[15px] text-[--color-fg]">{festival.name}</div>

            {/* Hero T-minus — Newsreader gradient number */}
            <div className="shrink-0 text-right">
              {daysOut > 0 ? (
                <div className="text-hero-gradient text-[32pt] leading-none">
                  T&minus;{daysOut}d
                </div>
              ) : daysOut === 0 ? (
                <div className="text-hero-gradient text-[32pt] leading-none">
                  Day 0
                </div>
              ) : (
                <div
                  className="text-[13px] text-[--color-fg-subtle]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  post-festival
                </div>
              )}
            </div>
          </div>

          {/* Three tinted stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Readiness"
              value={`${readiness.percent}%`}
              sub={`${readiness.fullyPrepped} of ${readiness.totalArtists}`}
              tint="tinted-emerald"
              valueColor="text-brand"
            />
            <StatCard
              label="High Issues"
              value={String(highIssueCount)}
              tint={highIssueCount > 0 ? "tinted-coral" : "tinted-emerald"}
              valueColor={
                highIssueCount > 0 ? "text-[--color-danger]" : "text-brand"
              }
            />
            <StatCard
              label="Unpaid"
              value={unpaidDisplay ?? "—"}
              tint={unpaidDisplay ? "tinted-amber" : "tinted-emerald"}
              valueColor={unpaidDisplay ? "text-[--color-amber]" : "text-brand"}
            />
          </div>

          {/* Readiness progress bar */}
          <div className="space-y-1.5">
            <div
              className="h-1.5 w-full rounded-full bg-[--color-surface-raised] overflow-hidden"
              role="progressbar"
              aria-valuenow={readiness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-[--color-brand] transition-all"
                style={{ width: `${readiness.percent}%` }}
              />
            </div>
          </div>
        </section>

        {/* This week's worklist */}
        {topIssues.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              title="This week"
              count={weekIssues.length}
              href="/festival/issues"
            />
            <div className="space-y-px">
              {topIssues.map((issue) => (
                <Link
                  key={issue.key}
                  href={issueHref(issue.entityType, issue.entityId)}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-md border border-[--color-border] bg-[--color-surface] transition-colors group",
                    SEV_HOVER[issue.severity],
                  ].join(" ")}
                >
                  {/* 2px severity bar replaces dot */}
                  <span
                    className={[
                      "w-0.5 self-stretch shrink-0 rounded-sm",
                      SEV_BAR[issue.severity],
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "text-[10px] font-semibold w-8 shrink-0",
                      SEV_TEXT[issue.severity],
                    ].join(" ")}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {SEV_LABEL[issue.severity]}
                  </span>
                  <span className="flex-1 text-[13px] text-[--color-fg] truncate">
                    {issue.message}
                  </span>
                  <span className="text-[--color-fg-subtle] group-hover:text-[--color-fg-muted] transition-colors text-[12px] shrink-0">
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Pending by artist */}
        {topArtists.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              title="Pending by artist"
              count={artistsWithGaps.length}
              countSuffix="artists"
              href={"/artists?gaps=1" as Route}
            />
            <div className="space-y-1">
              {topArtists.map((a) => (
                <ArtistRow key={a.artistId} artist={a} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state — only when everything is clear */}
        {allClear && (
          <div className="relative">
            <div
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                background:
                  "radial-gradient(40% 60% at 50% 50%, var(--color-brand-glow), transparent 60%)",
              }}
            />
            <div className="relative text-center py-16 text-[--color-fg-subtle] text-[13px]">
              All clear &mdash; every artist is fully prepped.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  tint,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  tint: string;
  valueColor: string;
}) {
  return (
    <div
      className={["rounded-md border p-3 flex flex-col gap-1", tint].join(" ")}
    >
      <div
        className="text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </div>
      <div
        className={["text-display text-[22pt] leading-none", valueColor].join(
          " ",
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[10px] text-[--color-fg-subtle]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function ArtistRow({
  artist,
}: {
  artist: {
    artistId: string;
    artistName: string;
    agency: string | null;
    gaps: ReadinessGap[];
  };
}) {
  const visible = artist.gaps.slice(0, 3);
  const overflow = artist.gaps.length - visible.length;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-[--color-border] bg-[--color-surface]">
      <Link
        href={`/artists/${artist.artistId}` as Route}
        className="flex-1 min-w-0 hover:text-brand transition-colors"
      >
        <div className="text-[13px] text-[--color-fg] truncate">
          {artist.artistName}
        </div>
        {artist.agency && (
          <div className="text-[11px] text-[--color-fg-subtle] truncate">
            {artist.agency}
          </div>
        )}
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        {visible.map((g) => (
          <Link
            key={g}
            href={gapHref(artist.artistId, g)}
            className={[
              "text-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded",
              GAP_PILL[g],
            ].join(" ")}
            title={`Add ${GAP_LABEL[g]} for ${artist.artistName}`}
          >
            {GAP_LABEL[g]}
          </Link>
        ))}
        {overflow > 0 && (
          <Link
            href={`/artists/${artist.artistId}` as Route}
            className="text-mono text-[10px] px-2 py-1 rounded border border-[--color-border] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
          >
            +{overflow}
          </Link>
        )}
      </div>
    </div>
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
  href: Route;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <h2
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[--color-fg-subtle]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-[11px] text-[--color-fg-subtle]">
          &middot; {count}
          {countSuffix ? ` ${countSuffix}` : ""}
        </span>
      )}
      <Link
        href={href}
        className="ml-auto text-[11px] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
      >
        View all &rarr;
      </Link>
    </div>
  );
}
