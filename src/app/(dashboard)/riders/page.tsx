import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import { listRiders } from "@/lib/riders/repo";
import { riderKindEnum } from "@/lib/riders/schema";
import RidersTable from "./_components/RidersTable";

interface PageProps {
  searchParams: Promise<{
    artistId?: string;
    kind?: string;
    confirmed?: string;
  }>;
}

export default async function RidersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const kindParsed = sp.kind ? riderKindEnum.safeParse(sp.kind) : null;
  const confirmed =
    sp.confirmed === "true" ? true : sp.confirmed === "false" ? false : undefined;

  const [riders, artists] = await Promise.all([
    listRiders({
      editionId: edition.id,
      artistId: sp.artistId,
      kind: kindParsed?.success ? kindParsed.data : undefined,
      confirmed,
    }),
    listArtists({ editionId: edition.id, archived: "active" }),
  ]);

  const artistsById = new Map(artists.map((a) => [a.id, a.name]));

  return (
    <>
      <Topbar
        title="Riders"
        subtitle={`${riders.length} on ${edition.name}`}
        actions={
          <Link href={"/riders/new" as Route}>
            <Button>New rider</Button>
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-6">
        <form className="flex flex-wrap items-end gap-3">
          <Filter label="Artist" name="artistId" value={sp.artistId ?? ""}>
            <option value="">Any</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Filter>
          <Filter label="Kind" name="kind" value={sp.kind ?? ""}>
            <option value="">Any</option>
            <option value="hospitality">Hospitality</option>
            <option value="technical">Technical</option>
          </Filter>
          <Filter label="Confirmed" name="confirmed" value={sp.confirmed ?? ""}>
            <option value="">Any</option>
            <option value="true">Confirmed</option>
            <option value="false">Pending</option>
          </Filter>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        <RidersTable riders={riders} artistsById={artistsById} />
      </div>
    </>
  );
}

function Filter({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] min-w-[140px]"
      >
        {children}
      </select>
    </label>
  );
}
