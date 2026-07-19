import type { Entry } from "@/lib/types";

export type EntryStatus = "pending" | "approved" | "rejected" | "waitlisted";

export const entryStatusLabels: Record<EntryStatus, string> = {
  pending: "Pending approval",
  approved: "Confirmed",
  rejected: "Rejected",
  waitlisted: "Waiting list",
};

export function isConfirmedEntry(status: string) {
  return status === "approved";
}

export function isWaitlistedEntry(status: string) {
  return status === "waitlisted";
}

export function isActiveRosterEntry(entry: Pick<Entry, "status">) {
  return entry.status === "approved" || entry.status === "waitlisted";
}
