export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getInvoice, listPayments } from "@/lib/payments/repo";
import { getActiveFestival } from "@/lib/festivals";
import { getAppSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCents } from "@/lib/utils";
import InvoiceForm from "../_components/InvoiceForm";
import { format } from "date-fns";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-[--color-fg-muted] border-[--color-border-strong]",
  due: "text-brand border-brand/40",
  paid: "text-mint border-mint/40",
  overdue: "text-coral border-coral/40",
  void: "text-[--color-fg-subtle] border-[--color-border]",
};

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await getAppSession();
  if (!session) redirect("/sign-in");

  const festival = await getActiveFestival(session);
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  // Payments already linked to this invoice
  const linkedPayments = festival
    ? await listPayments({ festivalId: festival.id, invoiceId: id })
    : [];

  // Pre-fill query string for new payment from invoice
  const paymentPrefill = new URLSearchParams({
    invoiceId: invoice.id,
    description: invoice.number
      ? `Invoice ${invoice.number} – ${invoice.issuerKind}`
      : invoice.issuerKind,
    amountCents: String(invoice.amountCents),
    currency: invoice.currency,
    ...(invoice.dueDate ? { dueDate: invoice.dueDate } : {}),
  }).toString();

  return (
    <>
      <Topbar
        title={invoice.number ?? "Invoice"}
        subtitle={`${invoice.issuerKind} · ${invoice.status}`}
        actions={
          invoice.status !== "paid" && invoice.status !== "rejected" ? (
            <Link href={`/payments/new?${paymentPrefill}` as Route}>
              <Button variant="secondary" size="sm">
                Create Payment
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="px-6 py-6 space-y-6">
        {linkedPayments.length > 0 && (
          <div className="border border-[--color-border] rounded-md overflow-hidden">
            <div className="px-4 py-2 bg-[--color-surface] border-b border-[--color-border]">
              <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
                Linked payments ({linkedPayments.length})
              </p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {linkedPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t first:border-t-0 border-[--color-border] hover:bg-[--color-surface]/40"
                  >
                    <td className="px-4 py-2 text-[--color-fg]">
                      {p.description}
                    </td>
                    <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {p.dueDate ?? ""}
                    </td>
                    <td className="px-4 py-2 text-right text-mono text-xs">
                      {formatCents(p.amountCents)} {p.currency}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${STATUS_COLORS[p.status] ?? ""}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {p.paidAt ? format(new Date(p.paidAt), "d MMM yyyy") : ""}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/payments/${p.id}` as Route}
                        className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                      >
                        view
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <InvoiceForm invoice={invoice} />
      </div>
    </>
  );
}
