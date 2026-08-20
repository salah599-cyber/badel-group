import type { MatchSet } from "@/lib/db/schema";

export function formatSetScore(set: MatchSet): string {
  if (set.isSuperTiebreak) {
    return `[${set.a}–${set.b}]`;
  }
  const hasTiebreak =
    (set.a === 7 && set.b === 6) || (set.b === 7 && set.a === 6);
  if (hasTiebreak && set.tiebreakA != null && set.tiebreakB != null) {
    const loserTb = set.a > set.b ? set.tiebreakB : set.tiebreakA;
    const games = set.a > set.b ? `${set.a}–${set.b}` : `${set.b}–${set.a}`;
    return `${games}(${loserTb})`;
  }
  return `${set.a}–${set.b}`;
}

export function formatMatchScore(sets: MatchSet[]): string {
  if (!sets.length) return "—";
  return sets.map(formatSetScore).join(", ");
}
