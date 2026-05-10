export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getHotel } from "@/lib/hotels/repo";
import HotelForm from "../../_components/HotelForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHotelPage({ params }: PageProps) {
  const { id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) notFound();

  return (
    <>
      <Topbar title={hotel.name} subtitle="Edit hotel" />
      <div className="px-6 py-6">
        <HotelForm hotel={hotel} />
      </div>
    </>
  );
}
