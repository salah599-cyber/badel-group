"use client";

import { useState } from "react";
import { formatMatchScore } from "@/lib/bracket/score-format";
import { formatLineupPair } from "@/lib/squad/lineups";
import { SquadLineupForm } from "@/components/squad/SquadLineupForm";
import type { MatchLineup, MatchSet, TournamentTeam } from "@/lib/types";
import type { SquadLineupPayload } from "@/lib/squad/lineups";

type SquadMatchCardProps = {
  tournamentId: string;
  matchId: string;
  matchType: "group" | "knockout";
  teamA: TournamentTeam;
  teamB: TournamentTeam;
  entryNames: Map<string, string>;
  lineups: MatchLineup[];
  sets: MatchSet[];
  status: "scheduled" | "completed";
  winnerId?: string | null;
  outcome?: "played" | "walkover";
  disabled?: boolean;
  onSaveLineup: (teamId: string, lineup: SquadLineupPayload) => Promise<void>;
  onSaveScore: (data: {
    sets: MatchSet[];
    walkover?: boolean;
    walkoverWinnerId?: string;
  }) => Promise<void>;
};

export function SquadMatchCard({
  teamA,
  teamB,
  entryNames,
  lineups,
  sets,
  status,
  winnerId,
  outcome,
  disabled,
  onSaveLineup,
  onSaveScore,
}: SquadMatchCardProps) {
  const lineupA = lineups.find((lineup) => lineup.teamId === teamA.id);
  const lineupB = lineups.find((lineup) => lineup.teamId === teamB.id);
  const bothSubmitted = Boolean(lineupA && lineupB);
  const completed = status === "completed";
  const scoreText =
    completed && outcome === "walkover" && winnerId
      ? `${entryNames.get(
          teamA.id === winnerId
            ? teamA.entryIds[0] ?? ""
            : teamB.entryIds[0] ?? "",
        ) ?? "Winner"} — Walkover`
      : completed
        ? formatMatchScore(sets)
        : "Scheduled";

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-cream-dark/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {teamA.label} vs {teamB.label}
        </p>
        <p className="text-sm font-semibold text-gray-600">{scoreText}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineupPanel
          team={teamA}
          entryNames={entryNames}
          lineup={lineupA}
          opponentSubmitted={Boolean(lineupB)}
          bothSubmitted={bothSubmitted}
          disabled={disabled || completed}
          onSubmit={(lineup) => onSaveLineup(teamA.id, lineup)}
        />
        <LineupPanel
          team={teamB}
          entryNames={entryNames}
          lineup={lineupB}
          opponentSubmitted={Boolean(lineupA)}
          bothSubmitted={bothSubmitted}
          disabled={disabled || completed}
          onSubmit={(lineup) => onSaveLineup(teamB.id, lineup)}
        />
      </div>

      {!completed && (
        <SquadMatchScoreForm
          teamAName={teamA.label}
          teamBName={teamB.label}
          teamAId={teamA.id}
          teamBId={teamB.id}
          lineupA={lineupA}
          entryNames={entryNames}
          disabled={disabled || !bothSubmitted}
          initialSets={sets}
          onSubmit={onSaveScore}
        />
      )}
    </div>
  );
}

function LineupPanel({
  team,
  entryNames,
  lineup,
  opponentSubmitted,
  bothSubmitted,
  disabled,
  onSubmit,
}: {
  team: TournamentTeam;
  entryNames: Map<string, string>;
  lineup?: MatchLineup;
  opponentSubmitted: boolean;
  bothSubmitted: boolean;
  disabled?: boolean;
  onSubmit: (lineup: SquadLineupPayload) => void;
}) {
  if (bothSubmitted && lineup) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-primary-dark">{team.label}</p>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>Set 1: {formatLineupPair(lineup.set1EntryIds, entryNames)}</li>
          <li>Set 2: {formatLineupPair(lineup.set2EntryIds, entryNames)}</li>
          <li>Set 3: {formatLineupPair(lineup.set3EntryIds, entryNames)}</li>
        </ul>
      </div>
    );
  }

  if (!opponentSubmitted && lineup) {
    return (
      <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-3 text-sm text-gray-700">
        <p className="font-semibold text-primary-dark">{team.label}</p>
        <p className="mt-1">Lineup submitted. Waiting for opponent.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-primary-dark">{team.label}</p>
      <SquadLineupForm
        rosterEntryIds={team.entryIds}
        entryNames={entryNames}
        initialLineup={lineup}
        disabled={disabled}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function SquadMatchScoreForm({
  teamAName,
  teamBName,
  teamAId,
  teamBId,
  lineupA,
  entryNames,
  disabled,
  initialSets,
  onSubmit,
}: {
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  lineupA?: MatchLineup;
  entryNames: Map<string, string>;
  disabled?: boolean;
  initialSets: MatchSet[];
  onSubmit: (data: { sets: MatchSet[]; walkover?: boolean; walkoverWinnerId?: string }) => void;
}) {
  const [sets, setSets] = useState<MatchSet[]>(
    initialSets.length === 3
      ? initialSets
      : [
          { a: 0, b: 0 },
          { a: 0, b: 0 },
          { a: 0, b: 0 },
        ],
  );
  const [walkover, setWalkover] = useState(false);
  const [walkoverWinnerId, setWalkoverWinnerId] = useState(teamAId);

  const setLabels = [
    formatLineupPair(lineupA?.set1EntryIds, entryNames),
    formatLineupPair(lineupA?.set2EntryIds, entryNames),
    formatLineupPair(lineupA?.set3EntryIds, entryNames),
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-800">Match score (3 x 2v2)</h4>
      {!disabled ? (
        <>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={walkover} onChange={(e) => setWalkover(e.target.checked)} />
            Walkover
          </label>
          {walkover ? (
            <select
              className="input mb-3"
              value={walkoverWinnerId}
              onChange={(e) => setWalkoverWinnerId(e.target.value)}
            >
              <option value={teamAId}>{teamAName}</option>
              <option value={teamBId}>{teamBName}</option>
            </select>
          ) : (
            <div className="space-y-3">
              {sets.map((set, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <p className="text-xs font-medium text-gray-600">
                    Set {index + 1}: {setLabels[index]}
                  </p>
                  <input
                    type="number"
                    min={0}
                    className="input py-1"
                    value={set.a}
                    onChange={(e) => {
                      const next = [...sets];
                      next[index] = { ...next[index], a: Number(e.target.value) };
                      setSets(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    className="input py-1"
                    value={set.b}
                    onChange={(e) => {
                      const next = [...sets];
                      next[index] = { ...next[index], b: Number(e.target.value) };
                      setSets(next);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={disabled}
            className="btn-primary mt-3"
            onClick={() =>
              onSubmit(
                walkover
                  ? { sets: [], walkover: true, walkoverWinnerId }
                  : { sets },
              )
            }
          >
            Save score
          </button>
        </>
      ) : (
        <p className="text-sm text-gray-500">Both teams must submit lineups before scoring.</p>
      )}
    </div>
  );
}
