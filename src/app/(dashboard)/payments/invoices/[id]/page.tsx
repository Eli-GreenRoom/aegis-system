import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getInvoice } from "@/lib/payments/repo";
import InvoiceForm from "../_components/InvoiceForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  return (
    <>
      <Topbar
        title={invoice.number ?? "Invoice"}
        subtitle={`${invoice.issuerKind} · ${invoice.status}`}
      />
      <div className="px-6 py-6">
        <InvoiceForm invoice={invoice} />
      </div>
    </>
  );
}
