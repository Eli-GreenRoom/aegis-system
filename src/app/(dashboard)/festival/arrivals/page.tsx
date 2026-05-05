import Topbar from "@/components/dashboard/Topbar";
import { getCurrentEdition } from "@/lib/edition";
import { getArrivalsToday } from "@/lib/aggregators";
import ArrivalsBoard from "./_components/ArrivalsBoard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function FestivalArrivalsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const today = sp.date ?? new Date().toISOString().slice(0, 10);

  const edition = await getCurrentEdition();
  const arrivals = await getArrivalsToday(edition.id, today);

  return (
    <>
      <Topbar
        title="Arrivals"
        subtitle={`${arrivals.length} flights · ${today}`}
      />
      <div className="px-6 py-6">
        <ArrivalsBoard arrivals={arrivals} />
      </div>
    </>
  );
}
