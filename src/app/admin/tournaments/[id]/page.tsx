import Link from "next/link";
import { redirect } from "next/navigation";
import { TournamentRunPanel } from "@/components/bracket/TournamentRunPanel";
import { SectionHeading } from "@/components/SectionHeading";
import { getAdminContext } from "@/lib/auth";
import { getTournamentBracketState } from "@/lib/db/bracket-queries";
import { countConfirmedEntries, getTournamentById } from "@/lib/db/queries";
import { canManageTournament } from "@/lib/permissions";
import { groupMatches } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { groups } from "@/lib/db/schema";

export const metadata = {
  title: "Run tournament | Badel Group Admin",
};

export default async function AdminTournamentRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAdminContext();
  if (!ctx) redirect("/?error=unauthorized");
  if (!canManageTournament(ctx, id)) redirect("/admin");

  const tournamentRow = await getTournamentById(id);
  if (!tournamentRow) redirect("/admin");

  const [withCounts] = await import("@/lib/db/queries").then((m) =>
    m.getTournamentWithCounts().then((list) => list.filter((t) => t.id === id)),
  );
  const tournament = withCounts ?? {
    ...tournamentRow,
    registeredCount: await countConfirmedEntries(id),
    waitlistCount: 0,
  };

  const bracketState = await getTournamentBracketState(id);
  const teams = bracketState?.teams ?? [];
  const tournamentGroups = bracketState?.groups ?? [];
  const groupMatchesList = bracketState?.groupMatches ?? [];
  const knockoutMatches = bracketState?.knockoutMatches ?? [];

  let fixturesLocked = false;
  if (db && tournamentGroups.length > 0) {
    const rows = await db
      .select({ id: groupMatches.id })
      .from(groupMatches)
      .innerJoin(groups, eq(groupMatches.groupId, groups.id))
      .where(eq(groups.tournamentId, id))
      .limit(1);
    fixturesLocked = rows.length > 0;
  }

  const confirmedTeamCount = tournament.registeredCount;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <Link href="/admin" className="text-sm font-semibold text-primary hover:text-primary-dark">
          ← Back to admin
        </Link>
        <SectionHeading title={tournament.name} subtitle="Tournament bracket & scoring" className="mt-4" />
      </div>

      <TournamentRunPanel
        tournament={tournament}
        teams={teams.map((t) => ({
          id: t.id,
          tournamentId: t.tournamentId,
          label: t.label,
          entryIds: t.entryIds,
        }))}
        groups={tournamentGroups.map((g) => ({
          id: g.id,
          tournamentId: g.tournamentId,
          label: g.label,
          teamIds: g.teamIds,
          manualTiebreakOrder: g.manualTiebreakOrder,
        }))}
        groupMatches={groupMatchesList.map((m) => ({
          id: m.id,
          groupId: m.groupId,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          sets: m.sets,
          status: m.status,
          winnerId: m.winnerId,
          outcome: m.outcome,
        }))}
        knockoutMatches={knockoutMatches.map((m) => ({
          id: m.id,
          tournamentId: m.tournamentId,
          round: m.round as import("@/lib/types").KnockoutRound,
          slot: m.slot,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          sourceA: m.sourceA,
          sourceB: m.sourceB,
          sets: m.sets,
          status: m.status,
          winnerId: m.winnerId,
          outcome: m.outcome,
        }))}
        confirmedTeamCount={confirmedTeamCount}
        fixturesLocked={fixturesLocked}
      />
    </div>
  );
}
