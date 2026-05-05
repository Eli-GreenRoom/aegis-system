import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import {
  getGuestlistSummary,
  listGuestlist,
} from "@/lib/guestlist/repo";
import { guestCategoryEnum } from "@/lib/guestlist/schema";
import GuestlistTable from "./_components/GuestlistTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    hostArtistId?: string;
    day?: string;
    inviteSent?: string;
    checkedIn?: string;
  }>;
}

export default async function GuestlistPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const categoryParsed = sp.category
    ? guestCategoryEnum.safeParse(sp.category)
    : null;
  const inviteSent =
    sp.inviteSent === "true"
      ? true
      : sp.inviteSent === "false"
        ? false
        : undefined;
  const checkedIn =
    sp.checkedIn === "true"
      ? true
      : sp.checkedIn === "false"
        ? false
        : undefined;

  const [entries, summary, artists] = await Promise.all([
    listGuestlist({
      editionId: edition.id,
      search: sp.search,
      category: categoryParsed?.success ? categoryParsed.data : undefined,
      hostArtistId: sp.hostArtistId,
      day: sp.day,
      inviteSent,
      checkedIn,
    }),
    getGuestlistSummary(edition.id),
    listArtists({ editionId: edition.id, archived: "active" }),
  ]);

  const artistsById = new Map(artists.map((a) => [a.id, a.name]));

  return (
    <>
      <Topbar
        title="Guestlist"
        subtitle={`${entries.length} of ${summary.total} on ${edition.name}`}
        actions={
          <Link href={"/guestlist/new" as Route}>
            <Button>New entry</Button>
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-6">
        {/* Summary cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Total"
            tone="muted"
            count={summary.total}
            sub={`${summary.invited} invited`}
          />
          <SummaryCard
            label="Pending invite"
            tone="brand"
            count={summary.notInvited}
          />
          <SummaryCard
            label="Checked in"
            tone="mint"
            count={summary.checkedIn}
          />
          <SummaryCard
            label="DJ guests"
            tone="muted"
            count={summary.countsByCategory.dj_guest}
            sub={`${summary.countsByCategory.competition_winner} winners · ${summary.countsByCategory.free_list} free list`}
          />
        </section>

        {/* Filters */}
        <form className="flex flex-wrap items-end gap-3">
          <Filter label="Category" name="category" value={sp.category ?? ""}>
            <option value="">Any</option>
            <option value="dj_guest">DJ guest</option>
            <option value="competition_winner">Competition winner</option>
            <option value="free_list">Free list</option>
            <option value="international">International</option>
            <option value="general_admission">General admission</option>
          </Filter>
          <Filter label="Host" name="hostArtistId" value={sp.hostArtistId ?? ""}>
            <option value="">Any</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Filter>
          <Filter label="Day" name="day" value={sp.day ?? ""}>
            <option value="">Any</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </Filter>
          <Filter label="Invite" name="inviteSent" value={sp.inviteSent ?? ""}>
            <option value="">Any</option>
            <option value="true">Sent</option>
            <option value="false">Pending</option>
          </Filter>
          <Filter label="Checked in" name="checkedIn" value={sp.checkedIn ?? ""}>
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Filter>
          <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
              Search
            </span>
            <input
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Name, email, phone, comments"
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            />
          </label>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        <GuestlistTable entries={entries} artistsById={artistsById} />
      </div>
    </>
  );
}

function SummaryCard({
  label,
  tone,
  count,
  sub,
}: {
  label: string;
  tone: "brand" | "mint" | "coral" | "muted";
  count: number;
  sub?: string;
}) {
  const labelClass =
    tone === "brand"
      ? "text-brand"
      : tone === "mint"
        ? "text-mint"
        : tone === "coral"
          ? "text-coral"
          : "text-[--color-fg-muted]";
  return (
    <div className="border border-[--color-border] rounded-md p-4 bg-[--color-surface]/40">
      <div
        className={`text-mono text-[10px] uppercase tracking-[0.18em] ${labelClass}`}
      >
        {label}
      </div>
      <div className="mt-2 text-mono text-2xl text-[--color-fg]">{count}</div>
      {sub && (
        <div className="mt-1 text-mono text-[11px] text-[--color-fg-muted]">
          {sub}
        </div>
      )}
    </div>
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
