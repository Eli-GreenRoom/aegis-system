export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listArtists } from "@/lib/artists/repo";
import { listVendors } from "@/lib/ground/repo";
import { listInvoices } from "@/lib/payments/repo";
import PaymentForm from "../_components/PaymentForm";

interface PageProps {
  searchParams: Promise<{
    invoiceId?: string;
    description?: string;
    amountCents?: string;
    currency?: string;
    dueDate?: string;
    artistId?: string;
  }>;
}

export default async function NewPaymentPage({ searchParams }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  if (!festival)
    return (
      <div className="px-6 py-6 text-[--color-fg-muted] text-sm">
        No festival configured.
      </div>
    );

  const sp = await searchParams;

  const [artists, vendors, invoices] = await Promise.all([
    listArtists({ festivalId: festival.id, archived: "active" }),
    listVendors(),
    listInvoices({ festivalId: festival.id }),
  ]);

  const prefill = {
    invoiceId: sp.invoiceId,
    description: sp.description,
    amountCents: sp.amountCents ? Number(sp.amountCents) : undefined,
    currency: sp.currency as "USD" | "EUR" | undefined,
    dueDate: sp.dueDate,
    artistId:
      sp.artistId && artists.some((a) => a.id === sp.artistId)
        ? sp.artistId
        : undefined,
  };

  return (
    <>
      <Topbar
        title="New payment"
        subtitle="Track money in or out for the current edition."
      />
      <div className="px-6 py-6">
        <PaymentForm
          artists={artists}
          vendors={vendors}
          invoices={invoices}
          prefill={prefill}
        />
      </div>
    </>
  );
}
