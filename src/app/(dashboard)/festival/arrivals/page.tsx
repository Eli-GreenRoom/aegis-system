import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
import { getArrivalsToday } from "@/lib/aggregators";
import ArrivalsBoard from "./_components/ArrivalsBoard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function FestivalArrivalsPage({
  searchParams,
}: PageProps) {
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
  const today = sp.date ?? new Date().toISOString().slice(0, 10);

  const arrivals = await getArrivalsToday(festival.id, today);

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
