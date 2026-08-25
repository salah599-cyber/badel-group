"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireApprovedUser, requirePermission } from "@/lib/auth";
import {
  deriveSquadMatchWinner,
  validateSquadMatchSets,
} from "@/lib/bracket/score";
import { buildGroupDraw } from "@/lib/bracket/knockout";
import { isSquadFormat } from "@/lib/competition-format";
import { db } from "@/lib/db";
import {
  getEntriesForTournament,
  getTournamentById,
  getTournamentCompetitionFormat,
} from "@/lib/db/queries";
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
} from "@/lib/db/schema";
import { canManageTournament } from "@/lib/permissions";
import {
  ADMIN_SKILL_RANKS,
  DEFAULT_SQUAD_TEAM_COUNT,
  isAdminSkillRank,
} from "@/lib/squad/constants";
import {
  lineupToEntryIds,
  validateSquadLineup,
  type SquadLineupPayload,
} from "@/lib/squad/lineups";
import {
  balanceSquads,
  defaultSquadTeamLabel,
  type SquadPlayerInput,
} from "@/lib/squad/squad-balance";

function revalidateSquadTournament(tournamentId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/team`);
  revalidatePath("/");
  revalidatePath("/signup");
}

async function requireSquadAccess(tournamentId: string) {
  const ctx = await requirePermission("results:manage");
  if (!db) throw new Error("Database not configured");
  if (!canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  const format = await getTournamentCompetitionFormat(tournamentId);
  if (!isSquadFormat(format)) {
    throw new Error("This action is only available for squad tournaments");
  }

  return ctx;
}

async function getSquadTournament(tournamentId: string) {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Tournament not found");
  if (!isSquadFormat(tournament.competitionFormat)) {
    throw new Error("This action is only available for squad tournaments");
  }
  return tournament;
}

async function assertLineupUnlocked(matchId: string, type: "group" | "knockout") {
  if (type === "group") {
    const [match] = await db!
      .select({ status: groupMatches.status })
      .from(groupMatches)
      .where(eq(groupMatches.id, matchId))
      .limit(1);
    if (match?.status === "completed") {
      throw new Error("Lineups are locked after the match is scored");
    }
    return;
  }

  const [match] = await db!
    .select({ status: knockoutMatches.status })
    .from(knockoutMatches)
    .where(eq(knockoutMatches.id, matchId))
    .limit(1);
  if (match?.status === "completed") {
    throw new Error("Lineups are locked after the match is scored");
  }
}

export async function updateEntryRankAction(input: {
  entryId: string;
  adminSkillRank: string | null;
  isWoman: boolean;
}) {
  if (!db) throw new Error("Database not configured");

  const [entry] = await db
    .select({ tournamentId: entries.tournamentId })
    .from(entries)
    .where(eq(entries.id, input.entryId))
    .limit(1);

  if (!entry) throw new Error("Entry not found");
  await requireSquadAccess(entry.tournamentId);

  if (input.adminSkillRank && !isAdminSkillRank(input.adminSkillRank)) {
    throw new Error("Invalid skill rank");
  }

  await db
    .update(entries)
    .set({
      adminSkillRank: input.adminSkillRank,
      isWoman: input.isWoman,
    })
    .where(eq(entries.id, input.entryId));

  revalidateSquadTournament(entry.tournamentId);
}

export async function formSquadsAction(tournamentId: string, seed?: number) {
  await requireSquadAccess(tournamentId);
  const tournament = await getSquadTournament(tournamentId);

  if (tournament.status !== "registration_closed" && tournament.status !== "upcoming") {
    throw new Error("Squads can only be formed before the group stage starts");
  }

  const existingMatches = await db!
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    throw new Error("Cannot re-form squads after fixtures are generated");
  }

  const allEntries = await getEntriesForTournament(tournamentId);
  const approved = allEntries.filter((e) => e.status === "approved");
  const teamCount = DEFAULT_SQUAD_TEAM_COUNT;
  const rosterSize = tournament.rosterSize ?? 6;
  const expectedPlayers = teamCount * rosterSize;

  if (approved.length !== expectedPlayers) {
    throw new Error(`Need exactly ${expectedPlayers} approved players (${approved.length} now)`);
  }

  const missingRank = approved.filter((e) => !isAdminSkillRank(e.adminSkillRank));
  if (missingRank.length > 0) {
    throw new Error(`${missingRank.length} player(s) still need an admin skill rank`);
  }

  const drawSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const players: SquadPlayerInput[] = approved.map((entry) => ({
    entryId: entry.id,
    adminSkillRank: entry.adminSkillRank as SquadPlayerInput["adminSkillRank"],
    isWoman: Boolean(entry.isWoman),
  }));

  const teamEntryIds = balanceSquads(players, drawSeed, teamCount, rosterSize);

  await db!.delete(tournamentTeams).where(eq(tournamentTeams.tournamentId, tournamentId));
  await db!.delete(groups).where(eq(groups.tournamentId, tournamentId));

  for (let i = 0; i < teamEntryIds.length; i++) {
    const roster = teamEntryIds[i];
    await db!.insert(tournamentTeams).values({
      tournamentId,
      label: defaultSquadTeamLabel(i),
      entryIds: roster,
      captainEntryId: roster[0] ?? null,
    });
  }

  await db!
    .update(tournaments)
    .set({ groupDrawSeed: drawSeed })
    .where(eq(tournaments.id, tournamentId));

  revalidateSquadTournament(tournamentId);
}

export async function updateSquadTeamAction(input: {
  teamId: string;
  label?: string;
  captainEntryId?: string | null;
  entryIds?: string[];
}) {
  if (!db) throw new Error("Database not configured");

  const [team] = await db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.id, input.teamId))
    .limit(1);

  if (!team) throw new Error("Team not found");
  await requireSquadAccess(team.tournamentId);

  const tournament = await getSquadTournament(team.tournamentId);
  const rosterSize = tournament.rosterSize ?? 6;

  if (input.entryIds) {
    if (input.entryIds.length !== rosterSize) {
      throw new Error(`Each team must have exactly ${rosterSize} players`);
    }
    if (new Set(input.entryIds).size !== input.entryIds.length) {
      throw new Error("Duplicate players in team roster");
    }
  }

  if (input.captainEntryId) {
    const roster = input.entryIds ?? team.entryIds;
    if (!roster.includes(input.captainEntryId)) {
      throw new Error("Captain must be on the team roster");
    }
  }

  await db
    .update(tournamentTeams)
    .set({
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.captainEntryId !== undefined ? { captainEntryId: input.captainEntryId } : {}),
      ...(input.entryIds !== undefined ? { entryIds: input.entryIds } : {}),
    })
    .where(eq(tournamentTeams.id, input.teamId));

  revalidateSquadTournament(team.tournamentId);
}

export async function swapSquadPlayersAction(input: {
  tournamentId: string;
  entryIdA: string;
  entryIdB: string;
}) {
  await requireSquadAccess(input.tournamentId);

  const teams = await db!
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, input.tournamentId));

  const teamA = teams.find((team) => team.entryIds.includes(input.entryIdA));
  const teamB = teams.find((team) => team.entryIds.includes(input.entryIdB));

  if (!teamA || !teamB) throw new Error("Both players must be assigned to teams");
  if (teamA.id === teamB.id) throw new Error("Choose players from different teams");

  const nextA = teamA.entryIds.map((id) => (id === input.entryIdA ? input.entryIdB : id));
  const nextB = teamB.entryIds.map((id) => (id === input.entryIdB ? input.entryIdA : id));

  await db!.update(tournamentTeams).set({ entryIds: nextA }).where(eq(tournamentTeams.id, teamA.id));
  await db!.update(tournamentTeams).set({ entryIds: nextB }).where(eq(tournamentTeams.id, teamB.id));

  if (teamA.captainEntryId === input.entryIdA) {
    await db!
      .update(tournamentTeams)
      .set({ captainEntryId: input.entryIdB })
      .where(eq(tournamentTeams.id, teamA.id));
  }
  if (teamB.captainEntryId === input.entryIdB) {
    await db!
      .update(tournamentTeams)
      .set({ captainEntryId: input.entryIdA })
      .where(eq(tournamentTeams.id, teamB.id));
  }

  revalidateSquadTournament(input.tournamentId);
}

export async function drawSquadGroupsAction(tournamentId: string) {
  await requireSquadAccess(tournamentId);
  const tournament = await getSquadTournament(tournamentId);

  if (
    tournament.status !== "registration_closed" &&
    tournament.status !== "group_stage"
  ) {
    throw new Error("Draw groups is only available after registration closes");
  }

  const existingMatches = await db!
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    throw new Error("Groups are already locked — cannot redraw");
  }

  const teams = await db!
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId));

  if (teams.length !== DEFAULT_SQUAD_TEAM_COUNT) {
    throw new Error(`Form ${DEFAULT_SQUAD_TEAM_COUNT} squads before drawing groups`);
  }

  await db!.delete(groups).where(eq(groups.tournamentId, tournamentId));

  const teamIds = teams.map((team) => team.id);
  const seed = tournament.groupDrawSeed ?? Math.floor(Math.random() * 0x7fffffff);
  const draw = buildGroupDraw(teamIds, seed, tournament.teamsPerGroup ?? 4);

  for (const group of draw) {
    await db!.insert(groups).values({
      tournamentId,
      label: group.label,
      teamIds: group.teamIds,
    });
  }

  await db!
    .update(tournaments)
    .set({ groupDrawSeed: seed })
    .where(eq(tournaments.id, tournamentId));

  revalidateSquadTournament(tournamentId);
}

export async function saveMatchLineupAction(input: {
  tournamentId: string;
  teamId: string;
  groupMatchId?: string;
  knockoutMatchId?: string;
  lineup: SquadLineupPayload;
  asAdmin?: boolean;
}) {
  if (!db) throw new Error("Database not configured");
  if (!input.groupMatchId && !input.knockoutMatchId) {
    throw new Error("Match reference is required");
  }

  await getSquadTournament(input.tournamentId);

  const [team] = await db
    .select()
    .from(tournamentTeams)
    .where(
      and(eq(tournamentTeams.id, input.teamId), eq(tournamentTeams.tournamentId, input.tournamentId)),
    )
    .limit(1);

  if (!team) throw new Error("Team not found");

  let submittedByUserId: string | null = null;
  const isAdminOverride = Boolean(input.asAdmin);

  if (input.asAdmin) {
    await requireSquadAccess(input.tournamentId);
  } else {
    const user = await requireApprovedUser();
    if (!team.captainEntryId) {
      throw new Error("No captain assigned for this team");
    }
    const [captainEntry] = await db
      .select({ userId: entries.userId })
      .from(entries)
      .where(eq(entries.id, team.captainEntryId))
      .limit(1);
    if (captainEntry?.userId !== user.id) {
      throw new Error("Only the team captain can submit lineups");
    }
    submittedByUserId = user.id;
  }

  if (input.groupMatchId) {
    await assertLineupUnlocked(input.groupMatchId, "group");
  } else if (input.knockoutMatchId) {
    await assertLineupUnlocked(input.knockoutMatchId, "knockout");
  }

  const lineupError = validateSquadLineup(team.entryIds, input.lineup);
  if (lineupError) throw new Error(lineupError);

  const payload = lineupToEntryIds(input.lineup);
  const matchFilter = input.groupMatchId
    ? and(eq(matchLineups.groupMatchId, input.groupMatchId), eq(matchLineups.teamId, input.teamId))
    : and(
        eq(matchLineups.knockoutMatchId, input.knockoutMatchId!),
        eq(matchLineups.teamId, input.teamId),
      );

  const [existing] = await db
    .select({ id: matchLineups.id })
    .from(matchLineups)
    .where(matchFilter)
    .limit(1);

  if (existing) {
    await db
      .update(matchLineups)
      .set({
        ...payload,
        submittedByUserId,
        submittedAt: new Date(),
        isAdminOverride,
      })
      .where(eq(matchLineups.id, existing.id));
  } else {
    await db.insert(matchLineups).values({
      groupMatchId: input.groupMatchId ?? null,
      knockoutMatchId: input.knockoutMatchId ?? null,
      teamId: input.teamId,
      ...payload,
      submittedByUserId,
      submittedAt: new Date(),
      isAdminOverride,
    });
  }

  revalidateSquadTournament(input.tournamentId);
}

export async function saveSquadGroupMatchScoreAction(input: {
  matchId: string;
  sets: MatchSet[];
  walkover?: boolean;
  walkoverWinnerId?: string;
}) {
  if (!db) throw new Error("Database not configured");

  const [match] = await db!
    .select({
      id: groupMatches.id,
      teamAId: groupMatches.teamAId,
      teamBId: groupMatches.teamBId,
      tournamentId: groups.tournamentId,
    })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groupMatches.id, input.matchId))
    .limit(1);

  if (!match) throw new Error("Match not found");
  await requireSquadAccess(match.tournamentId);

  let winnerId: string | null = null;
  let outcome: "played" | "walkover" = "played";
  let sets = input.sets;

  if (input.walkover && input.walkoverWinnerId) {
    winnerId = input.walkoverWinnerId;
    outcome = "walkover";
    sets = [];
  } else {
    const err = validateSquadMatchSets(sets);
    if (err) throw new Error(err);
    winnerId = deriveSquadMatchWinner(sets, match.teamAId, match.teamBId);
    if (!winnerId) throw new Error("Could not determine match winner");
  }

  await db!
    .update(groupMatches)
    .set({ sets, status: "completed", winnerId, outcome })
    .where(eq(groupMatches.id, input.matchId));

  revalidateSquadTournament(match.tournamentId);
}

export async function saveSquadKnockoutMatchScoreAction(input: {
  matchId: string;
  sets: MatchSet[];
  walkover?: boolean;
  walkoverWinnerId?: string;
}) {
  if (!db) throw new Error("Database not configured");

  const [match] = await db!
    .select()
    .from(knockoutMatches)
    .where(eq(knockoutMatches.id, input.matchId))
    .limit(1);

  if (!match) throw new Error("Match not found");
  await requireSquadAccess(match.tournamentId);

  let winnerId: string | null = null;
  let outcome: "played" | "walkover" = "played";
  let sets = input.sets;

  if (input.walkover && input.walkoverWinnerId) {
    winnerId = input.walkoverWinnerId;
    outcome = "walkover";
    sets = [];
  } else {
    if (!match.teamAId || !match.teamBId) {
      throw new Error("Both teams must be set before entering a score");
    }
    const err = validateSquadMatchSets(sets);
    if (err) throw new Error(err);
    winnerId = deriveSquadMatchWinner(sets, match.teamAId, match.teamBId);
    if (!winnerId) throw new Error("Could not determine match winner");
  }

  await db!
    .update(knockoutMatches)
    .set({ sets, status: "completed", winnerId, outcome })
    .where(eq(knockoutMatches.id, input.matchId));

  revalidateSquadTournament(match.tournamentId);
}

export async function addTournamentPartnerAction(input: {
  tournamentId: string;
  name: string;
  logoUrl: string;
  website?: string | null;
}) {
  const ctx = await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");
  if (!canManageTournament(ctx, input.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  await db.insert(tournamentPartners).values({
    tournamentId: input.tournamentId,
    name: input.name.trim(),
    logoUrl: input.logoUrl,
    website: input.website?.trim() || null,
  });

  revalidateSquadTournament(input.tournamentId);
}

export async function deleteTournamentPartnerAction(partnerId: string) {
  if (!db) throw new Error("Database not configured");
  const [partner] = await db
    .select({ tournamentId: tournamentPartners.tournamentId })
    .from(tournamentPartners)
    .where(eq(tournamentPartners.id, partnerId))
    .limit(1);
  if (!partner) throw new Error("Partner not found");

  const ctx = await requirePermission("tournaments:manage");
  if (!canManageTournament(ctx, partner.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  await db.delete(tournamentPartners).where(eq(tournamentPartners.id, partnerId));
  revalidateSquadTournament(partner.tournamentId);
}

export async function addTournamentSponsorAction(input: {
  tournamentId: string;
  name: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  logoUrl: string;
  website?: string | null;
  linkType?: "website" | "instagram";
}) {
  const ctx = await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");
  if (!canManageTournament(ctx, input.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  await db.insert(tournamentSponsors).values({
    tournamentId: input.tournamentId,
    name: input.name.trim(),
    tier: input.tier,
    logoUrl: input.logoUrl,
    website: input.website?.trim() || null,
    linkType: input.linkType ?? "website",
  });

  revalidateSquadTournament(input.tournamentId);
}

export async function deleteTournamentSponsorAction(sponsorId: string) {
  if (!db) throw new Error("Database not configured");
  const [sponsor] = await db
    .select({ tournamentId: tournamentSponsors.tournamentId })
    .from(tournamentSponsors)
    .where(eq(tournamentSponsors.id, sponsorId))
    .limit(1);
  if (!sponsor) throw new Error("Sponsor not found");

  const ctx = await requirePermission("tournaments:manage");
  if (!canManageTournament(ctx, sponsor.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  await db.delete(tournamentSponsors).where(eq(tournamentSponsors.id, sponsorId));
  revalidateSquadTournament(sponsor.tournamentId);
}

export { ADMIN_SKILL_RANKS };
