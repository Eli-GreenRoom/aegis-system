import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getCurrentEdition } from "@/lib/edition";
import { listCrew, listCrewRoles, type ListCrewParams } from "@/lib/crew/repo";
import CrewTable from "./_components/CrewTable";
import CrewFilters from "./_components/CrewFilters";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    archived?: string;
  }>;
}

export default async function CrewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const archivedRaw = sp.archived ?? "active";
  const archived: ListCrewParams["archived"] =
    archivedRaw === "archived" || archivedRaw === "all" ? archivedRaw : "active";

  const edition = await getCurrentEdition();
  const [crew, roles] = await Promise.all([
    listCrew({
      editionId: edition.id,
      search: sp.search,
      role: sp.role,
      archived,
    }),
    listCrewRoles(edition.id),
  ]);

  return (
    <>
      <Topbar
        title="Crew"
        subtitle={`${crew.length} on ${edition.name}`}
        actions={
          <Link href="/crew/new">
            <Button>New crew</Button>
          </Link>
        }
      />
      <div className="px-6 py-6">
        <CrewFilters roles={roles} />
        <CrewTable crew={crew} />
      </div>
    </>
  );
}
