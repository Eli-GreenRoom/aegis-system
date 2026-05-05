import Link from "next/link";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listInvoices, listInvoiceIssuerKinds } from "@/lib/payments/repo";
import { formatCents } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    issuerKind?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();

  const [invoices, kinds] = await Promise.all([
    listInvoices({
      editionId: edition.id,
      search: sp.search,
      status: sp.status,
      issuerKind: sp.issuerKind,
    }),
    listInvoiceIssuerKinds(edition.id),
  ]);

  return (
    <>
      <Topbar
        title="Invoices"
        subtitle={`${invoices.length} on ${edition.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={"/payments" as Route}>
              <Button variant="ghost">Back to payments</Button>
            </Link>
            <Link href={"/payments/invoices/new" as Route}>
              <Button>New invoice</Button>
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6 space-y-6">
        <form className="flex flex-wrap items-end gap-3">
          <Filter label="Status" name="status" value={sp.status ?? ""}>
            <option value="">Any</option>
            <option value="received">Received</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </Filter>
          <Filter label="Issuer kind" name="issuerKind" value={sp.issuerKind ?? ""}>
            <option value="">Any</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
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
              placeholder="Number, issuer, comments"
              className="rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
            />
          </label>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        {invoices.length === 0 ? (
          <div className="border border-[--color-border] rounded-md p-10 text-center">
            <p className="text-[--color-fg-muted] text-sm">No invoices.</p>
          </div>
        ) : (
          <div className="border border-[--color-border] rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] bg-[--color-surface]">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">Number</th>
                  <th className="text-left px-4 py-2 font-normal">Issuer kind</th>
                  <th className="text-left px-4 py-2 font-normal">Issued</th>
                  <th className="text-left px-4 py-2 font-normal">Due</th>
                  <th className="text-right px-4 py-2 font-normal">Amount</th>
                  <th className="text-left px-4 py-2 font-normal">Status</th>
                  <th className="text-right px-4 py-2 font-normal w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr
                    key={i.id}
                    className="border-t border-[--color-border] hover:bg-[--color-surface]/40"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/payments/invoices/${i.id}` as Route}
                        className="text-[--color-fg] text-mono text-xs hover:text-brand"
                      >
                        {i.number ?? <span className="text-[--color-fg-subtle]">-</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-[--color-fg-muted] text-xs">
                      {i.issuerKind}
                    </td>
                    <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {i.issueDate ?? ""}
                    </td>
                    <td className="px-4 py-2 text-mono text-xs text-[--color-fg-muted]">
                      {i.dueDate ?? ""}
                    </td>
                    <td className="px-4 py-2 text-right text-mono text-xs text-[--color-fg]">
                      {formatCents(i.amountCents)} {i.currency}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-px rounded-md border border-[--color-border-strong] text-[--color-fg-muted]">
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/payments/invoices/${i.id}` as Route}
                        className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-brand"
                      >
                        edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
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
