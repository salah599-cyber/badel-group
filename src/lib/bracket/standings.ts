import type { MatchSet } from "@/lib/db/schema";
import { getSetWinner } from "@/lib/bracket/score";

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  setDiff: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDiff: number;
  points: number;
  rank: number;
};

type CompletedGroupMatch = {
  teamAId: string;
  teamBId: string;
  winnerId: string | null;
  sets: MatchSet[];
  status: string;
};

function gamesInSet(set: MatchSet): { a: number; b: number } {
  if (set.isSuperTiebreak) return { a: set.a, b: set.b };
  return { a: set.a, b: set.b };
}

export function computeStandings(
  teamIds: string[],
  matches: CompletedGroupMatch[],
  pointsWin: number,
  pointsLoss: number,
  manualTiebreakOrder?: string[] | null,
): StandingRow[] {
  const stats = new Map<
    string,
    Omit<StandingRow, "rank" | "setDiff" | "gameDiff">
  >();

  for (const id of teamIds) {
    stats.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      lost: 0,
      setsFor: 0,
      setsAgainst: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== "completed" || !m.winnerId) continue;
    const a = stats.get(m.teamAId);
    const b = stats.get(m.teamBId);
    if (!a || !b) continue;

    a.played++;
    b.played++;

    const winner = m.winnerId === m.teamAId ? a : b;
    const loser = m.winnerId === m.teamAId ? b : a;
    winner.won++;
    loser.lost++;
    winner.points += pointsWin;
    loser.points += pointsLoss;

    for (const set of m.sets) {
      const g = gamesInSet(set);
      const w = getSetWinner(set);
      if (!w) continue;
      if (w === "a") {
        a.setsFor++;
        b.setsAgainst++;
      } else {
        b.setsFor++;
        a.setsAgainst++;
      }
      a.gamesFor += g.a;
      a.gamesAgainst += g.b;
      b.gamesFor += g.b;
      b.gamesAgainst += g.a;
    }
  }

  const rows = [...stats.values()].map((s) => ({
    ...s,
    setDiff: s.setsFor - s.setsAgainst,
    gameDiff: s.gamesFor - s.gamesAgainst,
    rank: 0,
  }));

  const headToHeadWinner = (aId: string, bId: string): string | null => {
    const h2h = matches.filter(
      (m) =>
        m.status === "completed" &&
        m.winnerId &&
        ((m.teamAId === aId && m.teamBId === bId) || (m.teamAId === bId && m.teamBId === aId)),
    );
    if (h2h.length !== 1) return null;
    return h2h[0].winnerId;
  };

  const compare = (a: StandingRow, b: StandingRow): number => {
    if (b.points !== a.points) return b.points - a.points;

    const tiedWithA = rows.filter((r) => r.points === a.points);
    if (tiedWithA.length === 2) {
      const other = tiedWithA.find((r) => r.teamId !== a.teamId);
      if (other && other.teamId === b.teamId) {
        const h2h = headToHeadWinner(a.teamId, b.teamId);
        if (h2h === a.teamId) return -1;
        if (h2h === b.teamId) return 1;
      }
    }

    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;

    if (manualTiebreakOrder?.length) {
      const ai = manualTiebreakOrder.indexOf(a.teamId);
      const bi = manualTiebreakOrder.indexOf(b.teamId);
      if (ai !== -1 && bi !== -1 && ai !== bi) return ai - bi;
    }

    return a.teamId.localeCompare(b.teamId);
  };

  rows.sort(compare);

  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && compare(rows[i - 1], rows[i]) < 0) {
      rank = i + 1;
    }
    rows[i].rank = rank;
  }

  return rows;
}
