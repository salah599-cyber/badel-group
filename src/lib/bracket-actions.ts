"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { buildGroupDraw } from "@/lib/bracket/knockout";
import {
  buildFullKnockoutTree,
  crossPairFirstRound,
  suggestKnockoutRound,
  type KnockoutRound,
} from "@/lib/bracket/knockout";
import {
  computePlacements,
  getAdvancingTeams,
  placementsToWinners,
} from "@/lib/bracket/placements";
import { generateRoundRobinPairs } from "@/lib/bracket/score";
import { deriveMatchWinner, validateSets } from "@/lib/bracket/score";
import { computeStandings } from "@/lib/bracket/standings";
import { getTournamentBracketState } from "@/lib/db/bracket-queries";
import { db } from "@/lib/db";
import { getEntriesForTournament } from "@/lib/db/queries";
import {
  entries,
  groupMatches,
  groups,
  knockoutMatches,
  results,
  tournamentTeams,
  tournaments,
  type MatchSet,
} from "@/lib/db/schema";
import {
  canManageTournament,
  type Permission,
} from "@/lib/permissions";
import {
  findManualPairPartner,
  getConfirmedTeamOptions,
} from "@/lib/tournament-teams";
import { isPartnershipTeamEntry } from "@/lib/partnerships";

function revalidateTournament(tournamentId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/results");
  revalidatePath("/rankings");
  revalidatePath("/");
  revalidatePath("/signup");
}

async function requireBracketAccess(
  tournamentId: string,
  permission: Permission = "results:manage",
) {
  const ctx = await requirePermission(permission);
  if (!db) throw new Error("Database not configured");
  if (!canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }
  return ctx;
}

function entryIdsFromTeamKey(key: string): string[] {
  if (key.startsWith("partnership:")) {
    return [key.slice("partnership:".length)];
  }
  if (key.startsWith("manual:")) {
    return key.slice("manual:".length).split(":");
  }
  return [];
}

async function autoPairRandomSolos(
  tournamentId: string,
  adminId: string,
  adminName: string,
) {
  const entriesList = await getEntriesForTournament(tournamentId);
  const approved = entriesList.filter((e) => e.status === "approved");
  const unpaired = approved.filter(
    (e) => !isPartnershipTeamEntry(e) && !findManualPairPartner(e, approved),
  );

  const shuffled = [...unpaired].sort(() => Math.random() - 0.5);
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    await db!
      .update(entries)
      .set({
        partnerEntryId: b.id,
        pairedByAdminId: adminId,
        pairedByAdminName: adminName,
      })
      .where(eq(entries.id, a.id));
    await db!
      .update(entries)
      .set({
        partnerEntryId: a.id,
        pairedByAdminId: adminId,
        pairedByAdminName: adminName,
      })
      .where(eq(entries.id, b.id));
  }
}

export async function closeRegistrationAction(tournamentId: string) {
  const ctx = await requireBracketAccess(tournamentId, "entries:manage");

  const { tournamentTypes } = await import("@/lib/db/schema");
  const [row] = await db!
    .select({
      id: tournaments.id,
      status: tournaments.status,
      pairingMode: tournamentTypes.pairingMode,
    })
    .from(tournaments)
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!row) throw new Error("Tournament not found");
  if (row.status !== "upcoming") {
    throw new Error("Registration is only open for upcoming tournaments");
  }

  if (row.pairingMode === "random") {
    await autoPairRandomSolos(tournamentId, ctx.userId, ctx.email);
  }

  const entriesAfter = await getEntriesForTournament(tournamentId);
  const teamOptions = getConfirmedTeamOptions(entriesAfter);
  const unpairedSolos = entriesAfter.filter(
    (e) =>
      e.status === "approved" &&
      !isPartnershipTeamEntry(e) &&
      !findManualPairPartner(e, entriesAfter),
  );

  if (unpairedSolos.length > 0) {
    throw new Error(
      `${unpairedSolos.length} approved player(s) still need pairing before registration can close`,
    );
  }

  if (teamOptions.length < 2) {
    throw new Error("At least 2 confirmed teams are required to close registration");
  }

  await db!
    .update(tournaments)
    .set({ status: "registration_closed" })
    .where(eq(tournaments.id, tournamentId));

  revalidateTournament(tournamentId);
}

export async function drawGroupsAction(tournamentId: string) {
  await requireBracketAccess(tournamentId);

  const [tournament] = await db!
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");
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

  const entries = await getEntriesForTournament(tournamentId);
  const options = getConfirmedTeamOptions(entries);
  if (options.length < 2) throw new Error("Need at least 2 confirmed teams");

  await db!.delete(groups).where(eq(groups.tournamentId, tournamentId));
  await db!.delete(tournamentTeams).where(eq(tournamentTeams.tournamentId, tournamentId));

  const teamIdByKey = new Map<string, string>();
  for (const option of options) {
    const [row] = await db!
      .insert(tournamentTeams)
      .values({
        tournamentId,
        label: option.label,
        entryIds: entryIdsFromTeamKey(option.key),
      })
      .returning({ id: tournamentTeams.id });
    teamIdByKey.set(option.key, row.id);
  }

  const teamIds = options.map((o) => teamIdByKey.get(o.key)!);
  const seed = Math.floor(Math.random() * 0x7fffffff);
  const draw = buildGroupDraw(teamIds, seed, tournament.teamsPerGroup);

  for (const g of draw) {
    await db!.insert(groups).values({
      tournamentId,
      label: g.label,
      teamIds: g.teamIds,
    });
  }

  await db!
    .update(tournaments)
    .set({ groupDrawSeed: seed })
    .where(eq(tournaments.id, tournamentId));

  revalidateTournament(tournamentId);
}

export async function updateGroupMembershipAction(
  tournamentId: string,
  groupsPayload: { groupId: string; teamIds: string[] }[],
) {
  await requireBracketAccess(tournamentId);

  const existingMatches = await db!
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    throw new Error("Cannot edit groups after fixtures are generated");
  }

  const allTeamIds = new Set<string>();
  for (const g of groupsPayload) {
    for (const id of g.teamIds) {
      if (allTeamIds.has(id)) throw new Error("A team cannot be in multiple groups");
      allTeamIds.add(id);
    }
    await db!
      .update(groups)
      .set({ teamIds: g.teamIds })
      .where(and(eq(groups.id, g.groupId), eq(groups.tournamentId, tournamentId)));
  }

  revalidateTournament(tournamentId);
}

export async function lockGroupsAction(tournamentId: string) {
  await requireBracketAccess(tournamentId);

  const tournamentGroups = await db!
    .select()
    .from(groups)
    .where(eq(groups.tournamentId, tournamentId));

  if (!tournamentGroups.length) {
    throw new Error("Draw groups first");
  }

  const existingMatches = await db!
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    throw new Error("Groups are already locked");
  }

  for (const g of tournamentGroups) {
    const pairs = generateRoundRobinPairs(g.teamIds);
    for (const pair of pairs) {
      await db!.insert(groupMatches).values({
        groupId: g.id,
        teamAId: pair.teamAId,
        teamBId: pair.teamBId,
        status: "scheduled",
        outcome: "played",
      });
    }
  }

  await db!
    .update(tournaments)
    .set({ status: "group_stage" })
    .where(eq(tournaments.id, tournamentId));

  revalidateTournament(tournamentId);
}

export async function saveGroupMatchScoreAction(input: {
  matchId: string;
  sets: MatchSet[];
  walkover?: boolean;
  walkoverWinnerId?: string;
}) {
  const [match] = await db!
    .select({
      id: groupMatches.id,
      groupId: groupMatches.groupId,
      teamAId: groupMatches.teamAId,
      teamBId: groupMatches.teamBId,
      tournamentId: groups.tournamentId,
    })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groupMatches.id, input.matchId))
    .limit(1);

  if (!match) throw new Error("Match not found");
  await requireBracketAccess(match.tournamentId);

  const [tournament] = await db!
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, match.tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");

  let winnerId: string | null = null;
  let outcome: "played" | "walkover" = "played";
  let sets = input.sets;

  if (input.walkover && input.walkoverWinnerId) {
    if (
      input.walkoverWinnerId !== match.teamAId &&
      input.walkoverWinnerId !== match.teamBId
    ) {
      throw new Error("Invalid walkover winner");
    }
    winnerId = input.walkoverWinnerId;
    outcome = "walkover";
    sets = [];
  } else {
    const err = validateSets(
      sets,
      tournament.matchFormat,
      tournament.superTiebreakPoints,
    );
    if (err) throw new Error(err);
    winnerId = deriveMatchWinner(
      sets,
      match.teamAId,
      match.teamBId,
      tournament.matchFormat,
    );
    if (!winnerId) throw new Error("Could not determine match winner");
  }

  await db!
    .update(groupMatches)
    .set({
      sets,
      status: "completed",
      winnerId,
      outcome,
    })
    .where(eq(groupMatches.id, input.matchId));

  revalidateTournament(match.tournamentId);
}

export async function setGroupTiebreakOverrideAction(
  groupId: string,
  manualOrder: string[],
) {
  const [group] = await db!
    .select({ tournamentId: groups.tournamentId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) throw new Error("Group not found");
  await requireBracketAccess(group.tournamentId);

  await db!
    .update(groups)
    .set({ manualTiebreakOrder: manualOrder })
    .where(eq(groups.id, groupId));

  revalidateTournament(group.tournamentId);
}

export async function configureKnockoutAction(input: {
  tournamentId: string;
  advancePerGroup: number;
  knockoutStartRound: KnockoutRound;
  thirdPlacePlayoff: boolean;
}) {
  await requireBracketAccess(input.tournamentId);

  if (input.advancePerGroup < 1) {
    throw new Error("At least 1 team must advance per group");
  }

  await db!
    .update(tournaments)
    .set({
      advancePerGroup: input.advancePerGroup,
      knockoutStartRound: input.knockoutStartRound,
      thirdPlacePlayoff: input.thirdPlacePlayoff,
    })
    .where(eq(tournaments.id, input.tournamentId));

  revalidateTournament(input.tournamentId);
}

async function resolveKnockoutFeeders(
  tournamentId: string,
  completedMatchId: string,
  winnerId: string,
  loserId: string | null,
) {
  const feeders = await db!
    .select()
    .from(knockoutMatches)
    .where(eq(knockoutMatches.tournamentId, tournamentId));

  for (const feeder of feeders) {
    const updates: Partial<typeof knockoutMatches.$inferInsert> = {};
    if (feeder.sourceA?.type === "winner" && feeder.sourceA.matchId === completedMatchId) {
      updates.teamAId = winnerId;
    }
    if (feeder.sourceB?.type === "winner" && feeder.sourceB.matchId === completedMatchId) {
      updates.teamBId = winnerId;
    }
    if (loserId && feeder.sourceA?.type === "loser" && feeder.sourceA.matchId === completedMatchId) {
      updates.teamAId = loserId;
    }
    if (loserId && feeder.sourceB?.type === "loser" && feeder.sourceB.matchId === completedMatchId) {
      updates.teamBId = loserId;
    }
    if (Object.keys(updates).length > 0) {
      await db!.update(knockoutMatches).set(updates).where(eq(knockoutMatches.id, feeder.id));
    }
  }
}

async function applyByeAdvances(tournamentId: string) {
  const matches = await db!
    .select()
    .from(knockoutMatches)
    .where(eq(knockoutMatches.tournamentId, tournamentId));

  for (const m of matches) {
    if (m.status === "completed") continue;
    const aBye = m.sourceA?.type === "bye" || (!m.teamAId && m.sourceB?.type !== "bye");
    const bBye = m.sourceB?.type === "bye" || (!m.teamBId && m.sourceA?.type !== "bye");

    if (m.teamAId && bBye && !m.teamBId) {
      await db!
        .update(knockoutMatches)
        .set({
          status: "completed",
          winnerId: m.teamAId,
          outcome: "walkover",
        })
        .where(eq(knockoutMatches.id, m.id));
      const loserId = null;
      await resolveKnockoutFeeders(tournamentId, m.id, m.teamAId, loserId);
    } else if (m.teamBId && aBye && !m.teamAId) {
      await db!
        .update(knockoutMatches)
        .set({
          status: "completed",
          winnerId: m.teamBId,
          outcome: "walkover",
        })
        .where(eq(knockoutMatches.id, m.id));
      await resolveKnockoutFeeders(tournamentId, m.id, m.teamBId, null);
    }
  }
}

export async function generateKnockoutBracketAction(tournamentId: string) {
  await requireBracketAccess(tournamentId);

  const state = await getTournamentBracketState(tournamentId);
  if (!state) throw new Error("Tournament not found");

  const { tournament, groups: tournamentGroups, groupMatches: gm } = state;
  const advancePerGroup = tournament.advancePerGroup ?? 2;
  const standingsByGroup = new Map<string, ReturnType<typeof computeStandings>>();

  for (const g of tournamentGroups) {
    const groupMs = gm.filter((m) => m.groupId === g.id);
    standingsByGroup.set(
      g.label,
      computeStandings(
        g.teamIds,
        groupMs,
        tournament.pointsWin,
        tournament.pointsLoss,
        g.manualTiebreakOrder,
      ),
    );
  }

  const advancing = getAdvancingTeams(
    tournamentGroups.map((g) => ({
      label: g.label,
      teamIds: g.teamIds,
      manualTiebreakOrder: g.manualTiebreakOrder,
    })),
    standingsByGroup,
    advancePerGroup,
  );

  const startRound =
    tournament.knockoutStartRound ??
    suggestKnockoutRound(advancing.length);

  await db!.delete(knockoutMatches).where(eq(knockoutMatches.tournamentId, tournamentId));

  const firstRound = crossPairFirstRound(advancing, startRound);
  const matchIdsByKey = new Map<string, string>();

  const firstInserted: { id: string; round: KnockoutRound; slot: number }[] = [];
  for (const m of firstRound) {
    const [row] = await db!
      .insert(knockoutMatches)
      .values({
        tournamentId,
        round: m.round,
        slot: m.slot,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        sourceA: m.sourceA,
        sourceB: m.sourceB,
        status: "scheduled",
        outcome: "played",
      })
      .returning({ id: knockoutMatches.id });
    matchIdsByKey.set(`${m.round}:${m.slot}`, row.id);
    firstInserted.push({ id: row.id, round: m.round, slot: m.slot });
  }

  const tree = buildFullKnockoutTree(
    firstRound,
    startRound,
    tournament.thirdPlacePlayoff,
    matchIdsByKey,
  );

  for (const m of tree) {
    if (m.round === startRound && m.slot < firstRound.length) continue;
    const [row] = await db!
      .insert(knockoutMatches)
      .values({
        tournamentId,
        round: m.round,
        slot: m.slot,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        sourceA: m.sourceA,
        sourceB: m.sourceB,
        status: "scheduled",
        outcome: "played",
      })
      .returning({ id: knockoutMatches.id });
    matchIdsByKey.set(`${m.round}:${m.slot}`, row.id);
  }

  await applyByeAdvances(tournamentId);

  await db!
    .update(tournaments)
    .set({ status: "knockout_stage", knockoutStartRound: startRound })
    .where(eq(tournaments.id, tournamentId));

  revalidateTournament(tournamentId);
}

async function publishTournamentResults(tournamentId: string) {
  const state = await getTournamentBracketState(tournamentId);
  if (!state) throw new Error("Tournament not found");

  const { tournament, teams, groups: tournamentGroups, groupMatches: gm, knockoutMatches: km } =
    state;

  const standingsByGroup = new Map<string, ReturnType<typeof computeStandings>>();
  for (const g of tournamentGroups) {
    const groupMs = gm.filter((m) => m.groupId === g.id);
    standingsByGroup.set(
      g.label,
      computeStandings(
        g.teamIds,
        groupMs,
        tournament.pointsWin,
        tournament.pointsLoss,
        g.manualTiebreakOrder,
      ),
    );
  }

  const advancePerGroup = tournament.advancePerGroup ?? 2;
  const advancingIds = new Set(
    getAdvancingTeams(
      tournamentGroups.map((g) => ({ label: g.label, teamIds: g.teamIds })),
      standingsByGroup,
      advancePerGroup,
    ).map((a) => a.teamId),
  );

  const placements = computePlacements({
    teams: teams.map((t) => ({ id: t.id, label: t.label })),
    groupMatches: gm,
    knockoutMatches: km,
    knockoutRounds: km.map((m) => ({
      id: m.id,
      round: m.round,
      slot: m.slot,
      winnerId: m.winnerId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
    })),
    thirdPlacePlayoff: tournament.thirdPlacePlayoff,
    advancingTeamIds: advancingIds,
    groupStandings: standingsByGroup,
  });

  const winners = placementsToWinners(placements);
  const champion = placements.find((p) => p.place === 1);

  const [existing] = await db!
    .select({ id: results.id })
    .from(results)
    .where(eq(results.tournamentId, tournamentId))
    .limit(1);

  if (existing) {
    await db!
      .update(results)
      .set({
        winners,
        tournamentName: tournament.name,
        date: tournament.date,
      })
      .where(eq(results.id, existing.id));
  } else {
    await db!.insert(results).values({
      tournamentId,
      tournamentName: tournament.name,
      date: tournament.date,
      winners,
    });
  }

  await db!
    .update(tournaments)
    .set({
      status: "completed",
      championTeamId: champion?.teamId ?? null,
    })
    .where(eq(tournaments.id, tournamentId));
}

export async function saveKnockoutMatchScoreAction(input: {
  matchId: string;
  sets: MatchSet[];
  walkover?: boolean;
  walkoverWinnerId?: string;
}) {
  const [match] = await db!
    .select()
    .from(knockoutMatches)
    .where(eq(knockoutMatches.id, input.matchId))
    .limit(1);

  if (!match) throw new Error("Match not found");
  await requireBracketAccess(match.tournamentId);

  const [tournament] = await db!
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, match.tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");

  let winnerId: string | null = null;
  let outcome: "played" | "walkover" = "played";
  let sets = input.sets;

  if (input.walkover && input.walkoverWinnerId) {
    if (
      input.walkoverWinnerId !== match.teamAId &&
      input.walkoverWinnerId !== match.teamBId
    ) {
      throw new Error("Invalid walkover winner");
    }
    winnerId = input.walkoverWinnerId;
    outcome = "walkover";
    sets = [];
  } else {
    if (!match.teamAId || !match.teamBId) {
      throw new Error("Both teams must be set before entering a score");
    }
    const err = validateSets(
      sets,
      tournament.matchFormat,
      tournament.superTiebreakPoints,
    );
    if (err) throw new Error(err);
    winnerId = deriveMatchWinner(
      sets,
      match.teamAId,
      match.teamBId,
      tournament.matchFormat,
    );
    if (!winnerId) throw new Error("Could not determine match winner");
  }

  const loserId =
    winnerId && match.teamAId && match.teamBId
      ? winnerId === match.teamAId
        ? match.teamBId
        : match.teamAId
      : null;

  await db!
    .update(knockoutMatches)
    .set({
      sets,
      status: "completed",
      winnerId,
      outcome,
    })
    .where(eq(knockoutMatches.id, input.matchId));

  await resolveKnockoutFeeders(match.tournamentId, input.matchId, winnerId!, loserId);
  await applyByeAdvances(match.tournamentId);

  if (match.round === "final" && winnerId) {
    await publishTournamentResults(match.tournamentId);
  }

  revalidateTournament(match.tournamentId);
}

export async function getKnockoutSuggestionAction(tournamentId: string) {
  await requireBracketAccess(tournamentId);
  const state = await getTournamentBracketState(tournamentId);
  if (!state) throw new Error("Tournament not found");

  const { tournament, groups: tournamentGroups, groupMatches: gm } = state;
  const advancePerGroup = tournament.advancePerGroup ?? 2;
  const standingsByGroup = new Map<string, ReturnType<typeof computeStandings>>();

  for (const g of tournamentGroups) {
    const groupMs = gm.filter((m) => m.groupId === g.id);
    standingsByGroup.set(
      g.label,
      computeStandings(
        g.teamIds,
        groupMs,
        tournament.pointsWin,
        tournament.pointsLoss,
        g.manualTiebreakOrder,
      ),
    );
  }

  const advancing = getAdvancingTeams(
    tournamentGroups.map((g) => ({ label: g.label, teamIds: g.teamIds })),
    standingsByGroup,
    advancePerGroup,
  );

  return {
    advancingCount: advancing.length,
    suggestedRound: suggestKnockoutRound(advancing.length),
  };
}
