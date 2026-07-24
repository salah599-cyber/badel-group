import { hasManualPairLink, isPartnershipTeamEntry } from "@/lib/partnerships";
import type { Entry } from "@/lib/types";

const ACTIVE_ENTRY_STATUSES = new Set(["pending", "approved", "waitlisted"]);

export function isActiveEntryStatus(status: string) {
  return ACTIVE_ENTRY_STATUSES.has(status);
}

export function findManualPairPartner(entry: Entry, tournamentEntries: Entry[]): Entry | null {
  if (!hasManualPairLink(entry, tournamentEntries)) return null;

  const partnerId = entry.partnerEntryId;
  if (partnerId) {
    return tournamentEntries.find((other) => other.id === partnerId) ?? null;
  }

  return tournamentEntries.find((other) => other.partnerEntryId === entry.id) ?? null;
}

export function isPartnershipTeamForUsers(
  entry: Entry,
  userIdA: string | null | undefined,
  userIdB: string | null | undefined,
) {
  if (!isPartnershipTeamEntry(entry) || !userIdA || !userIdB) return false;
  const primaryId = entry.userId;
  const partnerId = entry.partnerUserId;
  if (!primaryId || !partnerId) return false;
  return (
    (primaryId === userIdA && partnerId === userIdB) ||
    (primaryId === userIdB && partnerId === userIdA)
  );
}

export function isManualPairCoveredByPartnership(
  entryA: Entry,
  entryB: Entry,
  partnershipTeams: Entry[],
) {
  return partnershipTeams.some((team) =>
    isPartnershipTeamForUsers(team, entryA.userId, entryB.userId),
  );
}

/** Each approved entry row or linked pair counts as one team slot. */
export function countConfirmedTeams(tournamentEntries: Entry[]) {
  const approved = tournamentEntries.filter((entry) => entry.status === "approved");
  const seen = new Set<string>();
  let teams = 0;

  for (const entry of approved) {
    if (seen.has(entry.id)) continue;

    if (isPartnershipTeamEntry(entry)) {
      teams += 1;
      continue;
    }

    const partner = findManualPairPartner(entry, approved);
    if (partner) {
      seen.add(entry.id);
      seen.add(partner.id);
      teams += 1;
      continue;
    }

    teams += 1;
  }

  return teams;
}

export function getPairedTeamDisplayEntries(tournamentEntries: Entry[]) {
  const partnershipTeams = tournamentEntries.filter((entry) => isPartnershipTeamEntry(entry));

  const manualPairs: { a: Entry; b: Entry }[] = [];
  const seen = new Set<string>();

  for (const entry of tournamentEntries) {
    if (seen.has(entry.id) || isPartnershipTeamEntry(entry) || !hasManualPairLink(entry, tournamentEntries)) {
      continue;
    }

    const partner = findManualPairPartner(entry, tournamentEntries);
    if (!partner) continue;

    if (isManualPairCoveredByPartnership(entry, partner, partnershipTeams)) {
      continue;
    }

    seen.add(entry.id);
    seen.add(partner.id);
    manualPairs.push({ a: entry, b: partner });
  }

  return { partnershipTeams, manualPairs };
}

export function entryRepresentsTeam(entry: Entry, allEntries: Entry[]) {
  if (isPartnershipTeamEntry(entry)) return true;
  if (entry.signupMode === "with_partner" && entry.partnerName) return true;
  return hasManualPairLink(entry, allEntries);
}

export function userHasActiveTeamMembership(
  userId: string,
  userEmail: string | undefined,
  allEntries: Entry[],
) {
  const normalizedEmail = userEmail?.trim().toLowerCase();

  return allEntries.some((entry) => {
    if (!isActiveEntryStatus(entry.status)) return false;

    const isPrimary = entry.userId === userId;
    const isNamedPartner =
      entry.partnerUserId === userId ||
      Boolean(normalizedEmail && entry.partnerEmail?.toLowerCase() === normalizedEmail);

    if (!isPrimary && !isNamedPartner) return false;

    return isPartnershipTeamEntry(entry) || entry.signupMode === "with_partner";
  });
}

export function userCanWithdrawSolo(
  entry: Entry,
  userId: string,
  allEntries: Entry[],
  userEmail?: string,
) {
  if (entry.userId !== userId) return false;
  if (isPartnershipTeamEntry(entry)) return false;

  if (entry.signupMode === "with_partner") {
    const otherPartnershipRows = allEntries.filter((other) => {
      if (other.id === entry.id || !isActiveEntryStatus(other.status)) return false;
      if (other.signupMode !== "with_partner" && !isPartnershipTeamEntry(other)) return false;

      const sharesPartner =
        (entry.partnerUserId && other.partnerUserId === entry.partnerUserId) ||
        (entry.partnerUserId && other.userId === entry.partnerUserId) ||
        (other.partnerUserId && other.partnerUserId === userId) ||
        (other.userId === userId && other.id !== entry.id);

      return sharesPartner || other.userId === userId || other.partnerUserId === userId;
    });

    return otherPartnershipRows.length > 0;
  }

  if (userHasActiveTeamMembership(userId, userEmail, allEntries)) {
    return true;
  }

  return !hasManualPairLink(entry, allEntries);
}

export function userCanWithdrawTeam(
  entry: Entry,
  userId: string,
  userEmail: string | undefined,
  allEntries: Entry[],
) {
  const normalizedEmail = userEmail?.trim().toLowerCase();
  const isPrimary = entry.userId === userId;
  const isNamedPartner =
    entry.partnerUserId === userId ||
    Boolean(normalizedEmail && entry.partnerEmail?.toLowerCase() === normalizedEmail);

  if (!isPrimary && !isNamedPartner) return false;

  if (isPartnershipTeamEntry(entry) || entry.signupMode === "with_partner") {
    return true;
  }

  return hasManualPairLink(entry, allEntries);
}

export type ConsolidatedRegistration = {
  tournamentId: string;
  tournamentName: string;
  status: string;
  teamLabel: string;
  teamEntryId: string | null;
  soloEntryId: string | null;
  canCancelTeam: boolean;
  canCancelSolo: boolean;
};

function userTouchesEntry(
  entry: Entry,
  userId: string,
  userEmail: string | undefined,
): boolean {
  const normalizedEmail = userEmail?.trim().toLowerCase();
  return (
    entry.userId === userId ||
    entry.partnerUserId === userId ||
    Boolean(normalizedEmail && entry.email.toLowerCase() === normalizedEmail) ||
    Boolean(normalizedEmail && entry.partnerEmail?.toLowerCase() === normalizedEmail)
  );
}

function teamLabelForEntry(entry: Entry, entriesForTournament: Entry[]) {
  if ((isPartnershipTeamEntry(entry) || entry.signupMode === "with_partner") && entry.partnerName) {
    return [entry.name, entry.partnerName].sort((a, b) => a.localeCompare(b)).join(" + ");
  }
  const manualPartner = findManualPairPartner(entry, entriesForTournament);
  if (manualPartner) {
    return [entry.name, manualPartner.name].sort((a, b) => a.localeCompare(b)).join(" + ");
  }
  return entry.name;
}

export function consolidateRegistrationsForUser(
  registrations: Entry[],
  tournamentEntries: Entry[],
  userId: string,
  userEmail: string,
): ConsolidatedRegistration[] {
  const tournamentIds = [
    ...new Set(registrations.map((entry) => entry.tournamentId).filter(Boolean) as string[]),
  ];

  return tournamentIds.map((tournamentId) => {
    const userEntries = registrations.filter((entry) => entry.tournamentId === tournamentId);
    const entriesForTournament = tournamentEntries.filter(
      (entry) => entry.tournamentId === tournamentId,
    );

    const teamCandidates = entriesForTournament.filter(
      (entry) =>
        userTouchesEntry(entry, userId, userEmail) &&
        (isPartnershipTeamEntry(entry) ||
          entry.signupMode === "with_partner" ||
          hasManualPairLink(entry, entriesForTournament)),
    );

    const teamEntry =
      teamCandidates.find((entry) => isPartnershipTeamEntry(entry)) ??
      teamCandidates.find((entry) => entry.signupMode === "with_partner") ??
      teamCandidates.find((entry) => hasManualPairLink(entry, entriesForTournament)) ??
      null;

    const soloEntry =
      userEntries.find((entry) =>
        userCanWithdrawSolo(entry, userId, entriesForTournament, userEmail),
      ) ?? null;

    const labelEntry = teamEntry ?? userEntries[0];
    const teamLabel = labelEntry ? teamLabelForEntry(labelEntry, entriesForTournament) : "";

    const status =
      userEntries.find((entry) => entry.status === "approved")?.status ??
      userEntries[0]?.status ??
      "pending";

    const canCancelTeam = teamEntry
      ? userCanWithdrawTeam(teamEntry, userId, userEmail, entriesForTournament)
      : false;

    return {
      tournamentId,
      tournamentName: userEntries[0]?.tournamentName ?? labelEntry?.tournamentName ?? "Tournament",
      status,
      teamLabel,
      teamEntryId: teamEntry?.id ?? null,
      soloEntryId: soloEntry?.id ?? null,
      canCancelTeam,
      canCancelSolo: Boolean(soloEntry),
    };
  });
}
