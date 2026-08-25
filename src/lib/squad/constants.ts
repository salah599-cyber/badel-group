export const ADMIN_SKILL_RANKS = ["B+", "B", "B-", "C+", "C", "C-", "D"] as const;
export type AdminSkillRank = (typeof ADMIN_SKILL_RANKS)[number];

export const SKILL_WEIGHTS: Record<AdminSkillRank, number> = {
  "B+": 7,
  B: 6,
  "B-": 5,
  "C+": 4,
  C: 3,
  "C-": 2,
  D: 1,
};

export const DEFAULT_SQUAD_MAX_PLAYERS = 48;
export const DEFAULT_SQUAD_TEAM_COUNT = 8;
export const DEFAULT_SQUAD_ROSTER_SIZE = 6;
export const SQUAD_SETS_PER_MATCH = 3;

export function isAdminSkillRank(value: string | null | undefined): value is AdminSkillRank {
  return !!value && (ADMIN_SKILL_RANKS as readonly string[]).includes(value);
}

export function skillWeight(rank: string | null | undefined): number {
  if (!rank || !isAdminSkillRank(rank)) return 0;
  return SKILL_WEIGHTS[rank];
}
