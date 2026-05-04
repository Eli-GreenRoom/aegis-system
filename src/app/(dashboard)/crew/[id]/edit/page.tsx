import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getCrewMember } from "@/lib/crew/repo";
import CrewForm from "../../_components/CrewForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCrewPage({ params }: PageProps) {
  const { id } = await params;
  const member = await getCrewMember(id);
  if (!member) notFound();

  return (
    <>
      <Topbar title={`Edit ${member.name}`} subtitle={member.role} />
      <div className="px-6 py-6">
        <CrewForm member={member} />
      </div>
    </>
  );
}
