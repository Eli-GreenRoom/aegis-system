export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getContract } from "@/lib/contracts/repo";
import { db } from "@/db/client";
import { teamMembers, artists } from "@/db/schema";
import PDFSignerPage from "./_components/PDFSignerPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SignContractPage({ params }: Props) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  if (contract.status === "signed") redirect(`/contracts/${id}`);
  if (!contract.fileUrl) redirect(`/contracts/${id}`);

  const [[me], [artist]] = await Promise.all([
    db
      .select({
        name: teamMembers.name,
        signatureUrl: teamMembers.signatureUrl,
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, session.memberId))
      .limit(1),
    db
      .select({ name: artists.name })
      .from(artists)
      .where(eq(artists.id, contract.artistId))
      .limit(1),
  ]);

  return (
    <>
      <Topbar title="Sign Contract" subtitle={artist?.name ?? undefined} />
      <PDFSignerPage
        contractId={id}
        artistId={contract.artistId}
        fileUrl={contract.fileUrl}
        savedSignatureUrl={me?.signatureUrl ?? null}
        signerName={me?.name ?? null}
      />
    </>
  );
}
