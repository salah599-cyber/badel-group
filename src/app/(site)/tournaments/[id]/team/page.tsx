import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { CaptainMatchCard } from "@/components/squad/CaptainMatchCard";
import { SectionHeading } from "@/components/SectionHeading";
import {
  getCaptainTeamForUser,
  getMatchLineupsByMatchIds,
  getTournamentBracketState,
} from "@/lib/db/bracket-queries";
import { getEntriesForTournament, getTournamentById } from "@/lib/db/queries";
import { isSquadFormat } from "@/lib/competition-format";

export const dynamic = "force-dynamic";

export default async function CaptainTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const tournament = await getTournamentById(id);
  if (!tournament || !isSquadFormat(tournament.competitionFormat)) notFound();

  const team = await getCaptainTeamForUser(id, user.id);
  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SectionHeading title="Team captain" subtitle={tournament.name} />
        <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
          You are not assigned as a team captain for this tournament.
        </p>
        <Link href={`/tournaments/${id}`} className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Back to tournament
        </Link>
      </div>
    );
  }

  const bracketState = await getTournamentBracketState(id);
  const groupMatches = bracketState?.groupMatches ?? [];
  const knockoutMatches = bracketState?.knockoutMatches ?? [];
  const entries = await getEntriesForTournament(id);
  const entryNames = new Map(entries.map((entry) => [entry.id, entry.name]));

  const upcomingGroupMatches = groupMatches.filter(
    (match) =>
      match.status === "scheduled" &&
      (match.teamAId === team.id || match.teamBId === team.id),
  );
  const upcomingKnockoutMatches = knockoutMatches.filter(
    (match) =>
      match.status === "scheduled" &&
      (match.teamAId === team.id || match.teamBId === team.id),
  );

  const lineups = await getMatchLineupsByMatchIds({
    groupMatchIds: upcomingGroupMatches.map((match) => match.id),
    knockoutMatchIds: upcomingKnockoutMatches.map((match) => match.id),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionHeading title={team.label} subtitle={`Captain dashboard · ${tournament.name}`} />

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-bold">Your roster</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {team.entryIds.map((entryId) => (
            <li key={entryId}>{entryNames.get(entryId) ?? entryId}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">Submit lineups</h2>
        {upcomingGroupMatches.map((match) => {
          const opponentId = match.teamAId === team.id ? match.teamBId : match.teamAId;
          const opponent = bracketState?.teams.find((t) => t.id === opponentId);
          return (
            <CaptainMatchCard
              key={match.id}
              tournamentId={id}
              teamId={team.id}
              opponentLabel={opponent?.label ?? "Opponent"}
              groupMatchId={match.id}
              rosterEntryIds={team.entryIds}
              entryNames={entryNames}
              lineup={lineups.find(
                (row) => row.teamId === team.id && row.groupMatchId === match.id,
              )}
              opponentLineup={lineups.find(
                (row) => row.teamId === opponentId && row.groupMatchId === match.id,
              )}
            />
          );
        })}
        {upcomingKnockoutMatches.map((match) => {
          const opponentId = match.teamAId === team.id ? match.teamBId : match.teamAId;
          const opponent = bracketState?.teams.find((t) => t.id === opponentId);
          return (
            <CaptainMatchCard
              key={match.id}
              tournamentId={id}
              teamId={team.id}
              opponentLabel={opponent?.label ?? "Opponent"}
              knockoutMatchId={match.id}
              rosterEntryIds={team.entryIds}
              entryNames={entryNames}
              lineup={lineups.find(
                (row) => row.teamId === team.id && row.knockoutMatchId === match.id,
              )}
              opponentLineup={lineups.find(
                (row) => row.teamId === opponentId && row.knockoutMatchId === match.id,
              )}
            />
          );
        })}
        {upcomingGroupMatches.length + upcomingKnockoutMatches.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No upcoming matches for your team right now.
          </p>
        )}
      </section>

      <Link href={`/tournaments/${id}`} className="mt-8 inline-block text-sm font-semibold text-primary">
        ← Back to tournament
      </Link>
    </div>
  );
}
