import type { PlayerRanking, TournamentResult } from "@/lib/types";

export const PLACEMENT_POINTS: Record<string, number> = {
  "1st": 8,
  "2nd": 6,
  "3rd": 4,
  "4th": 2,
  "5th": 1,
};

export function pointsForPlace(place: string): number {
  return PLACEMENT_POINTS[place] ?? 0;
}

const PAIR_SEPARATORS = /\s*(?:&|\/|\+|\band\b)\s*/i;

export function parsePairNames(names: string): string[] {
  return names
    .split(PAIR_SEPARATORS)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function normalizePlayerKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type RankedPlayer = {
  name: string;
  points: number;
  placements: number;
};

/** Competition ranking: tied players share a rank; the next rank skips (e.g. 1, 1, 3, 3). */
export function assignCompetitionRanks(players: RankedPlayer[]): PlayerRanking[] {
  let rank = 1;

  return players.map((player, index) => {
    if (index > 0 && player.points < players[index - 1].points) {
      rank = index + 1;
    }

    return {
      rank,
      name: player.name,
      points: player.points,
      placements: player.placements,
    };
  });
}

export function calculatePlayerRankings(
  results: TournamentResult[],
  limit: number | null = 12,
): PlayerRanking[] {
  const players = new Map<string, { name: string; points: number; placements: number }>();

  for (const result of results) {
    const winners = Array.isArray(result.winners) ? result.winners : [];
    for (const winner of winners) {
      if (!winner?.names || !winner?.place) continue;
      const points = pointsForPlace(winner.place);

      for (const playerName of parsePairNames(winner.names)) {
        const key = normalizePlayerKey(playerName);
        const existing = players.get(key);

        if (existing) {
          existing.points += points;
          existing.placements += 1;
        } else {
          players.set(key, { name: playerName.trim(), points, placements: 1 });
        }
      }
    }
  }

  const sorted = [...players.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.placements !== a.placements) return b.placements - a.placements;
    return a.name.localeCompare(b.name);
  });

  const ranked = assignCompetitionRanks(sorted);
  return limit === null ? ranked : ranked.slice(0, limit);
}
