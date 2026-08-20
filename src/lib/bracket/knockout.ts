import { computeGroupSizes, groupLabel } from "@/lib/bracket/group-sizes";
import { generateRoundRobinPairs, seededShuffle } from "@/lib/bracket/score";
import type { KnockoutSource } from "@/lib/db/schema";

export type KnockoutRound =
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "third_place";

const ROUND_ORDER: KnockoutRound[] = [
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "final",
];

const ROUND_SLOTS: Record<KnockoutRound, number> = {
  round_of_16: 8,
  quarterfinal: 4,
  semifinal: 2,
  final: 1,
  third_place: 1,
};

export function suggestKnockoutRound(advancingCount: number): KnockoutRound {
  if (advancingCount <= 2) return "final";
  if (advancingCount <= 4) return "semifinal";
  if (advancingCount <= 8) return "quarterfinal";
  return "round_of_16";
}

export function bracketSizeForRound(round: KnockoutRound): number {
  return ROUND_SLOTS[round] * 2;
}

export function roundsFromStart(start: KnockoutRound): KnockoutRound[] {
  const idx = ROUND_ORDER.indexOf(start);
  if (idx === -1) return ["final"];
  return ROUND_ORDER.slice(idx);
}

export type GroupStandingRef = {
  groupLabel: string;
  rank: number;
  teamId: string;
};

export type KnockoutMatchDraft = {
  round: KnockoutRound;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  sourceA: KnockoutSource | null;
  sourceB: KnockoutSource | null;
};

export function buildGroupDraw(
  teamIds: string[],
  seed: number,
  teamsPerGroup = 4,
): { label: string; teamIds: string[] }[] {
  const shuffled = seededShuffle(teamIds, seed);
  const sizes = computeGroupSizes(shuffled.length, teamsPerGroup);
  const result: { label: string; teamIds: string[] }[] = [];
  let offset = 0;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    result.push({
      label: groupLabel(i),
      teamIds: shuffled.slice(offset, offset + size),
    });
    offset += size;
  }
  return result;
}

export function crossPairFirstRound(
  advancing: GroupStandingRef[],
  startRound: KnockoutRound,
): KnockoutMatchDraft[] {
  const bracketTeams = bracketSizeForRound(startRound);
  const byGroup = new Map<string, GroupStandingRef[]>();
  for (const ref of advancing) {
    const list = byGroup.get(ref.groupLabel) ?? [];
    list.push(ref);
    byGroup.set(ref.groupLabel, list);
  }

  const groupLabels = [...byGroup.keys()].sort();
  const slots: KnockoutMatchDraft[] = [];
  const numMatches = bracketTeams / 2;

  for (let slot = 0; slot < numMatches; slot++) {
    slots.push({
      round: startRound,
      slot,
      teamAId: null,
      teamBId: null,
      sourceA: { type: "bye" },
      sourceB: { type: "bye" },
    });
  }

  const seeds: GroupStandingRef[] = [];
  for (const label of groupLabels) {
    const groupRefs = byGroup.get(label) ?? [];
    groupRefs.sort((a, b) => a.rank - b.rank);
    seeds.push(...groupRefs);
  }

  // Cross-pair: group winners vs runners-up from different groups
  const winners = seeds.filter((s) => s.rank === 1);
  const runners = seeds.filter((s) => s.rank > 1);

  const paired: { a: GroupStandingRef; b: GroupStandingRef | null }[] = [];
  const usedRunners = new Set<string>();

  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    const oppositeGroup =
      groupLabels[(groupLabels.indexOf(w.groupLabel) + Math.ceil(groupLabels.length / 2)) %
        groupLabels.length];
    let runner = runners.find(
      (r) => r.groupLabel === oppositeGroup && !usedRunners.has(r.teamId),
    );
    if (!runner) {
      runner = runners.find((r) => r.groupLabel !== w.groupLabel && !usedRunners.has(r.teamId));
    }
    if (runner) {
      usedRunners.add(runner.teamId);
      paired.push({ a: w, b: runner });
    } else {
      paired.push({ a: w, b: null });
    }
  }

  for (const r of runners) {
    if (!usedRunners.has(r.teamId)) {
      paired.push({ a: r, b: null });
    }
  }

  for (let i = 0; i < paired.length && i < numMatches; i++) {
    const { a, b } = paired[i];
    slots[i] = {
      round: startRound,
      slot: i,
      teamAId: a.teamId,
      teamBId: b?.teamId ?? null,
      sourceA: { type: "group", groupLabel: a.groupLabel, rank: a.rank },
      sourceB: b
        ? { type: "group", groupLabel: b.groupLabel, rank: b.rank }
        : { type: "bye" },
    };
  }

  return slots;
}

export function buildFullKnockoutTree(
  firstRound: KnockoutMatchDraft[],
  startRound: KnockoutRound,
  thirdPlacePlayoff: boolean,
  matchIdsByKey: Map<string, string>,
): KnockoutMatchDraft[] {
  const all: KnockoutMatchDraft[] = [...firstRound];
  const rounds = roundsFromStart(startRound);

  for (let r = 1; r < rounds.length; r++) {
    const round = rounds[r];
    const prevRound = rounds[r - 1];
    const currSlots = ROUND_SLOTS[round];

    for (let slot = 0; slot < currSlots; slot++) {
      const prevA = slot * 2;
      const prevB = slot * 2 + 1;
      const keyA = `${prevRound}:${prevA}`;
      const keyB = `${prevRound}:${prevB}`;
      const matchIdA = matchIdsByKey.get(keyA) ?? keyA;
      const matchIdB = matchIdsByKey.get(keyB) ?? keyB;

      all.push({
        round,
        slot,
        teamAId: null,
        teamBId: null,
        sourceA: { type: "winner", matchId: matchIdA },
        sourceB: { type: "winner", matchId: matchIdB },
      });
    }
  }

  if (thirdPlacePlayoff && rounds.includes("semifinal")) {
    const sf0 = matchIdsByKey.get(`semifinal:0`) ?? "semifinal:0";
    const sf1 = matchIdsByKey.get(`semifinal:1`) ?? "semifinal:1";
    all.push({
      round: "third_place",
      slot: 0,
      teamAId: null,
      teamBId: null,
      sourceA: { type: "loser", matchId: sf0 },
      sourceB: { type: "loser", matchId: sf1 },
    });
  }

  return all;
}

export function generateRoundRobinForGroups(
  groups: { label: string; teamIds: string[] }[],
): { groupLabel: string; pairs: { teamAId: string; teamBId: string }[] }[] {
  return groups.map((g) => ({
    groupLabel: g.label,
    pairs: generateRoundRobinPairs(g.teamIds),
  }));
}
