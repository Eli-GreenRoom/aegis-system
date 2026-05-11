export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { listVendors } from "@/lib/ground/repo";
import { getPayment, listInvoices } from "@/lib/payments/repo";
import PaymentForm from "../_components/PaymentForm";

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

  return (
    <>
      <Topbar
        title="Payment"
        subtitle={`${payment.description} · ${payment.status}`}
      />
      <div className="px-6 py-6">
        <PaymentForm
          payment={payment}
          artists={artists}
          vendors={vendors}
          invoices={invoices}
        />
      </div>
    </>
  );
}
