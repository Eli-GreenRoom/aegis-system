export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/button";
import { getAppSession } from "@/lib/session";
import { getActiveFestival } from "@/lib/festivals";
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
  const archivedRaw = sp.archived ?? "active";
  const archived: ListCrewParams["archived"] =
    archivedRaw === "archived" || archivedRaw === "all"
      ? archivedRaw
      : "active";

  const [crew, roles] = await Promise.all([
    listCrew({
      festivalId: festival.id,
      search: sp.search,
      role: sp.role,
      archived,
    }),
    listCrewRoles(festival.id),
  ]);

  return (
    <>
      <Topbar
        title="Crew"
        subtitle={`${crew.length} on ${festival.name}`}
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
