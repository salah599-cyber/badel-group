import { KnockoutBracketView } from "@/components/bracket/KnockoutBracketView";
import { StandingsTable } from "@/components/bracket/StandingsTable";
import { computeStandings } from "@/lib/bracket/standings";
import { formatMatchScore } from "@/lib/bracket/score-format";
import type {
  GroupMatch,
  KnockoutMatch,
  Tournament,
  TournamentGroup,
  TournamentStatus,
  TournamentTeam,
} from "@/lib/types";

const ROUND_LABELS: Record<string, string> = {
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "3rd place playoff",
};

const STATUS_BANNER: Record<TournamentStatus, string> = {
  upcoming: "Registration open",
  registration_closed: "Registration closed",
  group_stage: "Group stage in progress",
  knockout_stage: "Knockout in progress",
  completed: "Tournament completed",
};

type PublicMatch = {
  id: string;
  label: string;
  teamAId: string;
  teamBId: string;
  sets: GroupMatch["sets"];
  status: "scheduled" | "completed";
  winnerId?: string | null;
  outcome: "played" | "walkover";
};

type PublicTournamentViewProps = {
  tournament: Tournament;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  groupMatches: GroupMatch[];
  knockoutMatches: KnockoutMatch[];
  pointsWin: number;
  pointsLoss: number;
  championTeamId?: string | null;
};

function formatMatchResult(
  match: PublicMatch,
  teamLabels: Map<string, string>,
): string {
  if (match.status !== "completed") return "Scheduled";
  if (match.outcome === "walkover" && match.winnerId) {
    return `${teamLabels.get(match.winnerId) ?? "Winner"} — Walkover`;
  }
  return formatMatchScore(match.sets);
}

export function PublicTournamentView({
  tournament,
  teams,
  groups,
  groupMatches,
  knockoutMatches,
  pointsWin,
  pointsLoss,
  championTeamId,
}: PublicTournamentViewProps) {
  const teamLabels = new Map(teams.map((t) => [t.id, t.label]));

  const allMatches: PublicMatch[] = [];

  for (const group of groups) {
    const gMatches = groupMatches.filter((m) => m.groupId === group.id);
    for (const m of gMatches) {
      allMatches.push({
        id: m.id,
        label: `Group ${group.label}`,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        sets: m.sets,
        status: m.status,
        winnerId: m.winnerId,
        outcome: m.outcome,
      });
    }
  }

  for (const m of knockoutMatches) {
    if (!m.teamAId && !m.teamBId) continue;
    const roundLabel = ROUND_LABELS[m.round] ?? m.round;
    allMatches.push({
      id: m.id,
      label: roundLabel,
      teamAId: m.teamAId ?? "",
      teamBId: m.teamBId ?? "",
      sets: m.sets,
      status: m.status,
      winnerId: m.winnerId,
      outcome: m.outcome,
    });
  }

  const scheduled = allMatches.filter(
    (m) =>
      m.status === "scheduled" &&
      m.teamAId &&
      m.teamBId &&
      teamLabels.get(m.teamAId) &&
      teamLabels.get(m.teamBId),
  );

  const completed = allMatches.filter((m) => m.status === "completed");

  const isLive =
    tournament.status === "group_stage" || tournament.status === "knockout_stage";

  return (
    <div className="space-y-8">
      <div
        className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
          isLive
            ? "border-brand-green/30 bg-brand-green/10 text-primary-dark"
            : "border-primary/20 bg-primary/5 text-primary-dark"
        }`}
      >
        {STATUS_BANNER[tournament.status]}
      </div>

      {tournament.status === "completed" && championTeamId && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Champion</p>
          <p className="mt-1 text-2xl font-black text-primary-dark">
            {teamLabels.get(championTeamId) ?? "—"}
          </p>
        </div>
      )}

      {!groups.length ? (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          Lineups and scores will appear here once the draw is published.
        </p>
      ) : (
        <>
          {(scheduled.length > 0 || completed.length > 0) && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Matches</h2>

              {scheduled.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Upcoming
                  </h3>
                  <ul className="space-y-2">
                    {scheduled.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-xl border border-primary/15 bg-white px-4 py-3"
                      >
                        <p className="text-xs font-medium text-gray-500">{m.label}</p>
                        <p className="mt-1 text-sm font-semibold text-primary-dark">
                          {teamLabels.get(m.teamAId)} vs {teamLabels.get(m.teamBId)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {completed.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Results
                  </h3>
                  <ul className="space-y-2">
                    {completed.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="text-xs text-gray-500">{m.label}</p>
                          <p className="font-medium text-primary-dark">
                            {teamLabels.get(m.teamAId)} vs {teamLabels.get(m.teamBId)}
                          </p>
                        </div>
                        <span className="font-semibold text-gray-700">
                          {formatMatchResult(m, teamLabels)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="space-y-6">
            <h2 className="text-xl font-bold">Group standings</h2>
            {groups.map((group) => {
              const gMatches = groupMatches.filter((m) => m.groupId === group.id);
              const standings = computeStandings(
                group.teamIds,
                gMatches.map((m) => ({
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  winnerId: m.winnerId ?? null,
                  sets: m.sets,
                  status: m.status,
                })),
                pointsWin,
                pointsLoss,
                group.manualTiebreakOrder,
              );
              return (
                <div key={group.id} className="space-y-3">
                  <h3 className="font-bold text-primary-dark">Group {group.label}</h3>
                  <StandingsTable rows={standings} teamLabels={teamLabels} />
                </div>
              );
            })}
          </section>

          {knockoutMatches.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Knockout bracket</h2>
              <KnockoutBracketView
                matches={knockoutMatches}
                teamLabels={teamLabels}
                roundLabels={ROUND_LABELS}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
