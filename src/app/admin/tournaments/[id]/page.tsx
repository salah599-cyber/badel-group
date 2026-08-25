import Link from "next/link";
import { redirect } from "next/navigation";
import { TournamentRunPanel } from "@/components/bracket/TournamentRunPanel";
import { SquadRunPanel } from "@/components/squad/SquadRunPanel";
import { TournamentBrandingSection } from "@/components/admin/TournamentBrandingSection";
import { SectionHeading } from "@/components/SectionHeading";
import { getAdminContext } from "@/lib/auth";
import {
  getMatchLineupsByMatchIds,
  getTournamentBracketState,
  getTournamentPartners,
  getTournamentSponsors,
} from "@/lib/db/bracket-queries";
import { countConfirmedEntries, getEntriesForTournament, getTournamentById } from "@/lib/db/queries";
import { canManageTournament } from "@/lib/permissions";
import { isSquadFormat } from "@/lib/competition-format";
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
  const entries = await getEntriesForTournament(id);
  const isSquad = isSquadFormat(tournament.competitionFormat);

  const lineups = isSquad
    ? await getMatchLineupsByMatchIds({
        groupMatchIds: groupMatchesList.map((match) => match.id),
        knockoutMatchIds: knockoutMatches.map((match) => match.id),
      })
    : [];
  const partners = await getTournamentPartners(id);
  const eventSponsors = await getTournamentSponsors(id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <Link href="/admin" className="text-sm font-semibold text-primary hover:text-primary-dark">
          ← Back to admin
        </Link>
        <SectionHeading
          title={tournament.name}
          subtitle={isSquad ? "Teams tournament — squads, lineups & scoring" : "Tournament bracket & scoring"}
          className="mt-4"
        />
      </div>

      <div className="mb-8">
        <TournamentBrandingSection
          tournamentId={id}
          partners={partners.map((partner) => ({
            id: partner.id,
            tournamentId: partner.tournamentId,
            name: partner.name,
            logoUrl: partner.logoUrl,
            website: partner.website,
            sortOrder: partner.sortOrder,
          }))}
          sponsors={eventSponsors.map((sponsor) => ({
            id: sponsor.id,
            tournamentId: sponsor.tournamentId,
            name: sponsor.name,
            tier: sponsor.tier,
            logoUrl: sponsor.logoUrl,
            website: sponsor.website,
            linkType: sponsor.linkType,
            sortOrder: sponsor.sortOrder,
          }))}
        />
      </div>

      {isSquad ? (
        <SquadRunPanel
          tournament={tournament}
          teams={teams.map((t) => ({
            id: t.id,
            tournamentId: t.tournamentId,
            label: t.label,
            entryIds: t.entryIds,
            captainEntryId: t.captainEntryId,
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
          lineups={lineups.map((lineup) => ({
            id: lineup.id,
            groupMatchId: lineup.groupMatchId,
            knockoutMatchId: lineup.knockoutMatchId,
            teamId: lineup.teamId,
            set1EntryIds: lineup.set1EntryIds,
            set2EntryIds: lineup.set2EntryIds,
            set3EntryIds: lineup.set3EntryIds,
            submittedByUserId: lineup.submittedByUserId,
            submittedAt: lineup.submittedAt,
            isAdminOverride: lineup.isAdminOverride,
          }))}
          entries={entries}
          fixturesLocked={fixturesLocked}
        />
      ) : (
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
      )}
    </div>
  );
}
