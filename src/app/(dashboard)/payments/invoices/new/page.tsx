import Topbar from "@/components/dashboard/Topbar";
import InvoiceForm from "../_components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <>
      <Topbar
        title="New invoice"
        subtitle="Log an inbound invoice for the current edition."
      />
      <div className="px-6 py-6">
        <InvoiceForm />
      </div>
    </>
  );
}
