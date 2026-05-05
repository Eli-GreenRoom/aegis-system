import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCrewMember } from "@/lib/crew/repo";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CrewDetailPage({ params }: PageProps) {
  const { id } = await params;
  const member = await getCrewMember(id);
  if (!member) notFound();

  const days = Array.isArray(member.days) ? (member.days as string[]) : [];

  return (
    <>
      <Topbar
        title={member.name}
        subtitle={member.archivedAt ? "Archived" : member.role}
        actions={
          <Link href={`/crew/${member.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <dl className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Row label="Role" value={member.role} />
          <Row label="Email" value={member.email} mono />
          <Row label="Phone" value={member.phone} mono />
          <Row label="Nationality" value={member.nationality} />
          <Row label="Visa status" value={member.visaStatus} />
          <Row label="Days" value={days.join(", ") || null} />
          <LinkRow label="Press kit" url={member.pressKitUrl} />
          <LinkRow label="Passport file" url={member.passportFileUrl} />
          {member.comments && (
            <div className="col-span-2">
              <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
                Comments
              </dt>
              <dd className="text-[--color-fg] whitespace-pre-wrap">{member.comments}</dd>
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

function LinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
        {label}
      </dt>
      <dd>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-brand underline-offset-4 hover:underline text-mono text-xs break-all"
          >
            open
          </a>
        ) : (
          <span className="text-[--color-fg-subtle]">-</span>
        )}
      </dd>
    </div>
  );
}
