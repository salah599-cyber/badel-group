"use client";

import { useState } from "react";
import { formatMatchScore } from "@/lib/bracket/score-format";
import type { KnockoutMatch, MatchFormat } from "@/lib/types";
import { MatchScoreForm } from "@/components/bracket/MatchScoreForm";

type KnockoutBracketViewProps = {
  matches: KnockoutMatch[];
  teamLabels: Map<string, string>;
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

function teamName(id: string | null | undefined, labels: Map<string, string>) {
  if (!id) return "TBD";
  return labels.get(id) ?? "TBD";
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
                <p className="mt-1 text-xs text-gray-600">{formatMatchScore(match.sets)}</p>
              )}
              {admin && match.status !== "completed" && match.teamAId && match.teamBId && (
                <>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary"
                    onClick={() =>
                      setExpandedId(expandedId === match.id ? null : match.id)
                    }
                  >
                    {expandedId === match.id ? "Hide score form" : "Enter score"}
                  </button>
                  {expandedId === match.id && matchFormat && onSaveKnockout && (
                    <div className="mt-2">
                      <MatchScoreForm
                        matchFormat={matchFormat}
                        superTiebreakPoints={superTiebreakPoints}
                        teamAName={teamName(match.teamAId, teamLabels)}
                        teamBName={teamName(match.teamBId, teamLabels)}
                        teamAId={match.teamAId!}
                        teamBId={match.teamBId!}
                        disabled={disabled}
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
