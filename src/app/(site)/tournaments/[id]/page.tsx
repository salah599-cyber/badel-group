import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { LiveTournamentRefresh } from "@/components/bracket/LiveTournamentRefresh";
import { PublicTournamentView } from "@/components/bracket/PublicTournamentView";
import { SectionHeading } from "@/components/SectionHeading";
import { TournamentBrandingHeader } from "@/components/TournamentBrandingHeader";
import { TournamentEventSponsors } from "@/components/TournamentEventSponsors";
import { getAdminContext } from "@/lib/auth";
import {
  getCaptainTeamForUser,
  getMatchLineupsByMatchIds,
  getTournamentBracketState,
  getTournamentPartners,
  getTournamentSponsors,
} from "@/lib/db/bracket-queries";
import { getEntriesForTournament, getTournamentById } from "@/lib/db/queries";
import { formatTournamentDateTimeShort } from "@/lib/dates";
import { canManageTournament, hasPermission } from "@/lib/permissions";
import { isSquadFormat } from "@/lib/competition-format";
import type { KnockoutRound, Tournament } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const tournamentRow = await getTournamentById(id);
  if (!tournamentRow) notFound();

  const bracketState = await getTournamentBracketState(id);
  const teams = bracketState?.teams ?? [];
  const tournamentGroups = bracketState?.groups ?? [];
  const groupMatchesList = bracketState?.groupMatches ?? [];
  const knockoutMatches = bracketState?.knockoutMatches ?? [];

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

  const adminCtx = await getAdminContext();
  const canEditScores = Boolean(
    adminCtx &&
      hasPermission(adminCtx, "results:manage") &&
      canManageTournament(adminCtx, id),
  );

  const user = await currentUser();
  const isSquad = isSquadFormat(tournamentRow.competitionFormat);
  const partners = await getTournamentPartners(id);
  const eventSponsors = await getTournamentSponsors(id);
  const entries = isSquad ? await getEntriesForTournament(id) : [];
  const entryNames = new Map(entries.map((entry) => [entry.id, entry.name]));
  const lineups = isSquad
    ? await getMatchLineupsByMatchIds({
        groupMatchIds: groupMatchesList.map((match) => match.id),
        knockoutMatchIds: knockoutMatches.map((match) => match.id),
      })
    : [];
  const captainTeam =
    user && isSquad ? await getCaptainTeamForUser(id, user.id) : null;

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
      canEditScores={canEditScores}
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
      {captainTeam && (
        <div className="mb-6">
          <Link
            href={`/tournaments/${id}/team`}
            className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Captain dashboard — {captainTeam.label}
          </Link>
        </div>
      )}

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
