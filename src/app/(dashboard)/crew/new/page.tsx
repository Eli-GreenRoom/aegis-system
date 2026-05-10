export const dynamic = "force-dynamic";

import Topbar from "@/components/dashboard/Topbar";
import CrewForm from "../_components/CrewForm";

export default function NewCrewPage() {
  return (
    <>
      <Topbar
        title="New crew"
        subtitle="Add a crew member to the current edition."
      />
      <div className="px-6 py-6">
        <CrewForm />
      </div>
    </>
  );
}
