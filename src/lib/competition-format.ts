export type CompetitionFormat = "pairs" | "squads";

export function isSquadFormat(format: CompetitionFormat | string | null | undefined): boolean {
  return format === "squads";
}

export function isPairFormat(format: CompetitionFormat | string | null | undefined): boolean {
  return !format || format === "pairs";
}
