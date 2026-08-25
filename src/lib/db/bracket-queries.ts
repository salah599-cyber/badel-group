import { eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  entries,
  groupMatches,
  groups,
  knockoutMatches,
  matchLineups,
  tournamentPartners,
  tournamentSponsors,
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

export async function getMatchLineupsByMatchIds(input: {
  groupMatchIds?: string[];
  knockoutMatchIds?: string[];
}) {
  if (!db) return [];
  const rows: (typeof matchLineups.$inferSelect)[] = [];

  if (input.groupMatchIds?.length) {
    const groupRows = await db
      .select()
      .from(matchLineups)
      .where(inArray(matchLineups.groupMatchId, input.groupMatchIds));
    rows.push(...groupRows);
  }

  if (input.knockoutMatchIds?.length) {
    const koRows = await db
      .select()
      .from(matchLineups)
      .where(inArray(matchLineups.knockoutMatchId, input.knockoutMatchIds));
    rows.push(...koRows);
  }

  return rows;
}

export async function getTournamentPartners(tournamentId: string) {
  if (!db) return [];
  return db
    .select()
    .from(tournamentPartners)
    .where(eq(tournamentPartners.tournamentId, tournamentId))
    .orderBy(tournamentPartners.sortOrder, tournamentPartners.name);
}

export async function getTournamentSponsors(tournamentId: string) {
  if (!db) return [];
  return db
    .select()
    .from(tournamentSponsors)
    .where(eq(tournamentSponsors.tournamentId, tournamentId))
    .orderBy(tournamentSponsors.sortOrder, tournamentSponsors.name);
}

export async function getCaptainTeamForUser(tournamentId: string, userId: string) {
  if (!db) return null;

  const teams = await db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId));

  for (const team of teams) {
    if (!team.captainEntryId) continue;
    const [entry] = await db
      .select({ userId: entries.userId })
      .from(entries)
      .where(eq(entries.id, team.captainEntryId))
      .limit(1);
    if (entry?.userId === userId) {
      return team;
    }
  }

  return null;
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
