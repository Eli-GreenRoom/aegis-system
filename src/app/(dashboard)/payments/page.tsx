import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import {
  getPaymentsSummary,
  listInvoices,
  listPayments,
} from "@/lib/payments/repo";
import { paymentStatusEnum } from "@/lib/payments/schema";
import { listArtists } from "@/lib/artists/repo";
import { listVendors } from "@/lib/ground/repo";
import { formatCents } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/payments/schema";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    artistId?: string;
    vendorId?: string;
    invoiceId?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const statusParsed = sp.status ? paymentStatusEnum.safeParse(sp.status) : null;

  const [payments, summary, artists, vendors, invoices] = await Promise.all([
    listPayments({
      editionId: edition.id,
      search: sp.search,
      status: statusParsed?.success ? statusParsed.data : undefined,
      artistId: sp.artistId,
      vendorId: sp.vendorId,
      invoiceId: sp.invoiceId,
    }),
    getPaymentsSummary(edition.id),
    listArtists({ editionId: edition.id, archived: "active" }),
    listVendors(),
    listInvoices({ editionId: edition.id }),
  ]);
  const artistsById = new Map(artists.map((a) => [a.id, a.name]));
  const vendorsById = new Map(vendors.map((v) => [v.id, v.name]));
  const invoicesById = new Map(
    invoices.map((i) => [i.id, i.number ?? i.issuerKind])
  );

  return (
    <>
      <Topbar
        title="Payments"
        subtitle={`${payments.length} on ${edition.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={"/payments/invoices" as Route}>
              <Button variant="secondary">Invoices</Button>
            </Link>
            <Link href={"/payments/new" as Route}>
              <Button>New payment</Button>
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6 space-y-6">
        {/* Summary cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Pending"
            tone="muted"
            count={summary.countsByStatus.pending}
            usd={summary.totalsByStatus.pending.USD}
            eur={summary.totalsByStatus.pending.EUR}
          />
          <SummaryCard
            label="Due"
            tone="brand"
            count={summary.countsByStatus.due}
            usd={summary.totalsByStatus.due.USD}
            eur={summary.totalsByStatus.due.EUR}
          />
          <SummaryCard
            label="Paid"
            tone="mint"
            count={summary.countsByStatus.paid}
            usd={summary.totalsByStatus.paid.USD}
            eur={summary.totalsByStatus.paid.EUR}
          />
          <SummaryCard
            label="Overdue"
            tone="coral"
            count={summary.countsByStatus.overdue}
            usd={summary.totalsByStatus.overdue.USD}
            eur={summary.totalsByStatus.overdue.EUR}
          />
        </section>

        {/* Filters */}
        <form className="flex flex-wrap items-end gap-3">
          <Filter label="Status" name="status" value={sp.status ?? ""}>
            <option value="">Any</option>
            <option value="pending">Pending</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </Filter>
          <Filter label="Artist" name="artistId" value={sp.artistId ?? ""}>
            <option value="">Any</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Filter>
          <Filter label="Vendor" name="vendorId" value={sp.vendorId ?? ""}>
            <option value="">Any</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Filter>
          <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
              Search
            </span>
            <input
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Description, paid via, comments"
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            />
          </label>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        {/* Payments table */}
        {payments.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">No payments.</p>
          </div>
        ) : (
          <div className="border border-[--color-border] rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">Description</th>
                  <th className="text-left px-4 py-2 font-normal">Counterparty</th>
                  <th className="text-left px-4 py-2 font-normal">Invoice</th>
                  <th className="text-left px-4 py-2 font-normal">Due</th>
                  <th className="text-right px-4 py-2 font-normal">Amount</th>
                  <th className="text-left px-4 py-2 font-normal">Status</th>
                  <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const counterparty =
                    p.artistId
                      ? artistsById.get(p.artistId) ?? "(deleted artist)"
                      : p.vendorId
                        ? vendorsById.get(p.vendorId) ?? "(deleted vendor)"
                        : "";
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
                    >
                      <td className="px-4 py-2 text-[--color-fg]">
                        <Link
                          href={`/payments/${p.id}` as Route}
                          className="hover:text-brand"
                        >
                          {p.description}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                        {counterparty}
                        <div className="text-mono text-[10px] text-[--color-fg-subtle] mt-0.5">
                          {p.artistId ? "artist" : p.vendorId ? "vendor" : ""}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                        {p.invoiceId
                          ? (invoicesById.get(p.invoiceId) ?? "(deleted)")
                          : ""}
                      </td>
                      <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                        {p.dueDate ?? ""}
                      </td>
                      <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg]">
                        {formatCents(p.amountCents)} {p.currency}
                      </td>
                      <td className="px-4 py-2">
                        <PaymentStatusPill status={p.status} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/payments/${p.id}` as Route}
                          className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                        >
                          edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  tone,
  count,
  usd,
  eur,
}: {
  label: string;
  tone: "brand" | "mint" | "coral" | "muted";
  count: number;
  usd: number;
  eur: number;
}) {
  const labelClass =
    tone === "brand"
      ? "text-brand"
      : tone === "mint"
        ? "text-mint"
        : tone === "coral"
          ? "text-coral"
          : "text-[--color-fg-muted]";
  return (
    <div className="border border-[--color-border] rounded-md p-4 bg-[--color-surface]/40">
      <div
        className={`text-mono text-[10px] uppercase tracking-[0.18em] ${labelClass}`}
      >
        {label}
      </div>
      <div className="mt-2 text-mono text-2xl text-[--color-fg]">{count}</div>
      <div className="mt-1 text-mono text-[11px] text-[--color-fg-muted] space-x-2">
        {usd > 0 && <span>${formatCents(usd)} USD</span>}
        {eur > 0 && <span>€{formatCents(eur)} EUR</span>}
        {usd === 0 && eur === 0 && (
          <span className="text-[--color-fg-subtle]">-</span>
        )}
      </div>
    </div>
  );
}

function Filter({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] min-w-[140px]"
      >
        {children}
      </select>
    </label>
  );
}

const STATUS_CLASSES: Record<PaymentStatus, string> = {
  pending: "border-[--color-border-strong] text-[--color-fg-muted]",
  due: "border-brand/40 text-brand",
  paid: "border-[--color-brand-mint]/60 text-mint",
  overdue: "border-[--color-brand-coral]/40 text-coral",
  void: "border-[--color-fg-subtle]/40 text-[--color-fg-subtle]",
};

function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border ${STATUS_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}
