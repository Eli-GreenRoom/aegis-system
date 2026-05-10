export const dynamic = "force-dynamic";

import Topbar from "@/components/dashboard/Topbar";
import HotelForm from "../_components/HotelForm";

export default function NewHotelPage() {
  return (
    <>
      <Topbar
        title="New hotel"
        subtitle="Add a venue to the hotel catalogue."
      />
      <div className="px-6 py-6">
        <HotelForm />
      </div>
    </>
  );
}
