import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  groupMatches,
  groups,
  knockoutMatches,
  tournamentTeams,
  tournaments,
  type MatchSet,
  type KnockoutSource,
} from "./schema";

export async function getTournamentBracketState(tournamentId: string) {
  if (!db) return null;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return null;

  const teams = await db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId));

  const tournamentGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.tournamentId, tournamentId));

  const groupMatchesList: (typeof groupMatches.$inferSelect)[] = [];
  for (const g of tournamentGroups) {
    const ms = await db.select().from(groupMatches).where(eq(groupMatches.groupId, g.id));
    groupMatchesList.push(...ms);
  }

  const koMatches = await db
    .select()
    .from(knockoutMatches)
    .where(eq(knockoutMatches.tournamentId, tournamentId));

  return {
    tournament,
    teams,
    groups: tournamentGroups,
    groupMatches: groupMatchesList,
    knockoutMatches: koMatches,
  };
}

export async function getTournamentIdsWithBracket() {
  if (!db) return [];
  const rows = await db.select({ tournamentId: groups.tournamentId }).from(groups);
  return [...new Set(rows.map((r) => r.tournamentId))];
}

export async function hasBracketForTournament(tournamentId: string) {
  if (!db) return false;
  const rows = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);
  return rows.length > 0;
}

export type BracketTeamRow = {
  id: string;
  tournamentId: string;
  label: string;
  entryIds: string[];
};

export type GroupRow = {
  id: string;
  tournamentId: string;
  label: string;
  teamIds: string[];
  manualTiebreakOrder: string[] | null;
};

export type GroupMatchRow = {
  id: string;
  groupId: string;
  teamAId: string;
  teamBId: string;
  sets: MatchSet[];
  status: "scheduled" | "completed";
  winnerId: string | null;
  outcome: "played" | "walkover";
};

export type KnockoutMatchRow = {
  id: string;
  tournamentId: string;
  round: string;
  slot: number;
  teamAId: string | null;
  teamBId: string | null;
  sourceA: KnockoutSource | null;
  sourceB: KnockoutSource | null;
  sets: MatchSet[];
  status: "scheduled" | "completed";
  winnerId: string | null;
  outcome: "played" | "walkover";
};
