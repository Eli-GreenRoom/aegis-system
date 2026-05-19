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
  type OpenIssue,
  type ReadinessGap,
} from "@/lib/aggregators";

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
  switch (gap) {
    case "set":
      return "/lineup" as Route;
    case "contract":
      return `/contracts/new?artistId=${artistId}` as Route;
    case "inbound_flight":
      return `/flights/new?personId=${artistId}&personKind=artist&direction=inbound` as Route;
    case "hotel":
      return `/hotels/bookings/new?personId=${artistId}&personKind=artist` as Route;
    case "pickup":
      return `/ground/new?personId=${artistId}&personKind=artist` as Route;
    case "payment":
      return `/payments/new?artistId=${artistId}` as Route;
  }
}

const SEV_LABEL: Record<string, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

const SEV_DOT: Record<string, string> = {
  high: "bg-[--color-danger]",
  medium: "bg-[--color-warn]",
  low: "bg-[--color-fg-subtle]",
};

const SEV_TEXT: Record<string, string> = {
  high: "text-[--color-danger]",
  medium: "text-[--color-warn]",
  low: "text-[--color-fg-subtle]",
};

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

  const [weekIssues, readiness] = await Promise.all([
    getOpenIssues(festival.id, "week"),
    getFestivalReadiness(festival.id),
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

  return (
    <>
      <Topbar title="Home" />

      <div className="px-6 py-6 space-y-7 max-w-3xl">
        {/* Compact festival strip + progress */}
        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-[15px] text-[--color-fg]">{festival.name}</div>
            <div
              className="text-[12px] text-[--color-fg-subtle]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {daysOut > 0 ? (
                <>
                  T-<span className="text-brand">{daysOut}d</span>
                </>
              ) : daysOut === 0 ? (
                <span className="text-brand">Day 0</span>
              ) : (
                <>post-festival</>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <div
                className="text-[11px] uppercase tracking-[0.14em] text-[--color-fg-subtle]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Lineup readiness
              </div>
              <div
                className="text-[11px] text-[--color-fg-muted]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {readiness.fullyPrepped} of {readiness.totalArtists} prepped
                <span className="text-[--color-fg-subtle]">
                  {" "}
                  · {readiness.percent}%
                </span>
              </div>
            </div>
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
        {topIssues.length > 0 ? (
          <section className="space-y-2">
            <SectionHeader
              title="This week"
              count={weekIssues.length}
              href="/festival/issues"
            />
            <div className="space-y-1">
              {topIssues.map((issue) => (
                <Link
                  key={issue.key}
                  href={issueHref(issue.entityType, issue.entityId)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-[--color-border] bg-[--color-surface] hover:bg-[--color-surface-raised] transition-colors group"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEV_DOT[issue.severity]}`}
                  />
                  <span
                    className={`text-[10px] font-semibold w-8 shrink-0 ${SEV_TEXT[issue.severity]}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {SEV_LABEL[issue.severity]}
                  </span>
                  <span className="flex-1 text-[13px] text-[--color-fg] truncate">
                    {issue.message}
                  </span>
                  <span className="text-[--color-fg-subtle] group-hover:text-[--color-fg-muted] transition-colors text-[12px] shrink-0">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Pending by artist — the "manage what's missing" view */}
        {topArtists.length > 0 ? (
          <section className="space-y-2">
            <SectionHeader
              title="Pending by artist"
              count={artistsWithGaps.length}
              countSuffix="artists"
              href="/artists"
            />
            <div className="space-y-1">
              {topArtists.map((a) => (
                <ArtistRow key={a.artistId} artist={a} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Empty state — only when everything is clear */}
        {topIssues.length === 0 && artistsWithGaps.length === 0 && (
          <div className="text-center py-16 text-[--color-fg-subtle] text-[13px]">
            All clear — every artist is fully prepped.
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

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
  // Show up to 3 inline gap chips; collapse the rest into "+N".
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
            className="text-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-[--color-border-strong] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-white/30 transition-colors"
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
  href: string;
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
