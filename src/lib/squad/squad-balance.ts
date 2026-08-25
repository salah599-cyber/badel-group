import { seededShuffle } from "@/lib/bracket/score";
import {
  DEFAULT_SQUAD_ROSTER_SIZE,
  DEFAULT_SQUAD_TEAM_COUNT,
  skillWeight,
  type AdminSkillRank,
} from "@/lib/squad/constants";

export type SquadPlayerInput = {
  entryId: string;
  adminSkillRank: AdminSkillRank;
  isWoman: boolean;
};

function shuffleWithinRank(players: SquadPlayerInput[], seed: number): SquadPlayerInput[] {
  const byRank = new Map<string, SquadPlayerInput[]>();
  for (const player of players) {
    const list = byRank.get(player.adminSkillRank) ?? [];
    list.push(player);
    byRank.set(player.adminSkillRank, list);
  }

  const result: SquadPlayerInput[] = [];
  let offset = 0;
  for (const [, group] of byRank) {
    const shuffled = seededShuffle(
      group.map((p) => p.entryId),
      seed + offset,
    );
    offset += 1;
    const byId = new Map(group.map((p) => [p.entryId, p]));
    for (const id of shuffled) {
      const player = byId.get(id);
      if (player) result.push(player);
    }
  }

  return result.sort((a, b) => skillWeight(b.adminSkillRank) - skillWeight(a.adminSkillRank));
}

function snakeDeal<T>(items: T[], teamCount: number): T[][] {
  const teams: T[][] = Array.from({ length: teamCount }, () => []);
  let direction = 1;
  let index = 0;

  for (const item of items) {
    teams[index].push(item);
    if (teamCount <= 1) continue;
    index += direction;
    if (index >= teamCount) {
      index = teamCount - 1;
      direction = -1;
    } else if (index < 0) {
      index = 0;
      direction = 1;
    }
  }

  return teams;
}

function teamSkillSum(entryIds: string[], weights: Map<string, number>): number {
  return entryIds.reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
}

export function balanceSquads(
  players: SquadPlayerInput[],
  seed: number,
  teamCount = DEFAULT_SQUAD_TEAM_COUNT,
  rosterSize = DEFAULT_SQUAD_ROSTER_SIZE,
): string[][] {
  if (players.length !== teamCount * rosterSize) {
    throw new Error(`Expected ${teamCount * rosterSize} players, got ${players.length}`);
  }

  const weights = new Map(players.map((p) => [p.entryId, skillWeight(p.adminSkillRank)]));
  const shuffled = shuffleWithinRank(players, seed);

  const women = shuffled.filter((p) => p.isWoman);
  const men = shuffled.filter((p) => !p.isWoman);

  const teams: string[][] = Array.from({ length: teamCount }, () => []);

  const womenByTeam = snakeDeal(women, teamCount);
  for (let i = 0; i < teamCount; i++) {
    for (const woman of womenByTeam[i]) {
      teams[i].push(woman.entryId);
    }
  }

  const remaining = [...men].sort(
    (a, b) => skillWeight(b.adminSkillRank) - skillWeight(a.adminSkillRank),
  );

  for (const player of remaining) {
    const candidates = teams
      .map((team, index) => ({ index, team }))
      .filter(({ team }) => team.length < rosterSize);

    if (candidates.length === 0) {
      throw new Error("Could not assign all players to teams");
    }

    candidates.sort((a, b) => {
      const sumDiff =
        teamSkillSum(a.team, weights) - teamSkillSum(b.team, weights);
      if (sumDiff !== 0) return sumDiff;
      return a.team.length - b.team.length;
    });

    candidates[0].team.push(player.entryId);
  }

  for (const team of teams) {
    if (team.length !== rosterSize) {
      throw new Error("Team balancing produced uneven rosters");
    }
  }

  return teams;
}

export function defaultSquadTeamLabel(index: number): string {
  return `Team ${index + 1}`;
}
