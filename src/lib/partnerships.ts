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

export function hasManualPairLink(entry: Entry, allEntries: Entry[]) {
  return Boolean(entry.partnerEntryId) || allEntries.some((other) => other.partnerEntryId === entry.id);
}
