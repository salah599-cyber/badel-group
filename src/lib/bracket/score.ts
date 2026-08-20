import type { MatchSet } from "@/lib/db/schema";

export type MatchFormat = "best_of_1" | "best_of_3_full" | "best_of_3_super_tiebreak";

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  const random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRoundRobinPairs(teamIds: string[]): { teamAId: string; teamBId: string }[] {
  const pairs: { teamAId: string; teamBId: string }[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push({ teamAId: teamIds[i], teamBId: teamIds[j] });
    }
  }
  return pairs;
}

export function getSetWinner(set: MatchSet): "a" | "b" | null {
  if (set.isSuperTiebreak) {
    if (set.a === set.b) return null;
    return set.a > set.b ? "a" : "b";
  }
  const aGames = set.a;
  const bGames = set.b;
  if (aGames === 6 && bGames === 6) return null;
  if (aGames >= 6 && aGames - bGames >= 2) return "a";
  if (bGames >= 6 && bGames - aGames >= 2) return "b";
  if (aGames === 7 && bGames === 6 && set.tiebreakA != null && set.tiebreakB != null) {
    return set.tiebreakA > set.tiebreakB ? "a" : "b";
  }
  if (bGames === 7 && aGames === 6 && set.tiebreakA != null && set.tiebreakB != null) {
    return set.tiebreakB > set.tiebreakA ? "b" : "a";
  }
  return null;
}

export function deriveMatchWinner(
  sets: MatchSet[],
  teamAId: string,
  teamBId: string,
  format: MatchFormat,
): string | null {
  let aSets = 0;
  let bSets = 0;
  for (const set of sets) {
    const w = getSetWinner(set);
    if (w === "a") aSets++;
    if (w === "b") bSets++;
  }
  const needed = format === "best_of_1" ? 1 : 2;
  if (aSets >= needed) return teamAId;
  if (bSets >= needed) return teamBId;
  return null;
}

export function validateSets(
  sets: MatchSet[],
  format: MatchFormat,
  superTiebreakPoints: number,
): string | null {
  if (!sets.length) return "At least one set is required";

  if (format === "best_of_1") {
    if (sets.length !== 1) return "Best of 1 requires exactly one set";
    return validateRegularSet(sets[0], superTiebreakPoints, false);
  }

  if (sets.length > 3) return "Maximum 3 sets allowed";

  let aSets = 0;
  let bSets = 0;
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const isThird = i === 2;
    if (format === "best_of_3_super_tiebreak" && isThird) {
      if (!set.isSuperTiebreak) return "Third set must be a super tiebreak";
      const err = validateSuperTiebreak(set, superTiebreakPoints);
      if (err) return err;
    } else {
      if (set.isSuperTiebreak) return "Only the third set can be a super tiebreak";
      const err = validateRegularSet(set, superTiebreakPoints, true);
      if (err) return err;
    }
    const w = getSetWinner(set);
    if (!w) return `Set ${i + 1} does not have a valid winner`;
    if (w === "a") aSets++;
    else bSets++;
  }

  if (format === "best_of_3_full" || format === "best_of_3_super_tiebreak") {
    if (sets.length === 2 && aSets === 1 && bSets === 1) {
      if (format === "best_of_3_super_tiebreak") {
        return "A super tiebreak decider is required when sets are 1-1";
      }
      return null;
    }
    if (sets.length === 3) {
      if (aSets === 2 || bSets === 2) return null;
      return "Match score is inconsistent";
    }
    if (aSets === 2 || bSets === 2) return null;
    return "Match is not complete";
  }

  return null;
}

function validateRegularSet(set: MatchSet, superTiebreakPoints: number, allowIncomplete: boolean): string | null {
  if (set.a < 0 || set.b < 0) return "Invalid game score";
  const w = getSetWinner(set);
  if (!w && !allowIncomplete) return "Set does not have a valid winner";
  if (set.a === 6 && set.b === 6) return "6-6 requires a tiebreak";
  if ((set.a === 7 && set.b === 6) || (set.b === 7 && set.a === 6)) {
    if (set.tiebreakA == null || set.tiebreakB == null) return "7-6 set requires tiebreak scores";
    if (set.tiebreakA < 0 || set.tiebreakB < 0) return "Invalid tiebreak score";
    const tbWinner = set.tiebreakA > set.tiebreakB ? "a" : set.tiebreakB > set.tiebreakA ? "b" : null;
    if (!tbWinner) return "Tiebreak must have a winner";
    if (Math.max(set.tiebreakA, set.tiebreakB) < 7) return "Tiebreak winner needs at least 7 points";
    if (Math.abs(set.tiebreakA - set.tiebreakB) < 2) return "Tiebreak must be won by 2";
    if (w !== tbWinner) return "Tiebreak does not match set winner";
  }
  void superTiebreakPoints;
  return null;
}

function validateSuperTiebreak(set: MatchSet, target: number): string | null {
  if (set.a < 0 || set.b < 0) return "Invalid super tiebreak score";
  const max = Math.max(set.a, set.b);
  const min = Math.min(set.a, set.b);
  if (max < target) return `Super tiebreak needs at least ${target} points to win`;
  if (max - min < 2) return "Super tiebreak must be won by 2";
  if (min >= target && max - min < 2) return "Super tiebreak must be won by 2";
  return null;
}
