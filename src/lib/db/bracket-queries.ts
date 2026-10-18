import { and, eq, inArray } from "drizzle-orm";
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

  const [teams, tournamentGroups, koMatches] = await Promise.all([
    db.select().from(tournamentTeams).where(eq(tournamentTeams.tournamentId, tournamentId)),
    db.select().from(groups).where(eq(groups.tournamentId, tournamentId)),
    db.select().from(knockoutMatches).where(eq(knockoutMatches.tournamentId, tournamentId)),
  ]);

  const groupIds = tournamentGroups.map((group) => group.id);
  const groupMatchesList = groupIds.length
    ? await db.select().from(groupMatches).where(inArray(groupMatches.groupId, groupIds))
    : [];

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
  try {
    return await db
      .select()
      .from(tournamentPartners)
      .where(eq(tournamentPartners.tournamentId, tournamentId))
      .orderBy(tournamentPartners.sortOrder, tournamentPartners.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("does not exist")) {
      console.warn("[getTournamentPartners] Table missing:", error);
      return [];
    }
    throw error;
  }
}

export async function getTournamentSponsors(tournamentId: string) {
  if (!db) return [];

  try {
    return await db
      .select()
      .from(tournamentSponsors)
      .where(eq(tournamentSponsors.tournamentId, tournamentId))
      .orderBy(tournamentSponsors.sortOrder, tournamentSponsors.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[getTournamentSponsors] Query failed:", error);

    if (message.includes("tournament_sponsors") && message.includes("does not exist")) {
      return [];
    }

    if (!message.includes("link_type")) {
      throw error;
    }

    try {
      const rows = await db
        .select({
          id: tournamentSponsors.id,
          tournamentId: tournamentSponsors.tournamentId,
          name: tournamentSponsors.name,
          tier: tournamentSponsors.tier,
          logoUrl: tournamentSponsors.logoUrl,
          website: tournamentSponsors.website,
          sortOrder: tournamentSponsors.sortOrder,
          createdAt: tournamentSponsors.createdAt,
        })
        .from(tournamentSponsors)
        .where(eq(tournamentSponsors.tournamentId, tournamentId))
        .orderBy(tournamentSponsors.sortOrder, tournamentSponsors.name);
      return rows.map((row) => ({ ...row, linkType: "website" as const }));
    } catch (fallbackError) {
      console.warn("[getTournamentSponsors] Fallback query failed:", fallbackError);
      return [];
    }
  }
}

export async function getCaptainTeamForUser(tournamentId: string, userId: string) {
  if (!db) return null;

  const [row] = await db
    .select({ team: tournamentTeams })
    .from(tournamentTeams)
    .innerJoin(entries, eq(tournamentTeams.captainEntryId, entries.id))
    .where(and(eq(tournamentTeams.tournamentId, tournamentId), eq(entries.userId, userId)))
    .limit(1);

  return row?.team ?? null;
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
