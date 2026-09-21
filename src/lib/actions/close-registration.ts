"use server";

import { closeRegistrationCore, type CloseRegistrationResult } from "@/lib/bracket/close-registration-core";
import { requirePermission } from "@/lib/auth";
import { canManageTournament } from "@/lib/permissions";

export type { CloseRegistrationResult };

export async function closeRegistrationAction(
  tournamentId: string,
): Promise<CloseRegistrationResult> {
  try {
    const ctx = await requirePermission("results:manage");
    if (!canManageTournament(ctx, tournamentId)) {
      return { ok: false, error: "You do not have access to this tournament" };
    }

    return await closeRegistrationCore({
      tournamentId,
      adminId: ctx.userId,
      adminEmail: ctx.email,
    });
  } catch (error) {
    console.error("[close-registration-action]", error);
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      error: message || "Could not close registration. Please try again.",
    };
  }
}
