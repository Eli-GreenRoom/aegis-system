import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { getPickupsInWindow } from "@/lib/aggregators";
import PickupsBoard from "./_components/PickupsBoard";

export const dynamic = "force-dynamic";

export default async function FestivalPickupsPage() {
  const edition = await getCurrentEdition();
  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const endOfWindow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const [next2h, later] = await Promise.all([
    getPickupsInWindow(edition.id, now, in2h),
    getPickupsInWindow(edition.id, in2h, endOfWindow),
  ]);

  return (
    <>
      <Topbar
        title="Pickups"
        subtitle={`${next2h.length} in next 2h · ${later.length} later`}
      />
      <div className="px-6 py-6">
        <PickupsBoard next2h={next2h} later={later} />
      </div>
    </>
  );
}
