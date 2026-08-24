import { LiveKnockoutSection, LiveMatchesSection, type LivePublicMatch } from "@/components/bracket/LiveMatchesSection";
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

type PublicTournamentViewProps = {
  tournament: Tournament;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  groupMatches: GroupMatch[];
  knockoutMatches: KnockoutMatch[];
  pointsWin: number;
  pointsLoss: number;
  championTeamId?: string | null;
  canEditScores?: boolean;
};

function formatMatchResult(
  match: {
    status: "scheduled" | "completed";
    outcome: "played" | "walkover";
    winnerId?: string | null;
    sets: GroupMatch["sets"];
  },
  teamLabels: Record<string, string>,
): string {
  if (match.status !== "completed") return "Scheduled";
  if (match.outcome === "walkover" && match.winnerId) {
    return `${teamLabels[match.winnerId] ?? "Winner"} — Walkover`;
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
  canEditScores = false,
}: PublicTournamentViewProps) {
  const teamLabels: Record<string, string> = Object.fromEntries(
    teams.map((t) => [t.id, t.label]),
  );
  const teamLabelMap = new Map(Object.entries(teamLabels));

  const allMatches: LivePublicMatch[] = [];

  for (const group of groups) {
    const gMatches = groupMatches.filter((m) => m.groupId === group.id);
    for (const m of gMatches) {
      allMatches.push({
        id: m.id,
        kind: "group",
        label: `Group ${group.label}`,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamAName: teamLabels[m.teamAId] ?? "A",
        teamBName: teamLabels[m.teamBId] ?? "B",
        sets: m.sets,
        status: m.status,
        winnerId: m.winnerId,
        outcome: m.outcome,
        scoreText: formatMatchResult(m, teamLabels),
      });
    }
  }

  for (const m of knockoutMatches) {
    if (!m.teamAId && !m.teamBId) continue;
    const roundLabel = ROUND_LABELS[m.round] ?? m.round;
    allMatches.push({
      id: m.id,
      kind: "knockout",
      label: roundLabel,
      teamAId: m.teamAId ?? "",
      teamBId: m.teamBId ?? "",
      teamAName: teamLabels[m.teamAId ?? ""] ?? "TBD",
      teamBName: teamLabels[m.teamBId ?? ""] ?? "TBD",
      sets: m.sets,
      status: m.status,
      winnerId: m.winnerId,
      outcome: m.outcome,
      scoreText: formatMatchResult(m, teamLabels),
    });
  }

  const scheduled = allMatches.filter(
    (m) =>
      m.status === "scheduled" &&
      m.teamAId &&
      m.teamBId &&
      teamLabels[m.teamAId] &&
      teamLabels[m.teamBId],
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
            {teamLabels[championTeamId] ?? "—"}
          </p>
        </div>
      )}

      {!groups.length ? (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          Lineups and scores will appear here once the draw is published.
        </p>
      ) : (
        <>
          <LiveMatchesSection
            canEditScores={canEditScores}
            matchFormat={tournament.matchFormat}
            superTiebreakPoints={tournament.superTiebreakPoints}
            scheduled={scheduled}
            completed={completed}
          />

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
                  <StandingsTable rows={standings} teamLabels={teamLabelMap} />
                </div>
              );
            })}
          </section>

          <LiveKnockoutSection
            canEditScores={canEditScores}
            matchFormat={tournament.matchFormat}
            superTiebreakPoints={tournament.superTiebreakPoints}
            knockoutMatches={knockoutMatches}
            teamLabels={teamLabels}
            roundLabels={ROUND_LABELS}
          />
        </>
      )}
    </div>
  );
}
