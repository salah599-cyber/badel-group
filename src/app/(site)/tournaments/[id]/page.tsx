import Link from "next/link";
import { notFound } from "next/navigation";
import { KnockoutBracketView } from "@/components/bracket/KnockoutBracketView";
import { StandingsTable } from "@/components/bracket/StandingsTable";
import { SectionHeading } from "@/components/SectionHeading";
import { computeStandings } from "@/lib/bracket/standings";
import { formatMatchScore } from "@/lib/bracket/score-format";
import { getTournamentBracketState } from "@/lib/db/bracket-queries";
import { getTournamentById } from "@/lib/db/queries";
import { formatTournamentDateTimeShort } from "@/lib/dates";

export const revalidate = 30;

const ROUND_LABELS: Record<string, string> = {
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "3rd place playoff",
};

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
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const bracketState = await getTournamentBracketState(id);
  const teams = bracketState?.teams ?? [];
  const tournamentGroups = bracketState?.groups ?? [];
  const groupMatchesList = bracketState?.groupMatches ?? [];
  const knockoutMatches = bracketState?.knockoutMatches ?? [];
  const teamLabels = new Map(teams.map((t) => [t.id, t.label]));

  const dateFormatted =
    formatTournamentDateTimeShort(tournament.date, tournament.startTime) ?? tournament.date;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title={tournament.name}
        subtitle={`${dateFormatted} · ${tournament.location}`}
      />

      {tournament.status === "completed" && bracketState?.tournament.championTeamId && (
        <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Champion</p>
          <p className="mt-1 text-2xl font-black text-primary-dark">
            {teamLabels.get(bracketState.tournament.championTeamId!) ?? "—"}
          </p>
        </div>
      )}

      {!bracketState?.groups.length ? (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          Bracket not published yet for this tournament.
        </p>
      ) : (
        <div className="space-y-10">
          <section className="space-y-6">
            <h2 className="text-xl font-bold">Groups</h2>
            {tournamentGroups.map((group) => {
              const gMatches = groupMatchesList.filter((m) => m.groupId === group.id);
              const standings = computeStandings(
                group.teamIds,
                gMatches,
                bracketState.tournament.pointsWin,
                bracketState.tournament.pointsLoss,
                group.manualTiebreakOrder,
              );
              return (
                <div key={group.id} className="space-y-3">
                  <h3 className="font-bold text-primary-dark">Group {group.label}</h3>
                  <StandingsTable rows={standings} teamLabels={teamLabels} />
                  <ul className="space-y-2 text-sm">
                    {gMatches.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                      >
                        <span>
                          {teamLabels.get(m.teamAId)} vs {teamLabels.get(m.teamBId)}
                        </span>
                        <span className="text-gray-600">
                          {m.status === "completed" ? formatMatchScore(m.sets) : "Scheduled"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          {knockoutMatches.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Knockout</h2>
              <KnockoutBracketView
                matches={knockoutMatches.map((m) => ({
                  id: m.id,
                  tournamentId: m.tournamentId,
                  round: m.round as import("@/lib/types").KnockoutRound,
                  slot: m.slot,
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  sets: m.sets,
                  status: m.status,
                  winnerId: m.winnerId,
                  outcome: m.outcome,
                }))}
                teamLabels={teamLabels}
                roundLabels={ROUND_LABELS}
              />
            </section>
          )}
        </div>
      )}

      <Link
        href="/"
        prefetch={false}
        className="mt-8 inline-block text-sm font-semibold text-primary hover:text-primary-dark"
      >
        ← Back to home
      </Link>
    </div>
  );
}
