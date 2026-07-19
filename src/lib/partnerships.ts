import type { PartnershipStatus } from "@/lib/types";

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
