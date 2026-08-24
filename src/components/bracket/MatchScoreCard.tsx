"use client";

import { useState } from "react";
import { MatchScoreForm } from "@/components/bracket/MatchScoreForm";
import type { MatchFormat, MatchSet } from "@/lib/types";

type MatchScoreCardProps = {
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  label?: string;
  scoreText: string;
  status: "scheduled" | "completed";
  matchFormat: MatchFormat;
  superTiebreakPoints: number;
  initialSets: MatchSet[];
  initialWalkover?: boolean;
  initialWalkoverWinnerId?: string;
  disabled?: boolean;
  /** When true, scheduled matches show the form immediately (admin run page). */
  alwaysShowFormWhenScheduled?: boolean;
  onSubmit: (data: {
    sets: MatchSet[];
    walkover?: boolean;
    walkoverWinnerId?: string;
  }) => void;
};

export function MatchScoreCard({
  teamAName,
  teamBName,
  teamAId,
  teamBId,
  label,
  scoreText,
  status,
  matchFormat,
  superTiebreakPoints,
  initialSets,
  initialWalkover,
  initialWalkoverWinnerId,
  disabled,
  alwaysShowFormWhenScheduled,
  onSubmit,
}: MatchScoreCardProps) {
  const [open, setOpen] = useState(false);
  const completed = status === "completed";
  const showForm = (alwaysShowFormWhenScheduled && !completed) || open;
  const toggleLabel = open ? "Cancel" : completed ? "Edit" : "Enter score";

  return (
    <div className="rounded-xl border border-gray-100 bg-cream-dark/30 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          {label ? <p className="text-xs font-medium text-gray-500">{label}</p> : null}
          <p className="text-sm font-medium">
            {teamAName} vs {teamBName}
          </p>
        </div>
        <p className="text-sm font-semibold text-gray-600">{scoreText}</p>
      </div>
      {(!alwaysShowFormWhenScheduled || completed) && (
        <button
          type="button"
          className="mb-2 text-xs font-semibold text-primary"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
        >
          {toggleLabel}
        </button>
      )}
      {showForm && (
        <MatchScoreForm
          key={`${status}-${open}`}
          matchFormat={matchFormat}
          superTiebreakPoints={superTiebreakPoints}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAId={teamAId}
          teamBId={teamBId}
          disabled={disabled}
          isEditing={completed}
          initialSets={completed ? initialSets : undefined}
          initialWalkover={completed ? initialWalkover : undefined}
          initialWalkoverWinnerId={completed ? initialWalkoverWinnerId : undefined}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}
