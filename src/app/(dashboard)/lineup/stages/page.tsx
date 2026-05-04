import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { listStages } from "@/lib/lineup/repo";
import StagesAdmin from "./_components/StagesAdmin";

export default async function StagesPage() {
  const stages = await listStages();
  return (
    <>
      <Topbar
        title="Stages"
        subtitle="Global across editions. Edit colour, sort order, or rename."
        actions={
          <Link href="/lineup">
            <Button variant="ghost">Back to lineup</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <StagesAdmin stages={stages} />
      </div>
    </>
  );
}
