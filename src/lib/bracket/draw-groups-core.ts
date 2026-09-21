import { eq } from "drizzle-orm";
import { buildGroupDraw } from "@/lib/bracket/knockout";
import { db } from "@/lib/db";
import { getEntriesForTournament } from "@/lib/db/queries";
import { groupMatches, groups, tournamentTeams, tournaments } from "@/lib/db/schema";
import { getConfirmedTeamOptions } from "@/lib/tournament-teams";

export type DrawGroupsResult = { ok: true; groupCount: number } | { ok: false; error: string };

function fail(error: string): DrawGroupsResult {
  return { ok: false, error };
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

export async function drawGroupsCore(tournamentId: string): Promise<DrawGroupsResult> {
  if (!db) return fail("Database not configured");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return fail("Tournament not found");
  if (tournament.status !== "registration_closed" && tournament.status !== "group_stage") {
    return fail("Draw groups is only available after registration closes");
  }

  const existingMatches = await db
    .select({ id: groupMatches.id })
    .from(groupMatches)
    .innerJoin(groups, eq(groupMatches.groupId, groups.id))
    .where(eq(groups.tournamentId, tournamentId))
    .limit(1);

  if (existingMatches.length > 0) {
    return fail("Groups are already locked — cannot redraw");
  }

  const entries = await getEntriesForTournament(tournamentId);
  const options = getConfirmedTeamOptions(entries);
  if (options.length < 2) return fail("Need at least 2 confirmed teams");

  await db.delete(groups).where(eq(groups.tournamentId, tournamentId));
  await db.delete(tournamentTeams).where(eq(tournamentTeams.tournamentId, tournamentId));

  const teamIdByKey = new Map<string, string>();
  for (const option of options) {
    const [row] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId,
        label: option.label,
        entryIds: entryIdsFromTeamKey(option.key),
      })
      .returning({ id: tournamentTeams.id });
    teamIdByKey.set(option.key, row.id);
  }

  const teamIds = options.map((option) => teamIdByKey.get(option.key)!);
  const seed = Math.floor(Math.random() * 0x7fffffff);
  const draw = buildGroupDraw(teamIds, seed, tournament.teamsPerGroup);

  for (const group of draw) {
    await db.insert(groups).values({
      tournamentId,
      label: group.label,
      teamIds: group.teamIds,
    });
  }

  await db
    .update(tournaments)
    .set({ groupDrawSeed: seed })
    .where(eq(tournaments.id, tournamentId));

  return { ok: true, groupCount: draw.length };
}
