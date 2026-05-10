export const dynamic = "force-dynamic";

import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { listVendors } from "@/lib/ground/repo";
import VendorsAdmin from "./_components/VendorsAdmin";

export default async function VendorsPage() {
  const vendors = await listVendors();
  return (
    <>
      <Topbar
        title="Vendors"
        subtitle="Taxi companies, car services, mini-bus operators."
        actions={
          <Link href="/ground">
            <Button variant="ghost">Back to ground</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <VendorsAdmin vendors={vendors} />
      </div>
    </>
  );
}
