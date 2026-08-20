import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SectionHeading } from "@/components/SectionHeading";
import { AdminPanel } from "@/components/AdminPanel";
import { fetchAdminUserLists } from "@/lib/admin-members";
import {
  fetchAllTournaments,
  fetchArchivedRankingSeasons,
  fetchCurrentRankingSeason,
  fetchGalleryPhotos,
  fetchManageableEntries,
  fetchPendingEntries,
  fetchPlayerProfiles,
  fetchSponsors,
  fetchTopRankings,
  fetchTournamentIdsWithResults,
  fetchTournamentTypes,
} from "@/lib/data";
import { getAdminContext } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin | Badel Group",
};

export default async function AdminPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/?error=unauthorized");

  const [
    allTournaments,
    tournamentTypes,
    manageableEntries,
    sponsors,
    galleryPhotos,
    playerProfiles,
    rankedPlayers,
    currentSeasonRankings,
    currentSeason,
    archivedSeasons,
    tournamentIdsWithResults,
    pendingEntries,
    userLists,
    tournamentIdsWithBracket,
  ] = await Promise.all([
    fetchAllTournaments(),
    fetchTournamentTypes(),
    fetchManageableEntries(),
    fetchSponsors(),
    fetchGalleryPhotos(),
    fetchPlayerProfiles(),
    fetchTopRankings(50),
    fetchTopRankings(null),
    fetchCurrentRankingSeason(),
    fetchArchivedRankingSeasons(),
    fetchTournamentIdsWithResults(),
    fetchPendingEntries(),
    fetchAdminUserLists(ctx),
    import("@/lib/db/bracket-queries").then((m) => m.getTournamentIdsWithBracket()),
  ]);

  const { pendingUsers, adminMembers, siteMembers } = userLists;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Logo size="md" className="shrink-0" />
        <SectionHeading
          title="Admin Panel"
          subtitle={
            ctx.isSuperAdmin
              ? "Super admin — full access to team, members, and content"
              : ctx.role === "tournament_admin"
                ? "Tournament admin — scoped to your assigned tournaments"
                : "Manage tournaments, players, sponsors, and media"
          }
          className="mb-0"
        />
      </div>

      {!hasDatabase() && (
        <div className="mb-8 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-primary-dark">
          Database not connected. Add <code className="font-mono">DATABASE_URL</code> in Vercel
          environment variables (Neon Postgres) and run migrations.
        </div>
      )}

      <AdminPanel
        tournaments={allTournaments}
        tournamentTypes={tournamentTypes}
        manageableEntries={manageableEntries}
        sponsors={sponsors}
        galleryPhotos={galleryPhotos}
        playerProfiles={playerProfiles}
        rankedPlayers={rankedPlayers}
        currentSeason={currentSeason}
        archivedSeasons={archivedSeasons}
        currentSeasonPlayerCount={currentSeasonRankings.length}
        pendingEntries={pendingEntries}
        pendingUsers={pendingUsers}
        adminMembers={adminMembers}
        siteMembers={siteMembers}
        permissions={ctx.permissions}
        isSuperAdmin={ctx.isSuperAdmin}
        scopedTournamentIds={ctx.tournamentIds}
        tournamentIdsWithResults={tournamentIdsWithResults}
        tournamentIdsWithBracket={tournamentIdsWithBracket}
        role={ctx.role}
      />

      <Link href="/" prefetch={false} className="mt-8 inline-block text-sm font-semibold text-primary hover:text-primary-dark">
        ← Back to site
      </Link>
    </div>
  );
}
