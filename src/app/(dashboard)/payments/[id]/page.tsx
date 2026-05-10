export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import { listVendors } from "@/lib/ground/repo";
import { getPayment, listInvoices } from "@/lib/payments/repo";
import PaymentForm from "../_components/PaymentForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();

  const edition = await getCurrentEdition();
  const [artists, vendors, invoices] = await Promise.all([
    listArtists({ editionId: edition.id, archived: "active" }),
    listVendors(),
    listInvoices({ editionId: edition.id }),
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
