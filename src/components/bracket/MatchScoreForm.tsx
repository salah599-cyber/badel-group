"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchFormat, MatchSet } from "@/lib/types";

type MatchScoreFormProps = {
  matchFormat: MatchFormat;
  superTiebreakPoints: number;
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  disabled?: boolean;
  onSubmit: (data: {
    sets: MatchSet[];
    walkover?: boolean;
    walkoverWinnerId?: string;
  }) => void;
};

function emptySet(): MatchSet {
  return { a: 0, b: 0 };
}

export function MatchScoreForm({
  matchFormat,
  superTiebreakPoints,
  teamAName,
  teamBName,
  teamAId,
  teamBId,
  disabled,
  onSubmit,
}: MatchScoreFormProps) {
  const [sets, setSets] = useState<MatchSet[]>([emptySet()]);
  const [walkover, setWalkover] = useState(false);
  const [walkoverWinnerId, setWalkoverWinnerId] = useState(teamAId);
  const [showTiebreak, setShowTiebreak] = useState(false);
  const [superMode, setSuperMode] = useState(false);

  const maxSets = matchFormat === "best_of_1" ? 1 : 3;

  function updateSet(index: number, field: keyof MatchSet, value: number | boolean) {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (walkover) {
      onSubmit({ sets: [], walkover: true, walkoverWinnerId });
      return;
    }

    let payload = [...sets];
    if (matchFormat === "best_of_3_super_tiebreak" && superMode) {
      payload = [
        ...sets.slice(0, 2),
        { a: sets[2]?.a ?? 0, b: sets[2]?.b ?? 0, isSuperTiebreak: true },
      ];
    } else if (showTiebreak && payload[0]) {
      payload[0] = {
        ...payload[0],
        tiebreakA: payload[0].tiebreakA ?? 0,
        tiebreakB: payload[0].tiebreakB ?? 0,
      };
    }

    onSubmit({ sets: payload });
  }

  const setOneWinner = useMemo(() => {
    if (sets.length < 2) return null;
    const s0 = sets[0];
    const s1 = sets[1];
    const w0 = s0.a > s0.b ? "a" : s0.b > s0.a ? "b" : null;
    const w1 = s1.a > s1.b ? "a" : s1.b > s1.a ? "b" : null;
    if (w0 && w1 && w0 !== w1) return true;
    return false;
  }, [sets]);

  useEffect(() => {
    if (matchFormat !== "best_of_1" && sets.length < 2) {
      setSets((prev) => (prev.length >= 2 ? prev : [...prev, emptySet()]));
    }
    if (matchFormat === "best_of_3_super_tiebreak" && setOneWinner) {
      setSuperMode(true);
      setSets((prev) => (prev.length >= 3 ? prev : [...prev, emptySet()]));
    }
  }, [matchFormat, setOneWinner, sets.length]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={walkover}
          onChange={(e) => setWalkover(e.target.checked)}
          disabled={disabled}
        />
        Walkover / no-show
      </label>

      {walkover ? (
        <select
          className="input"
          value={walkoverWinnerId}
          onChange={(e) => setWalkoverWinnerId(e.target.value)}
          disabled={disabled}
        >
          <option value={teamAId}>{teamAName}</option>
          <option value={teamBId}>{teamBName}</option>
        </select>
      ) : (
        <div className="space-y-3">
          {sets.slice(0, maxSets).map((set, index) => {
            const isSuper = superMode && index === 2;
            return (
              <div key={index} className="rounded-lg bg-cream-dark/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                  {isSuper ? `Super tiebreak (to ${superTiebreakPoints})` : `Set ${index + 1}`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">{teamAName}</label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={set.a}
                      onChange={(e) => updateSet(index, "a", Number(e.target.value))}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">{teamBName}</label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={set.b}
                      onChange={(e) => updateSet(index, "b", Number(e.target.value))}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {!isSuper && index === 0 && (
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={showTiebreak}
                      onChange={(e) => setShowTiebreak(e.target.checked)}
                      disabled={disabled}
                    />
                    Set decided by tiebreak (7–6)
                  </label>
                )}
                {!isSuper && showTiebreak && index === 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      className="input"
                      placeholder="TB A"
                      value={set.tiebreakA ?? ""}
                      onChange={(e) => updateSet(index, "tiebreakA", Number(e.target.value))}
                      disabled={disabled}
                    />
                    <input
                      type="number"
                      min={0}
                      className="input"
                      placeholder="TB B"
                      value={set.tiebreakB ?? ""}
                      onChange={(e) => updateSet(index, "tiebreakB", Number(e.target.value))}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button type="submit" disabled={disabled} className="btn-primary w-full text-sm">
        Save score
      </button>
    </form>
  );
}
