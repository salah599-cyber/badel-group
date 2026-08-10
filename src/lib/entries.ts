import type { Entry } from "@/lib/types";

export type EntryStatus = "pending" | "approved" | "rejected" | "waitlisted";

export const entryStatusLabels: Record<EntryStatus, string> = {
  pending: "Pending approval",
  approved: "Confirmed",
  rejected: "Rejected",
  waitlisted: "Waiting list",
};

/** Display status for roster rows: solos are not a confirmed team until paired. */
export function getEntryConfirmationLabel(
  entry: Pick<Entry, "status" | "signupMode" | "partnershipStatus" | "partnerName">,
  isPairedTeam: boolean,
) {
  if (entry.status === "approved") {
    if (isPairedTeam) return "Confirmed team";
    return "Approved — awaiting pair";
  }
  return entryStatusLabels[entry.status as EntryStatus] ?? entry.status;
}

export function isConfirmedEntry(status: string) {
  return status === "approved";
}

export function isWaitlistedEntry(status: string) {
  return status === "waitlisted";
}

export function isActiveRosterEntry(entry: Pick<Entry, "status">) {
  return entry.status === "approved" || entry.status === "waitlisted";
}
