export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { listVendors } from "@/lib/ground/repo";
import { getPayment, listInvoices } from "@/lib/payments/repo";
import PaymentForm from "../_components/PaymentForm";
import AuditHistory from "@/components/ui/AuditHistory";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const [artists, vendors, invoices] = await Promise.all([
    listArtists({ festivalId: festival.id, archived: "active" }),
    listVendors(),
    listInvoices({ festivalId: festival.id }),
  ]);
  const artist = payment.artistId
    ? artists.find((a) => a.id === payment.artistId)
    : null;

  return (
    <>
      <Topbar
        title="Payment"
        subtitle={`${payment.description} · ${payment.status}`}
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
      <div className="px-6 py-6">
        <PaymentForm
          payment={payment}
          artists={artists}
          vendors={vendors}
          invoices={invoices}
        />
        <AuditHistory entityType="payment" entityId={payment.id} />
      </div>
    </>
  );
}
