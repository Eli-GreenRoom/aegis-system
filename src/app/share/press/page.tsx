import { getFirstFestival } from "@/lib/festivals";
import { listArtists, listArtistsByIds, type Artist } from "@/lib/artists/repo";
import { listStages, listSlots, listSetsForSlot } from "@/lib/lineup/repo";

interface PageProps {
  searchParams: Promise<{ artists?: string; stage?: string }>;
}

export const metadata = {
  title: "GreenRoom Stages — Press Kit",
  description: "Public artist press kit.",
};

export default async function PressPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const festival = await getFirstFestival();
  if (!festival)
    return (
      <main className="min-h-screen px-6 py-16 text-[--color-fg-muted] text-sm">
        No festival configured.
      </main>
    );

  const ids = (sp.artists ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allArtists: Artist[] =
    ids.length > 0
      ? await listArtistsByIds(festival.id, ids)
      : await listArtists({ festivalId: festival.id, archived: "active" });

  // Lineup data
  const stages = await listStages(festival.id);
  const allSlots = await listSlots({ festivalId: festival.id });

  // Build artistId -> first set info
  const artistSetMap = new Map<
    string,
    {
      stageName: string;
      stageColor: string | null;
      date: string;
      startTime: string;
      endTime: string;
    }
  >();
  await Promise.all(
    allSlots.map(async (slot) => {
      const sets = await listSetsForSlot(slot.id);
      const stage = stages.find((s) => s.id === slot.stageId);
      for (const set of sets) {
        if (!artistSetMap.has(set.artistId)) {
          artistSetMap.set(set.artistId, {
            stageName: stage?.name ?? "TBA",
            stageColor: stage?.color ?? null,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
    }),
  );

  // Stage filter
  const stageFilter = sp.stage ?? "";
  const filteredArtists = stageFilter
    ? allArtists.filter(
        (a) => artistSetMap.get(a.id)?.stageName === stageFilter,
      )
    : allArtists;

  // Public-safe fields — no agency, nationality, internal IDs
  const safe = filteredArtists.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    instagram: a.instagram,
    soundcloud: a.soundcloud,
    pressKitUrl: a.pressKitUrl,
    links: (a.links as { label: string; url: string }[] | null) ?? [],
    set: artistSetMap.get(a.id) ?? null,
  }));

  // Sort by set time then alpha
  safe.sort((a, b) => {
    if (a.set && b.set)
      return `${a.set.date}T${a.set.startTime}`.localeCompare(
        `${b.set.date}T${b.set.startTime}`,
      );
    if (a.set) return -1;
    if (b.set) return 1;
    return a.name.localeCompare(b.name);
  });

  const artistsParam = ids.length ? { artists: ids.join(",") } : {};

  return (
    <main className="min-h-screen px-6 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="text-mono text-xs uppercase tracking-[0.22em] text-brand mb-4">
            {festival.name}
          </div>
          <h1 className="text-display text-5xl leading-[1.05] mb-3">
            Press kit
          </h1>
          <p className="text-[--color-fg-muted] max-w-xl">
            {safe.length} {safe.length === 1 ? "artist" : "artists"}
            {ids.length > 0 ? " on this share" : " on the current lineup"}.
          </p>
        </header>

        {/* Stage filter */}
        {stages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <a
              href={ids.length ? `?artists=${ids.join(",")}` : "?"}
              className={`rounded-full px-4 py-1.5 text-xs border transition-colors ${
                !stageFilter
                  ? "bg-brand text-[--color-brand-fg] border-brand"
                  : "border-[--color-border] text-[--color-fg-muted] hover:border-[--color-brand]/50"
              }`}
            >
              All stages
            </a>
            {stages.map((s) => {
              const params = new URLSearchParams({
                ...artistsParam,
                stage: s.name,
              } as Record<string, string>);
              const active = stageFilter === s.name;
              return (
                <a
                  key={s.id}
                  href={`?${params.toString()}`}
                  className="rounded-full px-4 py-1.5 text-xs border transition-colors"
                  style={
                    active && s.color
                      ? {
                          borderColor: s.color,
                          color: s.color,
                          background: `${s.color}18`,
                        }
                      : active
                        ? {
                            borderColor: "var(--color-brand)",
                            color: "var(--color-brand)",
                            background: "rgba(var(--color-brand-rgb),0.1)",
                          }
                        : s.color
                          ? {
                              borderColor: `${s.color}40`,
                              color: "var(--color-fg-muted)",
                            }
                          : {
                              borderColor: "var(--color-border)",
                              color: "var(--color-fg-muted)",
                            }
                  }
                >
                  {s.name}
                </a>
              );
            })}
          </div>
        )}

        {safe.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted]">No artists in this share.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[--color-border]">
            {safe.map((a) => (
              <li key={a.id} className="py-6 flex items-start gap-4">
                <span
                  aria-hidden
                  className="mt-2 inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: a.color ?? "var(--color-fg-subtle)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap mb-1">
                    <span className="text-[--color-fg] text-lg font-medium">
                      {a.name}
                    </span>
                    {a.set && (
                      <span
                        className="text-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border"
                        style={
                          a.set.stageColor
                            ? {
                                color: a.set.stageColor,
                                borderColor: `${a.set.stageColor}50`,
                                background: `${a.set.stageColor}15`,
                              }
                            : {
                                color: "var(--color-fg-muted)",
                                borderColor: "var(--color-border)",
                              }
                        }
                      >
                        {a.set.stageName}
                      </span>
                    )}
                  </div>

                  {a.set && (
                    <p className="text-mono text-xs text-[--color-fg-muted] mb-2">
                      {formatDate(a.set.date)} · {a.set.startTime}–
                      {a.set.endTime}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {a.pressKitUrl && (
                      <ExtLink href={a.pressKitUrl} label="Press kit" primary />
                    )}
                    {a.instagram && (
                      <ExtLink
                        href={maybeUrl(a.instagram, "https://instagram.com/")}
                        label="Instagram"
                      />
                    )}
                    {a.soundcloud && (
                      <ExtLink
                        href={maybeUrl(a.soundcloud, "https://soundcloud.com/")}
                        label="Soundcloud"
                      />
                    )}
                    {a.links.map((l, i) => (
                      <ExtLink key={i} href={l.url} label={l.label} />
                    ))}
                    {!a.pressKitUrl &&
                      !a.instagram &&
                      !a.soundcloud &&
                      a.links.length === 0 && (
                        <span className="text-[--color-fg-subtle] text-xs italic">
                          No links yet.
                        </span>
                      )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-20 text-mono text-[10px] uppercase tracking-[0.22em] text-[--color-fg-subtle]">
          {festival.name} · {festival.location ?? ""}
        </footer>
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
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
  return `${months[parseInt(m!) - 1]} ${parseInt(d!)}`;
}

function maybeUrl(value: string, base: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, "");
}

function ExtLink({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`underline-offset-4 hover:underline ${
        primary
          ? "text-brand text-mono text-xs uppercase tracking-[0.14em]"
          : "text-[--color-fg-muted] text-xs"
      }`}
    >
      {label}
    </a>
  );
}
