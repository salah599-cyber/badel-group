"use server";

import { auth } from "@clerk/nextjs/server";
import { getAdminContext } from "@/lib/auth";
import { getCaptainTeamForUser } from "@/lib/db/bracket-queries";
import { canManageTournament, hasPermission } from "@/lib/permissions";

export async function canEditTournamentScoresAction(tournamentId: string): Promise<boolean> {
  try {
    const ctx = await getAdminContext();
    if (!ctx) return false;
    return hasPermission(ctx, "results:manage") && canManageTournament(ctx, tournamentId);
  } catch (error) {
    console.error("[live-access] score edit check failed", error);
    return false;
  }
}

export async function getCaptainTeamLabelAction(
  tournamentId: string,
): Promise<{ label: string } | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const team = await getCaptainTeamForUser(tournamentId, userId);
    if (!team) return null;
    return { label: team.label };
  } catch (error) {
    console.error("[live-access] captain lookup failed", error);
    return null;
  }
}
