import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptainDashboardLink } from "@/components/bracket/CaptainDashboardLink";
import { LiveTournamentRefresh } from "@/components/bracket/LiveTournamentRefresh";
import { PublicTournamentView } from "@/components/bracket/PublicTournamentView";
import { SectionHeading } from "@/components/SectionHeading";
import { TournamentBrandingHeader } from "@/components/TournamentBrandingHeader";
import { TournamentEventSponsors } from "@/components/TournamentEventSponsors";
import {
  getMatchLineupsByMatchIds,
  getTournamentBracketState,
  getTournamentPartners,
  getTournamentSponsors,
} from "@/lib/db/bracket-queries";
import { getEntriesForTournament, getTournamentById, getTournaments } from "@/lib/db/queries";
import { formatTournamentDateTimeShort } from "@/lib/dates";
import { isSquadFormat } from "@/lib/competition-format";
import type { KnockoutRound, Tournament } from "@/lib/types";

export const revalidate = 30;
export const dynamicParams = true;

export async function generateStaticParams() {
  const tournaments = await getTournaments();
  return tournaments.map((tournament) => ({ id: tournament.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  return {
    title: tournament ? `${tournament.name} | Badel Group` : "Tournament",
  };
}

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tournamentRow, bracketState, partners, eventSponsors] = await Promise.all([
    getTournamentById(id),
    getTournamentBracketState(id),
    getTournamentPartners(id),
    getTournamentSponsors(id),
  ]);
  if (!tournamentRow) notFound();

  const teams = bracketState?.teams ?? [];
  const tournamentGroups = bracketState?.groups ?? [];
  const groupMatchesList = bracketState?.groupMatches ?? [];
  const knockoutMatches = bracketState?.knockoutMatches ?? [];
  const isSquad = isSquadFormat(tournamentRow.competitionFormat);
  const [entries, lineups] = await Promise.all([
    isSquad ? getEntriesForTournament(id) : Promise.resolve([]),
    isSquad
      ? getMatchLineupsByMatchIds({
          groupMatchIds: groupMatchesList.map((match) => match.id),
          knockoutMatchIds: knockoutMatches.map((match) => match.id),
        })
      : Promise.resolve([]),
  ]);

  const dateFormatted =
    formatTournamentDateTimeShort(tournamentRow.date, tournamentRow.startTime) ??
    tournamentRow.date;

  const tournament: Tournament = {
    ...tournamentRow,
    registeredCount: 0,
    waitlistCount: 0,
  };

  const isLive =
    tournament.status === "group_stage" || tournament.status === "knockout_stage";

  const entryNames = new Map(entries.map((entry) => [entry.id, entry.name]));

  const content = (
    <PublicTournamentView
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
        round: m.round as KnockoutRound,
        slot: m.slot,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        sets: m.sets,
        status: m.status,
        winnerId: m.winnerId,
        outcome: m.outcome,
      }))}
      pointsWin={bracketState?.tournament.pointsWin ?? 1}
      pointsLoss={bracketState?.tournament.pointsLoss ?? 0}
      championTeamId={bracketState?.tournament.championTeamId}
      canEditScores={false}
      lineups={lineups.map((lineup) => ({
        id: lineup.id,
        groupMatchId: lineup.groupMatchId,
        knockoutMatchId: lineup.knockoutMatchId,
        teamId: lineup.teamId,
        set1EntryIds: lineup.set1EntryIds,
        set2EntryIds: lineup.set2EntryIds,
        set3EntryIds: lineup.set3EntryIds,
        isAdminOverride: lineup.isAdminOverride,
      }))}
      entryNames={entryNames}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <TournamentBrandingHeader
        partners={partners.map((partner) => ({
          id: partner.id,
          tournamentId: partner.tournamentId,
          name: partner.name,
          logoUrl: partner.logoUrl,
          website: partner.website,
          sortOrder: partner.sortOrder,
        }))}
      />
      <SectionHeading
        title={tournament.name}
        subtitle={`${dateFormatted} · ${tournament.location}`}
      />
      {isSquad ? <CaptainDashboardLink tournamentId={id} /> : null}

      {isLive ? <LiveTournamentRefresh>{content}</LiveTournamentRefresh> : content}

      <div className="mt-8">
        <TournamentEventSponsors
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

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/tournaments" prefetch={false} className="text-primary hover:text-primary-dark">
          ← All live tournaments
        </Link>
        <Link href="/" prefetch={false} className="text-gray-600 hover:text-primary">
          Home
        </Link>
      </div>
    </div>
  );
}
