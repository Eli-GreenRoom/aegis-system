import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getArtist } from "@/lib/artists/repo";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { id } = await params;
  const artist = await getArtist(id);
  if (!artist) notFound();

  return (
    <>
      <Topbar
        title={artist.name}
        subtitle={
          artist.archivedAt
            ? "Archived"
            : [artist.agency, artist.nationality].filter(Boolean).join(" - ") || undefined
        }
        actions={
          <Link href={`/artists/${artist.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <dl className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Row label="Slug" value={artist.slug} mono />
          <Row label="Legal name" value={artist.legalName} />
          <Row label="Email" value={artist.email} mono />
          <Row label="Phone" value={artist.phone} mono />
          <Row label="Agency" value={artist.agency} />
          <Row label="Agent email" value={artist.agentEmail} mono />
          <Row label="Nationality" value={artist.nationality} />
          <Row label="Visa status" value={artist.visaStatus} />
          <Row label="Instagram" value={artist.instagram} />
          <Row label="Soundcloud" value={artist.soundcloud} />
          <Row label="Local" value={artist.local ? "yes" : "no"} />
          <Row label="Color" value={artist.color} mono />
          {artist.comments && (
            <div className="col-span-2">
              <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
                Comments
              </dt>
              <dd className="text-[--color-fg] whitespace-pre-wrap">{artist.comments}</dd>
            </div>
          )}
        </dl>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
        {label}
      </dt>
      <dd className={mono ? "text-mono text-[--color-fg]" : "text-[--color-fg]"}>
        {value ? value : <span className="text-[--color-fg-subtle]">-</span>}
      </dd>
    </div>
  );
}
