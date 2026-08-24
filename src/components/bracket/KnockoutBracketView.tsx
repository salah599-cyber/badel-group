"use client";

import { useState } from "react";
import { formatMatchScore } from "@/lib/bracket/score-format";
import type { KnockoutMatch, MatchFormat } from "@/lib/types";
import { MatchScoreForm } from "@/components/bracket/MatchScoreForm";

type TeamLabels = Map<string, string> | Record<string, string>;

type KnockoutBracketViewProps = {
  matches: KnockoutMatch[];
  teamLabels: TeamLabels;
  roundLabels: Record<string, string>;
  admin?: boolean;
  matchFormat?: MatchFormat;
  superTiebreakPoints?: number;
  disabled?: boolean;
  onSaveKnockout?: (
    matchId: string,
    data: { sets: KnockoutMatch["sets"]; walkover?: boolean; walkoverWinnerId?: string },
  ) => void;
};

function teamName(id: string | null | undefined, labels: TeamLabels) {
  if (!id) return "TBD";
  if (labels instanceof Map) return labels.get(id) ?? "TBD";
  return labels[id] ?? "TBD";
}

export function KnockoutBracketView({
  matches,
  teamLabels,
  roundLabels,
  admin,
  matchFormat,
  superTiebreakPoints = 10,
  disabled,
  onSaveKnockout,
}: KnockoutBracketViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const roundOrder = ["round_of_16", "quarterfinal", "semifinal", "final", "third_place"];
  const byRound = roundOrder
    .map((round) => ({
      round,
      label: roundLabels[round] ?? round,
      matches: matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot),
    }))
    .filter((r) => r.matches.length > 0);

  return (
    <div className="flex flex-wrap gap-6 overflow-x-auto pb-4">
      {byRound.map(({ round, label, matches: roundMatches }) => (
        <div key={round} className="min-w-[220px] space-y-3">
          <h3 className="text-center text-sm font-bold uppercase tracking-wide text-gray-500">
            {label}
          </h3>
          {roundMatches.map((match) => (
            <div
              key={match.id}
              className="rounded-xl border border-primary/15 bg-white p-3 shadow-sm"
            >
              <p className="text-sm font-semibold text-primary-dark">
                {teamName(match.teamAId, teamLabels)}
              </p>
              <p className="text-sm font-semibold text-primary-dark">
                {teamName(match.teamBId, teamLabels)}
              </p>
              {match.status === "completed" && (
                <p className="mt-1 text-xs text-gray-600">
                  {match.outcome === "walkover"
                    ? `${teamName(match.winnerId, teamLabels)} — Walkover`
                    : formatMatchScore(match.sets)}
                </p>
              )}
              {admin && match.teamAId && match.teamBId && (
                <>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary"
                    disabled={disabled}
                    onClick={() =>
                      setExpandedId(expandedId === match.id ? null : match.id)
                    }
                  >
                    {expandedId === match.id
                      ? "Hide score form"
                      : match.status === "completed"
                        ? "Edit"
                        : "Enter score"}
                  </button>
                  {expandedId === match.id && matchFormat && onSaveKnockout && (
                    <div className="mt-2">
                      <MatchScoreForm
                        key={`${match.id}-${match.status}`}
                        matchFormat={matchFormat}
                        superTiebreakPoints={superTiebreakPoints}
                        teamAName={teamName(match.teamAId, teamLabels)}
                        teamBName={teamName(match.teamBId, teamLabels)}
                        teamAId={match.teamAId}
                        teamBId={match.teamBId}
                        disabled={disabled}
                        isEditing={match.status === "completed"}
                        initialSets={
                          match.status === "completed" ? match.sets : undefined
                        }
                        initialWalkover={
                          match.status === "completed"
                            ? match.outcome === "walkover"
                            : undefined
                        }
                        initialWalkoverWinnerId={
                          match.status === "completed"
                            ? (match.winnerId ?? undefined)
                            : undefined
                        }
                        onSubmit={(data) => onSaveKnockout(match.id, data)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
