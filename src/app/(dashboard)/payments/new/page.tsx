import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { listArtists } from "@/lib/artists/repo";
import { listVendors } from "@/lib/ground/repo";
import { listInvoices } from "@/lib/payments/repo";
import PaymentForm from "../_components/PaymentForm";

export default async function NewPaymentPage() {
  const edition = await getCurrentEdition();
  const [artists, vendors, invoices] = await Promise.all([
    listArtists({ editionId: edition.id, archived: "active" }),
    listVendors(),
    listInvoices({ editionId: edition.id }),
  ]);

  return (
    <>
      <Topbar
        title="New payment"
        subtitle="Track money in or out for the current edition."
      />
      <div className="px-6 py-6">
        <PaymentForm artists={artists} vendors={vendors} invoices={invoices} />
      </div>
    </>
  );
}
