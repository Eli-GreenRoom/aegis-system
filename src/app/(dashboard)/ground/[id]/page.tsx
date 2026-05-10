export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { Route } from "next";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getPickup, getVendor } from "@/lib/ground/repo";
import { getPerson } from "@/lib/people";
import { formatCents } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PickupDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pickup = await getPickup(id);
  if (!pickup) notFound();

  const [person, vendor] = await Promise.all([
    getPerson(pickup.personKind, pickup.personId),
    pickup.vendorId ? getVendor(pickup.vendorId) : Promise.resolve(null),
  ]);

  return (
    <>
      <Topbar
        title={`${pickup.routeFrom} -> ${pickup.routeTo}`}
        subtitle={`${person?.name ?? "Unknown"} · ${pickup.status}`}
        actions={
          <Link href={`/ground/${pickup.id}/edit` as Route}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <dl className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Row
            label="Person"
            value={person ? `${person.name} (${person.kind})` : "Unknown"}
          />
          <Row
            label="When"
            value={format(new Date(pickup.pickupDt), "EEE d MMM HH:mm")}
            mono
          />
          <Row
            label="From"
            value={`${pickup.routeFrom}${pickup.routeFromDetail ? ` - ${pickup.routeFromDetail}` : ""}`}
          />
          <Row
            label="To"
            value={`${pickup.routeTo}${pickup.routeToDetail ? ` - ${pickup.routeToDetail}` : ""}`}
          />
          <Row label="Vehicle" value={pickup.vehicleType} />
          <Row label="Vendor" value={vendor?.name ?? null} />
          <Row label="Driver" value={pickup.driverName} />
          <Row label="Driver phone" value={pickup.driverPhone} mono />
          <Row
            label="Cost"
            value={
              pickup.costAmountCents != null
                ? `${formatCents(pickup.costAmountCents)} ${pickup.costCurrency ?? ""}`.trim()
                : null
            }
            mono
          />
          <Row label="Status" value={pickup.status} />
          <Row
            label="Dispatched"
            value={
              pickup.dispatchedAt
                ? format(new Date(pickup.dispatchedAt), "EEE d MMM HH:mm")
                : null
            }
            mono
          />
          <Row
            label="In transit"
            value={
              pickup.inTransitAt
                ? format(new Date(pickup.inTransitAt), "EEE d MMM HH:mm")
                : null
            }
            mono
          />
          <Row
            label="Completed"
            value={
              pickup.completedAt
                ? format(new Date(pickup.completedAt), "EEE d MMM HH:mm")
                : null
            }
            mono
          />
          {pickup.linkedFlightId && (
            <Row
              label="Linked flight"
              value={
                <Link
                  href={`/flights/${pickup.linkedFlightId}` as Route}
                  className="text-brand underline-offset-4 hover:underline"
                >
                  open
                </Link>
              }
            />
          )}
          {pickup.comments && (
            <div className="col-span-2">
              <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
                Comments
              </dt>
              <dd className="text-[--color-fg] whitespace-pre-wrap">
                {pickup.comments}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] mb-1">
        {label}
      </dt>
      <dd
        className={mono ? "text-mono text-[--color-fg]" : "text-[--color-fg]"}
      >
        {value ? value : <span className="text-[--color-fg-subtle]">-</span>}
      </dd>
    </div>
  );
}
