"use client";

import { useTransition } from "react";
import { MatchScoreCard } from "@/components/bracket/MatchScoreCard";
import { KnockoutBracketView } from "@/components/bracket/KnockoutBracketView";
import { postAdminJson } from "@/lib/admin-api";
import type { KnockoutMatch, MatchFormat, MatchSet } from "@/lib/types";

export type LivePublicMatch = {
  id: string;
  kind: "group" | "knockout";
  label: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  sets: MatchSet[];
  status: "scheduled" | "completed";
  winnerId?: string | null;
  outcome: "played" | "walkover";
  scoreText: string;
};

function useScoreSave() {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        window.location.reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return { isPending, run };
}

type LiveMatchesSectionProps = {
  canEditScores: boolean;
  matchFormat: MatchFormat;
  superTiebreakPoints: number;
  scheduled: LivePublicMatch[];
  completed: LivePublicMatch[];
  renderMatchExtra?: (match: LivePublicMatch) => React.ReactNode;
};

export function LiveMatchesSection({
  canEditScores,
  matchFormat,
  superTiebreakPoints,
  scheduled,
  completed,
  renderMatchExtra,
}: LiveMatchesSectionProps) {
  const { isPending, run } = useScoreSave();

  function saveMatch(
    match: LivePublicMatch,
    data: { sets: MatchSet[]; walkover?: boolean; walkoverWinnerId?: string },
  ) {
    run(async () => {
      const result = await postAdminJson("/api/admin/bracket", {
        action: match.kind === "knockout" ? "save-knockout-score" : "save-group-score",
        matchId: match.id,
        sets: data.sets,
        walkover: data.walkover,
        walkoverWinnerId: data.walkoverWinnerId,
      });
      if (result.ok === false) throw new Error(result.error);
    });
  }

  if (scheduled.length === 0 && completed.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Matches</h2>

      {scheduled.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Upcoming
          </h3>
          <ul className="space-y-2">
            {scheduled.map((m) =>
              canEditScores ? (
                <li key={m.id}>
                  <MatchScoreCard
                    label={m.label}
                    teamAName={m.teamAName}
                    teamBName={m.teamBName}
                    teamAId={m.teamAId}
                    teamBId={m.teamBId}
                    scoreText="Scheduled"
                    status="scheduled"
                    matchFormat={matchFormat}
                    superTiebreakPoints={superTiebreakPoints}
                    initialSets={m.sets}
                    disabled={isPending}
                    onSubmit={(data) => saveMatch(m, data)}
                  />
                </li>
              ) : (
                <li
                  key={m.id}
                  className="rounded-xl border border-primary/15 bg-white px-4 py-3"
                >
                  <p className="text-xs font-medium text-gray-500">{m.label}</p>
                  <p className="mt-1 text-sm font-semibold text-primary-dark">
                    {m.teamAName} vs {m.teamBName}
                  </p>
                  {renderMatchExtra?.(m)}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Results
          </h3>
          <ul className="space-y-2">
            {completed.map((m) =>
              canEditScores ? (
                <li key={m.id}>
                  <MatchScoreCard
                    label={m.label}
                    teamAName={m.teamAName}
                    teamBName={m.teamBName}
                    teamAId={m.teamAId}
                    teamBId={m.teamBId}
                    scoreText={m.scoreText}
                    status="completed"
                    matchFormat={matchFormat}
                    superTiebreakPoints={superTiebreakPoints}
                    initialSets={m.sets}
                    initialWalkover={m.outcome === "walkover"}
                    initialWalkoverWinnerId={m.winnerId ?? undefined}
                    disabled={isPending}
                    onSubmit={(data) => saveMatch(m, data)}
                  />
                </li>
              ) : (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-xs text-gray-500">{m.label}</p>
                    <p className="font-medium text-primary-dark">
                      {m.teamAName} vs {m.teamBName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-700">{m.scoreText}</span>
                    {renderMatchExtra?.(m)}
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

type LiveKnockoutSectionProps = {
  canEditScores: boolean;
  matchFormat: MatchFormat;
  superTiebreakPoints: number;
  knockoutMatches: KnockoutMatch[];
  teamLabels: Record<string, string>;
  roundLabels: Record<string, string>;
};

export function LiveKnockoutSection({
  canEditScores,
  matchFormat,
  superTiebreakPoints,
  knockoutMatches,
  teamLabels,
  roundLabels,
}: LiveKnockoutSectionProps) {
  const { isPending, run } = useScoreSave();

  if (knockoutMatches.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">Knockout bracket</h2>
      <KnockoutBracketView
        matches={knockoutMatches}
        teamLabels={teamLabels}
        roundLabels={roundLabels}
        admin={canEditScores}
        matchFormat={matchFormat}
        superTiebreakPoints={superTiebreakPoints}
        disabled={isPending}
        onSaveKnockout={
          canEditScores
            ? (matchId, data) =>
                run(async () => {
                  const result = await postAdminJson("/api/admin/bracket", {
                    action: "save-knockout-score",
                    matchId,
                    sets: data.sets,
                    walkover: data.walkover,
                    walkoverWinnerId: data.walkoverWinnerId,
                  });
                  if (result.ok === false) throw new Error(result.error);
                })
            : undefined
        }
      />
    </section>
  );
}
