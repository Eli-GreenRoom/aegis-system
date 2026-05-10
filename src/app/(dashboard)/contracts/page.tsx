import Link from "next/link";
import { format } from "date-fns";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import { listContracts } from "@/lib/contracts/repo";
import {
  contractStatusEnum,
  type ContractStatus,
} from "@/lib/contracts/schema";

interface PageProps {
  searchParams: Promise<{
    artistId?: string;
    status?: string;
  }>;
}

export default async function ContractsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const statusParsed = sp.status
    ? contractStatusEnum.safeParse(sp.status)
    : null;

  const [contracts, artists] = await Promise.all([
    listContracts({
      editionId: edition.id,
      artistId: sp.artistId,
      status: statusParsed?.success ? statusParsed.data : undefined,
    }),
    listArtists({ editionId: edition.id, archived: "active" }),
  ]);

  const artistsById = new Map(artists.map((a) => [a.id, a.name]));

  return (
    <>
      <Topbar
        title="Contracts"
        subtitle={`${contracts.length} on ${edition.name}`}
        actions={
          <Link href={"/contracts/new" as Route}>
            <Button>New contract</Button>
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
          <Filter label="Status" name="status" value={sp.status ?? ""}>
            <option value="">Any</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="void">Void</option>
          </Filter>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        {contracts.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">No contracts.</p>
          </div>
        ) : (
          <div className="border border-[--color-border] rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">Artist</th>
                  <th className="text-left px-4 py-2 font-normal">Status</th>
                  <th className="text-left px-4 py-2 font-normal">Sent</th>
                  <th className="text-left px-4 py-2 font-normal">Signed</th>
                  <th className="text-left px-4 py-2 font-normal">Files</th>
                  <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
                  >
                    <td className="px-4 py-2 text-[--color-fg]">
                      <Link
                        href={`/contracts/${c.id}` as Route}
                        className="hover:text-brand"
                      >
                        {artistsById.get(c.artistId) ?? "(deleted artist)"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <ContractStatusPill status={c.status} />
                    </td>
                    <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {c.sentAt
                        ? format(new Date(c.sentAt), "d MMM HH:mm")
                        : ""}
                    </td>
                    <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {c.signedAt
                        ? format(new Date(c.signedAt), "d MMM HH:mm")
                        : ""}
                    </td>
                    <td className="px-4 py-2 text-mono text-xs">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand underline-offset-4 hover:underline mr-3"
                        >
                          draft
                        </a>
                      )}
                      {c.signedFileUrl && (
                        <a
                          href={c.signedFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-mint underline-offset-4 hover:underline"
                        >
                          signed
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/contracts/${c.id}` as Route}
                        className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                      >
                        edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const STATUS_CLASSES: Record<ContractStatus, string> = {
  draft: "border-[--color-border-strong] text-[--color-fg-muted]",
  sent: "border-brand/40 text-brand",
  signed: "border-[--color-brand]/60 text-mint",
  void: "border-[--color-danger]/40 text-coral",
};

function ContractStatusPill({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${STATUS_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}
