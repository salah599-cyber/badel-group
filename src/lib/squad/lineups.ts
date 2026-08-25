import type { AdminSkillRank } from "@/lib/squad/constants";

export type SquadLineupSet = [string, string];

export type SquadLineupPayload = {
  set1: SquadLineupSet;
  set2: SquadLineupSet;
  set3: SquadLineupSet;
};

export function lineupToEntryIds(payload: SquadLineupPayload): {
  set1EntryIds: string[];
  set2EntryIds: string[];
  set3EntryIds: string[];
} {
  return {
    set1EntryIds: [...payload.set1],
    set2EntryIds: [...payload.set2],
    set3EntryIds: [...payload.set3],
  };
}

export function validateSquadLineup(
  rosterEntryIds: string[],
  payload: SquadLineupPayload,
): string | null {
  const roster = new Set(rosterEntryIds);
  const used = new Set<string>();
  const sets = [payload.set1, payload.set2, payload.set3];

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    if (set.length !== 2) {
      return `Set ${i + 1} must have exactly 2 players`;
    }
    if (set[0] === set[1]) {
      return `Set ${i + 1} cannot use the same player twice`;
    }
    for (const entryId of set) {
      if (!roster.has(entryId)) {
        return `Set ${i + 1} includes a player not on this team`;
      }
      if (used.has(entryId)) {
        return "Each player can only appear in one set";
      }
      used.add(entryId);
    }
  }

  if (used.size !== rosterEntryIds.length) {
    return "Every roster player must play exactly one set";
  }

  return null;
}

export function formatLineupPair(
  entryIds: string[] | null | undefined,
  entryNames: Map<string, string>,
): string {
  if (!entryIds || entryIds.length !== 2) return "—";
  const a = entryNames.get(entryIds[0]) ?? "?";
  const b = entryNames.get(entryIds[1]) ?? "?";
  return `${a} & ${b}`;
}

export type SquadRankedEntry = {
  id: string;
  name: string;
  isWoman: boolean;
  adminSkillRank: AdminSkillRank | null;
};
