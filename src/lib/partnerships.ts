import type { Entry, PartnershipStatus } from "@/lib/types";

export const partnershipStatusLabels: Record<PartnershipStatus, string> = {
  not_applicable: "Solo signup",
  pending_partner: "Awaiting partner approval",
  pending_admin: "Unregistered partner — admin review",
  approved: "Partnership approved",
  rejected: "Partnership rejected",
};

export function canAdminApproveEntry(partnershipStatus: PartnershipStatus) {
  return (
    partnershipStatus === "not_applicable" ||
    partnershipStatus === "approved" ||
    partnershipStatus === "pending_admin"
  );
}

export function isPartnershipTeamEntry(
  entry: Pick<Entry, "signupMode" | "partnershipStatus" | "partnerName">,
) {
  return (
    entry.signupMode === "with_partner" &&
    entry.partnershipStatus === "approved" &&
    Boolean(entry.partnerName)
  );
}

/** True when a manual A+B pair is already represented by an approved with_partner team row. */
export function manualPairDuplicatesPartnershipTeam(a: Entry, b: Entry) {
  return partnershipEntryMatchesPlayer(a, b) || partnershipEntryMatchesPlayer(b, a);
}

function partnershipEntryMatchesPlayer(teamEntry: Entry, playerEntry: Entry) {
  if (!isPartnershipTeamEntry(teamEntry)) return false;
  if (teamEntry.partnerUserId && playerEntry.userId === teamEntry.partnerUserId) {
    return true;
  }
  const partnerEmail = teamEntry.partnerEmail?.trim().toLowerCase();
  const playerEmail = playerEntry.email?.trim().toLowerCase();
  return Boolean(partnerEmail && playerEmail && partnerEmail === playerEmail);
}

export function hasManualPairLink(entry: Entry, allEntries: Entry[]) {
  return Boolean(entry.partnerEntryId) || allEntries.some((other) => other.partnerEntryId === entry.id);
}
