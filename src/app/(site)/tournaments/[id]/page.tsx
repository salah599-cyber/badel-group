import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTournamentRefresh } from "@/components/bracket/LiveTournamentRefresh";
import { PublicTournamentView } from "@/components/bracket/PublicTournamentView";
import { SectionHeading } from "@/components/SectionHeading";
import { getTournamentBracketState } from "@/lib/db/bracket-queries";
import { getTournamentById } from "@/lib/db/queries";
import { formatTournamentDateTimeShort } from "@/lib/dates";
import type { KnockoutRound, Tournament } from "@/lib/types";

export const revalidate = 30;

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

  const content = (
    <PublicTournamentView
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
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title={tournament.name}
        subtitle={`${dateFormatted} · ${tournament.location}`}
      />

      {isLive ? <LiveTournamentRefresh>{content}</LiveTournamentRefresh> : content}

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
