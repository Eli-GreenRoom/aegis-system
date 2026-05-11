import { getFirstFestival } from "@/lib/festivals";
import { listArtists, listArtistsByIds, type Artist } from "@/lib/artists/repo";

interface PageProps {
  searchParams: Promise<{ artists?: string }>;
}

export const metadata = {
  title: "Aegis Festival — Press Kit",
  description: "Public artist press kit links for Aegis Festival.",
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

  const artists: Artist[] =
    ids.length > 0
      ? await listArtistsByIds(festival.id, ids)
      : await listArtists({ festivalId: festival.id, archived: "active" });

  // Hide private fields. Don't expose internal IDs, fees, contact phones,
  // passport URLs, comments, etc. — only what we'd put on a public roster.
  const safe = artists.map((a) => ({
    name: a.name,
    nationality: a.nationality,
    agency: a.agency,
    color: a.color,
    instagram: a.instagram,
    soundcloud: a.soundcloud,
    pressKitUrl: a.pressKitUrl,
  }));

  return (
    <main className="min-h-screen px-6 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-14">
          <div className="text-mono text-xs uppercase tracking-[0.22em] text-brand mb-4">
            {festival.name}
          </div>
          <h1 className="text-display text-5xl leading-[1.05] mb-3">
            Press kit
          </h1>
          <p className="text-[--color-fg-muted] max-w-xl">
            {safe.length} {safe.length === 1 ? "artist" : "artists"}{" "}
            {ids.length > 0 ? "on this share" : "on the current lineup"}. Links
            open in a new tab.
          </p>
        </header>

        {safe.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted]">No artists in this share.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[--color-border]">
            {safe.map((a) => (
              <li key={a.name} className="py-5 flex items-start gap-4">
                <span
                  aria-hidden
                  className="mt-1 inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: a.color ?? "var(--color-fg-subtle)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-[--color-fg] text-lg">{a.name}</span>
                    {a.nationality && (
                      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
                        {a.nationality}
                      </span>
                    )}
                    {a.agency && (
                      <span className="text-mono text-xs text-[--color-fg-muted]">
                        {a.agency}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
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
                    {!a.pressKitUrl && !a.instagram && !a.soundcloud && (
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
          Aegis · {festival.location ?? ""}
        </footer>
      </div>
    </main>
  );
}

/** Treat handles like `@hiroko` or `hiroko` as relative to the platform's base URL. */
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
