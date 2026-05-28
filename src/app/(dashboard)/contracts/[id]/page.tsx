export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { eq } from "drizzle-orm";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { getContract } from "@/lib/contracts/repo";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import ContractForm from "../_components/ContractForm";
import SignContractDialog from "../_components/SignContractDialog";
import type { ContractStatus } from "@/lib/contracts/schema";
import { format } from "date-fns";
import AuditHistory from "@/components/ui/AuditHistory";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Draft",
  sent: "Received",
  signed: "Signed",
  void: "Void",
};

const STATUS_PILL: Record<ContractStatus, string> = {
  draft: "pill-amber",
  sent: "pill-amber",
  signed: "pill-emerald",
  void: "pill-coral",
};

export default async function ContractDetailPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const artists = await listArtists({
    festivalId: festival.id,
    archived: "active",
  });
  const artist = artists.find((a) => a.id === contract.artistId);

  const canSign =
    !!contract.fileUrl &&
    contract.status !== "signed" &&
    contract.status !== "void";

  const [me] = await db
    .select({ signatureUrl: teamMembers.signatureUrl })
    .from(teamMembers)
    .where(eq(teamMembers.id, session.memberId))
    .limit(1);

  return (
    <>
      <Topbar
        title="Contract"
        subtitle={
          STATUS_LABELS[contract.status as ContractStatus] ?? contract.status
        }
        actions={
          artist ? (
            <Link href={`/artists/${artist.id}` as Route}>
              <Button variant="ghost" size="sm">
                &larr; {artist.name}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="px-6 py-6 space-y-6">
        {/* Actions card */}
        <div className="border border-[--color-border] rounded-md p-4 space-y-4 bg-[--color-surface]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded ${STATUS_PILL[contract.status as ContractStatus] ?? "pill-amber"}`}
              >
                {STATUS_LABELS[contract.status as ContractStatus] ??
                  contract.status}
              </span>
              {contract.sentAt && (
                <span className="text-mono text-xs text-[--color-fg-muted]">
                  Received {format(new Date(contract.sentAt), "d MMM yyyy")}
                </span>
              )}
              {contract.signedAt && (
                <span className="text-mono text-xs text-mint">
                  Signed {format(new Date(contract.signedAt), "d MMM yyyy")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {contract.fileUrl && (
                <Link
                  href={contract.fileUrl as Route}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center h-8 px-3 rounded-md border border-[--color-border-strong] text-xs text-[--color-fg-muted] hover:text-[--color-fg] hover:border-[--color-border-strong]/80 transition-colors"
                >
                  View Draft
                </Link>
              )}
              {canSign && (
                <SignContractDialog
                  contractId={contract.id}
                  fileUrl={contract.fileUrl!}
                  savedSignatureUrl={me?.signatureUrl ?? null}
                />
              )}
              {contract.signedFileUrl && (
                <Link
                  href={contract.signedFileUrl as Route}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center h-8 px-3 rounded-md bg-mint/10 border border-mint/30 text-xs text-mint hover:bg-mint/20 transition-colors"
                >
                  Download Signed
                </Link>
              )}
            </div>
          </div>

          {contract.status === "signed" && (
            <p className="text-xs text-[--color-fg-muted]">
              Contract is signed. Download it above and send back to the artist.
            </p>
          )}
          {!contract.fileUrl && (
            <p className="text-xs text-[--color-fg-subtle]">
              Upload the draft PDF received from the artist to enable in-system
              signing.
            </p>
          )}
        </div>

        <ContractForm contract={contract} artists={artists} />
        <AuditHistory entityType="contract" entityId={contract.id} />
      </div>
    </>
  );
}
