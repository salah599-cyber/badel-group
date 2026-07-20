import type { PlayerRanking, TournamentResult } from "@/lib/types";

export const PLACEMENT_POINTS: Record<string, number> = {
  "1st": 20,
  "2nd": 15,
  "3rd": 10,
  "4th": 5,
  "5th": 3,
  "6th": 1,
};

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

export function calculatePlayerRankings(
  results: TournamentResult[],
  limit = 12,
): PlayerRanking[] {
  const players = new Map<string, { name: string; points: number; placements: number }>();

  for (const result of results) {
    for (const winner of result.winners) {
      const points = PLACEMENT_POINTS[winner.place];
      if (!points) continue;

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

  return sorted.slice(0, limit).map((player, index) => ({
    rank: index + 1,
    name: player.name,
    points: player.points,
    placements: player.placements,
  }));
}
