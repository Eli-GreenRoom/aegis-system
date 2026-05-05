import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; day?: string }>;
}

export default async function FestivalRoadsheetsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const artists = await listArtists({
    editionId: edition.id,
    search: sp.search,
    archived: "active",
  });

  return (
    <>
      <Topbar
        title="Roadsheets"
        subtitle={`${artists.length} artists on ${edition.name}`}
      />
      <div className="px-6 py-6">
        <form className="mb-5 flex items-end gap-2 max-w-md">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
              Search
            </span>
            <input
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Name, agency, slug, email"
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            />
          </label>
          {sp.day && <input type="hidden" name="day" value={sp.day} />}
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {artists.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">No artists.</p>
          </div>
        ) : (
          <ul className="border border-[--color-border] rounded-md overflow-hidden divide-y divide-[--color-border]">
            {artists.map((a) => (
              <li key={a.id}>
                <Link
                  href={
                    `/festival/roadsheets/${a.id}${sp.day ? `?day=${sp.day}` : ""}` as Route
                  }
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[--color-surface]/40"
                >
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: a.color ?? "var(--color-fg-subtle)",
                    }}
                  />
                  <span className="text-[--color-fg] text-sm flex-1">
                    {a.name}
                  </span>
                  {a.agency && (
                    <span className="text-mono text-[11px] text-[--color-fg-muted]">
                      {a.agency}
                    </span>
                  )}
                  <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
                    open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
