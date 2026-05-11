export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { listPickups, listVendors } from "@/lib/ground/repo";
import {
  personKindEnum,
  pickupStatusEnum,
  routeEnum,
} from "@/lib/ground/schema";
import { resolvePeople } from "@/lib/people";
import PickupsFilters from "./_components/PickupsFilters";
import PickupsTable from "./_components/PickupsTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    routeFrom?: string;
    routeTo?: string;
    personKind?: string;
    personId?: string;
    vendorId?: string;
  }>;
}

export default async function GroundPage({ searchParams }: PageProps) {
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

  const statusParsed = sp.status ? pickupStatusEnum.safeParse(sp.status) : null;
  const fromParsed = sp.routeFrom ? routeEnum.safeParse(sp.routeFrom) : null;
  const toParsed = sp.routeTo ? routeEnum.safeParse(sp.routeTo) : null;
  const personKindParsed = sp.personKind
    ? personKindEnum.safeParse(sp.personKind)
    : null;

  const [pickups, vendors] = await Promise.all([
    listPickups({
      festivalId: festival.id,
      search: sp.search,
      status: statusParsed?.success ? statusParsed.data : undefined,
      routeFrom: fromParsed?.success ? fromParsed.data : undefined,
      routeTo: toParsed?.success ? toParsed.data : undefined,
      personKind: personKindParsed?.success ? personKindParsed.data : undefined,
      personId: sp.personId,
      vendorId: sp.vendorId,
    }),
    listVendors(),
  ]);

  const people = await resolvePeople(
    pickups.map((p) => ({ kind: p.personKind, id: p.personId })),
  );

  const vendorsById = new Map(
    vendors.map((v) => [v.id, { id: v.id, name: v.name }]),
  );

  return (
    <>
      <Topbar
        title="Ground"
        subtitle={`${pickups.length} pickups on ${festival.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={"/ground/vendors" as Route}>
              <Button variant="secondary">Vendors</Button>
            </Link>
            <Link href={"/ground/new" as Route}>
              <Button>New pickup</Button>
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6">
        <PickupsFilters
          vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
        />
        <PickupsTable
          pickups={pickups}
          people={people}
          vendorsById={vendorsById}
        />
      </div>
    </>
  );
}
