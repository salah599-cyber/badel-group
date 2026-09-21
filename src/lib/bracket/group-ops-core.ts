import { and, eq } from "drizzle-orm";
import { generateRoundRobinPairs } from "@/lib/bracket/score";
import { db } from "@/lib/db";
import { groupMatches, groups, tournaments } from "@/lib/db/schema";

export type GroupOpsResult = { ok: true } | { ok: false; error: string };

function fail(error: string): GroupOpsResult {
  return { ok: false, error };
}

export async function updateGroupMembershipCore(
  tournamentId: string,
  groupsPayload: { groupId: string; teamIds: string[] }[],
): Promise<GroupOpsResult> {
  if (!db) return fail("Database not configured");
  if (!Array.isArray(groupsPayload) || groupsPayload.length === 0) {
    return fail("Group assignments are required");
  }

  const existingMatches = await db
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    return fail("Cannot edit groups after fixtures are generated");
  }

  const allTeamIds = new Set<string>();
  for (const group of groupsPayload) {
    if (!group.groupId) return fail("Each group needs an id");
    for (const id of group.teamIds ?? []) {
      if (allTeamIds.has(id)) return fail("A team cannot be in multiple groups");
      allTeamIds.add(id);
    }
    await db
      .update(groups)
      .set({ teamIds: group.teamIds ?? [] })
      .where(and(eq(groups.id, group.groupId), eq(groups.tournamentId, tournamentId)));
  }

  return { ok: true };
}

export async function lockGroupsCore(tournamentId: string): Promise<GroupOpsResult> {
  if (!db) return fail("Database not configured");

  const tournamentGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.tournamentId, tournamentId));

  if (!tournamentGroups.length) {
    return fail("Draw groups first");
  }

  const existingMatches = await db
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    return fail("Groups are already locked");
  }

  for (const group of tournamentGroups) {
    const pairs = generateRoundRobinPairs(group.teamIds);
    for (const pair of pairs) {
      await db.insert(groupMatches).values({
        groupId: group.id,
        teamAId: pair.teamAId,
        teamBId: pair.teamBId,
        status: "scheduled",
        outcome: "played",
      });
    }
  }

  await db
    .update(tournaments)
    .set({ status: "group_stage" })
    .where(eq(tournaments.id, tournamentId));

  return { ok: true };
}
