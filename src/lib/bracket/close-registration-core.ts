import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getEntriesForTournament } from "@/lib/db/queries";
import { entries, tournaments, tournamentTypes } from "@/lib/db/schema";
import { isSquadFormat } from "@/lib/competition-format";
import { isPartnershipTeamEntry } from "@/lib/partnerships";
import { isAdminSkillRank } from "@/lib/squad/constants";
import {
  countSquadApprovedPlayers,
  findManualPairPartner,
  getConfirmedTeamOptions,
  getUnpairedApprovedEntries,
} from "@/lib/tournament-teams";

export type CloseRegistrationResult = { ok: true } | { ok: false; error: string };

function fail(error: string): CloseRegistrationResult {
  return { ok: false, error };
}

async function autoPairRandomSolos(
  tournamentId: string,
  adminId: string,
  adminName: string,
) {
  if (!db) throw new Error("Database not configured");

  const entriesList = await getEntriesForTournament(tournamentId);
  const approved = entriesList.filter((entry) => entry.status === "approved");
  const unpaired = approved.filter(
    (entry) => !isPartnershipTeamEntry(entry) && !findManualPairPartner(entry, approved),
  );

  const shuffled = [...unpaired].sort(() => Math.random() - 0.5);
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    await db
      .update(entries)
      .set({
        partnerEntryId: b.id,
        pairedByAdminId: adminId,
        pairedByAdminName: adminName,
      })
      .where(eq(entries.id, a.id));
    await db
      .update(entries)
      .set({
        partnerEntryId: a.id,
        pairedByAdminId: adminId,
        pairedByAdminName: adminName,
      })
      .where(eq(entries.id, b.id));
  }
}

export async function closeRegistrationCore(input: {
  tournamentId: string;
  adminId: string;
  adminEmail: string;
}): Promise<CloseRegistrationResult> {
  if (!db) return fail("Database not configured");

  const [row] = await db
    .select({
      id: tournaments.id,
      status: tournaments.status,
      pairingMode: tournamentTypes.pairingMode,
      competitionFormat: tournamentTypes.competitionFormat,
      maxPlayers: tournaments.maxPlayers,
    })
    .from(tournaments)
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);

  if (!row) return fail("Tournament not found");
  if (row.status !== "upcoming") {
    return fail("Registration is only open for upcoming tournaments");
  }

  if (isSquadFormat(row.competitionFormat)) {
    const entriesAfter = await getEntriesForTournament(input.tournamentId);
    const approvedCount = countSquadApprovedPlayers(entriesAfter);
    if (approvedCount !== row.maxPlayers) {
      return fail(
        `Need exactly ${row.maxPlayers} approved players before closing registration (${approvedCount} now)`,
      );
    }

    const missingRank = entriesAfter.filter(
      (entry) => entry.status === "approved" && !isAdminSkillRank(entry.adminSkillRank),
    );
    if (missingRank.length > 0) {
      return fail(`${missingRank.length} approved player(s) still need an admin skill rank`);
    }
  } else {
    if (row.pairingMode === "random") {
      await autoPairRandomSolos(input.tournamentId, input.adminId, input.adminEmail);
    }

    const entriesAfter = await getEntriesForTournament(input.tournamentId);
    const teamOptions = getConfirmedTeamOptions(entriesAfter);
    const unpairedSolos = getUnpairedApprovedEntries(entriesAfter);

    if (unpairedSolos.length > 0) {
      return fail(
        `${unpairedSolos.length} approved player(s) still need pairing before registration can close. Use Player Pairing on the admin panel.`,
      );
    }

    if (teamOptions.length < 2) {
      return fail("At least 2 confirmed teams are required to close registration");
    }
  }

  try {
    await db
      .update(tournaments)
      .set({ status: "registration_closed" })
      .where(eq(tournaments.id, input.tournamentId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9848f0'},body:JSON.stringify({sessionId:'9848f0',location:'close-registration-core.ts:update',message:'status update failed',data:{message},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (message.includes("invalid input value for enum")) {
      return fail(
        "This database is missing a required tournament status. Run migrations and try again.",
      );
    }
    console.error("[close-registration]", error);
    return fail(message || "Could not update tournament status");
  }

  return { ok: true };
}
