import Link from "next/link";
import type { Route } from "next";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listStages } from "@/lib/lineup/repo";
import {
  getCurrentlyActiveBookings,
  getNowAndNext,
  getOpenIssues,
  getPickupsInWindow,
} from "@/lib/aggregators";

export const dynamic = "force-dynamic";

export default async function FestivalNowPage() {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const stages = await listStages(festival.id);

  const [pickupsSoon, activeBookings, issues, ...stageNowAndNext] =
    await Promise.all([
      getPickupsInWindow(festival.id, now, in2h),
      getCurrentlyActiveBookings(festival.id, today),
      getOpenIssues(festival.id, "today"),
      ...stages.map((s) => getNowAndNext(s.id, now)),
    ]);

  return (
    <>
      <Topbar
        title="Now"
        subtitle={`${festival.name} · ${format(now, "EEE d MMM HH:mm")}`}
      />
      <div className="px-6 py-6 space-y-8">
        {/* Stages: now + next */}
        <section>
          <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] mb-3">
            Stages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stages.map((stage, i) => {
              const ns = stageNowAndNext[i];
              return (
                <div
                  key={stage.id}
                  className="border border-[--color-border] rounded-md p-4 bg-[--color-surface]/40"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{
                        background: stage.color ?? "var(--color-fg-subtle)",
                      }}
                    />
                    <span className="text-[13px] text-[--color-fg]">
                      {stage.name}
                    </span>
                  </div>
                  <NowNextRow label="Now" set={ns.now} tone="mint" />
                  <NowNextRow label="Next" set={ns.next} tone="brand" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Pickups in next 2h */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
              Pickups in next 2h
            </h2>
            <Link
              href={"/festival/pickups" as Route}
              className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
            >
              all pickups
            </Link>
          </div>
          {pickupsSoon.length === 0 ? (
            <p className="text-[--color-fg-subtle] text-sm italic">
              Nothing in the next 2 hours.
            </p>
          ) : (
            <ul className="space-y-2">
              {pickupsSoon.slice(0, 5).map(({ pickup, person, vendor }) => (
                <li
                  key={pickup.id}
                  className="flex items-center gap-3 rounded-md border border-[--color-border] bg-[--color-surface]/40 p-3"
                >
                  <div className="text-mono text-[12px] text-[--color-fg] tabular-nums w-[60px] shrink-0">
                    {format(new Date(pickup.pickupDt), "HH:mm")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[--color-fg] text-sm truncate">
                      {person?.name ?? "Unknown"}
                      <span className="text-mono text-[11px] text-[--color-fg-muted] ml-2">
                        {pickup.routeFrom} {"->"} {pickup.routeTo}
                      </span>
                    </div>
                    <div className="text-mono text-[11px] text-[--color-fg-muted] mt-0.5 truncate">
                      {vendor?.name ?? "—"}
                      {pickup.driverName && ` · ${pickup.driverName}`}
                    </div>
                  </div>
                  <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
                    {pickup.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Active hotel bookings */}
        <section>
          <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] mb-3">
            Currently checked in ({activeBookings.length})
          </h2>
          {activeBookings.length === 0 ? (
            <p className="text-[--color-fg-subtle] text-sm italic">
              No active bookings.
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activeBookings.slice(0, 10).map(({ booking, hotel, person }) => (
                <li
                  key={booking.id}
                  className="flex items-center gap-3 rounded-md border border-[--color-border] bg-[--color-surface]/40 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[--color-fg] text-sm truncate">
                      {person?.name ?? "Unknown"}
                    </div>
                    <div className="text-mono text-[11px] text-[--color-fg-muted] mt-0.5 truncate">
                      {hotel.name}
                      {booking.roomType && ` · ${booking.roomType}`}
                    </div>
                  </div>
                  <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle]">
                    {booking.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Issues summary */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle]">
              Open issues
            </h2>
            <Link
              href={"/festival/issues" as Route}
              className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
            >
              all issues
            </Link>
          </div>
          {issues.length === 0 ? (
            <p className="text-mono text-[12px] text-mint">All clear.</p>
          ) : (
            <ul className="space-y-2">
              {issues.slice(0, 5).map((i) => (
                <li
                  key={i.key}
                  className="flex items-center gap-3 rounded-md border border-[--color-border] bg-[--color-surface]/40 p-3"
                >
                  <span
                    className={`text-mono text-[10px] uppercase tracking-[0.14em] w-[55px] shrink-0 ${
                      i.severity === "high"
                        ? "text-coral"
                        : i.severity === "medium"
                          ? "text-brand"
                          : "text-[--color-fg-muted]"
                    }`}
                  >
                    {i.severity}
                  </span>
                  <span className="text-[--color-fg] text-sm truncate flex-1">
                    {i.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function NowNextRow({
  label,
  set,
  tone,
}: {
  label: string;
  set: {
    artistName: string;
    slotStartTime: string;
    slotEndTime: string;
  } | null;
  tone: "mint" | "brand";
}) {
  const toneClass = tone === "mint" ? "text-mint" : "text-brand";
  return (
    <div className="flex items-center gap-3 py-1.5 border-t border-[--color-border-subtle] first:border-t-0">
      <span
        className={`text-mono text-[10px] uppercase tracking-[0.18em] w-[40px] shrink-0 ${toneClass}`}
      >
        {label}
      </span>
      {set ? (
        <>
          <span className="text-[--color-fg] text-sm flex-1 truncate">
            {set.artistName}
          </span>
          <span className="text-mono text-[11px] text-[--color-fg-muted] tabular-nums">
            {set.slotStartTime} — {set.slotEndTime}
          </span>
        </>
      ) : (
        <span className="text-[--color-fg-subtle] text-xs italic">—</span>
      )}
    </div>
  );
}
