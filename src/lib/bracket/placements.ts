import type { MatchSet } from "@/lib/db/schema";
import type { StandingRow } from "@/lib/bracket/standings";

type TeamStats = {
  teamId: string;
  label: string;
  matchesWon: number;
  gamesWon: number;
};

type MatchRecord = {
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  sets: MatchSet[];
  status: string;
};

function accumulateMatchStats(
  stats: Map<string, TeamStats>,
  match: MatchRecord,
) {
  if (match.status !== "completed" || !match.winnerId) return;
  const a = stats.get(match.teamAId ?? "");
  const b = stats.get(match.teamBId ?? "");
  if (!a || !b) return;

  if (match.winnerId === match.teamAId) a.matchesWon++;
  else if (match.winnerId === match.teamBId) b.matchesWon++;

  for (const set of match.sets) {
    if (!match.teamAId || !match.teamBId) continue;
    if (set.isSuperTiebreak) {
      a.gamesWon += set.a;
      b.gamesWon += set.b;
    } else {
      a.gamesWon += set.a;
      b.gamesWon += set.b;
    }
  }
}

function compareStats(a: TeamStats, b: TeamStats): number {
  if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
  if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
  return a.label.localeCompare(b.label);
}

export type Placement = { place: number; teamId: string; label: string };

export function computePlacements(input: {
  teams: { id: string; label: string }[];
  groupMatches: MatchRecord[];
  knockoutMatches: MatchRecord[];
  knockoutRounds: { id: string; round: string; slot: number; winnerId: string | null; teamAId: string | null; teamBId: string | null }[];
  thirdPlacePlayoff: boolean;
  advancingTeamIds: Set<string>;
  groupStandings: Map<string, StandingRow[]>;
}): Placement[] {
  const stats = new Map<string, TeamStats>();
  for (const t of input.teams) {
    stats.set(t.id, { teamId: t.id, label: t.label, matchesWon: 0, gamesWon: 0 });
  }

  for (const m of input.groupMatches) accumulateMatchStats(stats, m);
  for (const m of input.knockoutMatches) accumulateMatchStats(stats, m);

  const final = input.knockoutRounds.find((m) => m.round === "final");
  const thirdPlace = input.knockoutRounds.find((m) => m.round === "third_place");
  const semifinals = input.knockoutRounds.filter((m) => m.round === "semifinal");

  const placements: Placement[] = [];
  const placed = new Set<string>();

  function placeTeam(rank: number, teamId: string | null | undefined) {
    if (!teamId || placed.has(teamId)) return;
    const s = stats.get(teamId);
    if (!s) return;
    placements.push({ place: rank, teamId, label: s.label });
    placed.add(teamId);
  }

  if (!final?.winnerId) {
    throw new Error("Final must be completed before publishing placements");
  }

  const finalLoser =
    final.winnerId === final.teamAId ? final.teamBId : final.teamAId;
  placeTeam(1, final.winnerId);
  placeTeam(2, finalLoser);

  if (input.thirdPlacePlayoff && thirdPlace?.winnerId) {
    const thirdLoser =
      thirdPlace.winnerId === thirdPlace.teamAId
        ? thirdPlace.teamBId
        : thirdPlace.teamAId;
    placeTeam(3, thirdPlace.winnerId);
    placeTeam(4, thirdLoser);
  } else if (semifinals.length >= 2) {
    const sfLosers = semifinals
      .map((sf) => {
        if (!sf.winnerId) return null;
        return sf.winnerId === sf.teamAId ? sf.teamBId : sf.teamAId;
      })
      .filter(Boolean) as string[];
    const sorted = sfLosers
      .map((id) => stats.get(id)!)
      .filter(Boolean)
      .sort(compareStats);
    if (sorted[0]) placeTeam(3, sorted[0].teamId);
    if (sorted[1]) placeTeam(4, sorted[1].teamId);
  }

  const remaining = [...stats.values()]
    .filter((s) => !placed.has(s.teamId))
    .sort(compareStats);

  let nextPlace = placements.length + 1;
  for (const s of remaining) {
    placeTeam(nextPlace, s.teamId);
    nextPlace++;
  }

  return placements.sort((a, b) => a.place - b.place);
}

export function placementsToWinners(placements: Placement[]): { place: string; names: string }[] {
  return placements.map((p) => ({
    place: ordinalPlace(p.place),
    names: p.label,
  }));
}

export function ordinalPlace(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export function getAdvancingTeams(
  groups: { label: string; teamIds: string[]; manualTiebreakOrder?: string[] | null }[],
  standingsByGroup: Map<string, StandingRow[]>,
  advancePerGroup: number,
): { groupLabel: string; rank: number; teamId: string }[] {
  const refs: { groupLabel: string; rank: number; teamId: string }[] = [];
  for (const g of groups) {
    const standings = standingsByGroup.get(g.label) ?? [];
    for (let rank = 1; rank <= advancePerGroup; rank++) {
      const row = standings.find((s) => s.rank === rank);
      if (row) refs.push({ groupLabel: g.label, rank, teamId: row.teamId });
    }
  }
  return refs;
}
