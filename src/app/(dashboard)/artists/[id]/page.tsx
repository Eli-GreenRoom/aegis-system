export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
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

  const statusLabel = artist.archivedAt ? "Archived" : null;
  const subline = [artist.agency, artist.nationality]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Topbar
        title={artist.name}
        subtitle={statusLabel ?? subline ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/festival/roadsheets/${artist.id}` as Route}>
              <Button variant="secondary" size="sm">
                Roadsheet
              </Button>
            </Link>
            <Link href={`/artists/${artist.id}/edit`}>
              <Button size="sm">Edit</Button>
            </Link>
          </div>
        }
      />

      <div className="px-6 py-6 max-w-4xl space-y-4">
        {/* Hero identity card */}
        <div className="shadow-card rounded-[--radius-lg] p-5 flex items-start gap-4">
          <div
            className="mt-1 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black/60"
            style={{
              background: artist.color ?? "var(--color-surface-overlay)",
            }}
          >
            {artist.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[--color-fg]">
                {artist.name}
              </h1>
              {artist.local && <Badge label="Local" color="brand" />}
              {artist.archivedAt && <Badge label="Archived" color="muted" />}
            </div>
            {artist.legalName && (
              <p className="text-mono text-xs text-[--color-fg-muted] mt-0.5">
                Legal: {artist.legalName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[--color-fg-muted]">
              {artist.agency && <span>{artist.agency}</span>}
              {artist.nationality && <span>{artist.nationality}</span>}
              {artist.visaStatus && (
                <span className="text-[--color-fg-subtle]">
                  Visa: {artist.visaStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact */}
          <Card title="Contact">
            <Field
              label="Artist email"
              value={artist.email}
              mono
              link={artist.email ? `mailto:${artist.email}` : null}
            />
            <Field label="Phone" value={artist.phone} mono />
            <Field label="Agency" value={artist.agency} />
            <Field
              label="Agent email"
              value={artist.agentEmail}
              mono
              link={artist.agentEmail ? `mailto:${artist.agentEmail}` : null}
            />
          </Card>

          {/* Identity */}
          <Card title="Identity">
            <Field label="Slug" value={artist.slug} mono />
            <Field label="Nationality" value={artist.nationality} />
            <Field label="Visa status" value={artist.visaStatus} />
            <Field label="Local act" value={artist.local ? "Yes" : "No"} />
            {artist.color && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
                  Color
                </span>
                <span
                  className="inline-block w-4 h-4 rounded-full border border-white/10"
                  style={{ background: artist.color }}
                />
                <span className="text-mono text-xs text-[--color-fg-muted]">
                  {artist.color}
                </span>
              </div>
            )}
          </Card>

          {/* Links & files */}
          <Card title="Links & files">
            <Field label="Instagram" value={artist.instagram} />
            <Field label="Soundcloud" value={artist.soundcloud} />
            <FileField label="Press kit" url={artist.pressKitUrl} />
            <FileField label="Passport file" url={artist.passportFileUrl} />
          </Card>

          {/* Quick links */}
          <Card title="Quick links">
            <div className="space-y-2">
              <QuickLink
                href={`/festival/roadsheets/${artist.id}` as Route}
                label="Full roadsheet"
              />
              <QuickLink
                href={
                  `/flights?artistSearch=${encodeURIComponent(artist.name)}` as Route
                }
                label="Flights"
              />
              <QuickLink
                href={
                  `/hotels/bookings?artistSearch=${encodeURIComponent(artist.name)}` as Route
                }
                label="Hotel bookings"
              />
              <QuickLink
                href={
                  `/ground?artistSearch=${encodeURIComponent(artist.name)}` as Route
                }
                label="Ground transport"
              />
              <QuickLink
                href={
                  `/payments?artistSearch=${encodeURIComponent(artist.name)}` as Route
                }
                label="Payments"
              />
            </div>
          </Card>
        </div>

        {/* Notes */}
        {artist.comments && (
          <Card title="Notes">
            <p className="text-sm text-[--color-fg] whitespace-pre-wrap leading-relaxed">
              {artist.comments}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shadow-card rounded-[--radius-lg] p-5">
      <h2 className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] mb-4">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: "brand" | "muted" }) {
  const cls =
    color === "brand"
      ? "bg-[--color-brand]/10 text-[--color-brand] border-[--color-brand]/20"
      : "bg-white/[0.04] text-[--color-fg-muted] border-white/[0.08]";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-mono text-[10px] uppercase tracking-[0.14em] ${cls}`}
    >
      {label}
    </span>
  );
}

function Field({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3 min-w-0">
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] shrink-0 w-24">
        {label}
      </span>
      {link ? (
        <a
          href={link}
          className={`text-brand hover:underline underline-offset-2 truncate ${mono ? "text-mono text-xs" : "text-sm"}`}
        >
          {value}
        </a>
      ) : (
        <span
          className={`text-[--color-fg] truncate ${mono ? "text-mono text-xs" : "text-sm"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function FileField({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] shrink-0 w-24">
        {label}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-brand text-mono text-xs hover:underline underline-offset-2"
        >
          open file
        </a>
      ) : (
        <span className="text-[--color-fg-subtle] text-xs italic">none</span>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-sm text-[--color-fg-muted] hover:text-[--color-fg] transition-colors group"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[--color-fg-subtle] group-hover:bg-brand transition-colors" />
      {label}
    </Link>
  );
}
