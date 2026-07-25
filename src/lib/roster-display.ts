import { findManualPairPartner } from "@/lib/tournament-teams";
import { isPartnershipTeamEntry, partnershipStatusLabels } from "@/lib/partnerships";
import { playingSideLabels } from "@/lib/player-profile";
import type { Entry, PartnershipStatus } from "@/lib/types";

export type RosterPartnerInfo = {
  partnerName: string | null;
  pairedByAdminName: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function findPartnershipInviter(entry: Entry, tournamentEntries: Entry[]) {
  const normalizedEmail = normalizeEmail(entry.email);
  return (
    tournamentEntries.find((other) => {
      if (other.id === entry.id) return false;
      if (other.signupMode !== "with_partner" && !isPartnershipTeamEntry(other)) {
        return false;
      }
      if (!other.partnerName) return false;

      const emailMatch =
        normalizedEmail.length > 0 && normalizeEmail(other.partnerEmail) === normalizedEmail;
      const userMatch = Boolean(entry.userId && other.partnerUserId === entry.userId);
      return emailMatch || userMatch;
    }) ?? null
  );
}

/** Partner label for roster rows, including reverse partnership sign-ups. */
export function getRosterPartnerInfo(entry: Entry, tournamentEntries: Entry[]): RosterPartnerInfo {
  let pairedByAdminName = entry.pairedByAdminName?.trim() || null;

  const manualPartner = findManualPairPartner(entry, tournamentEntries);
  if (manualPartner) {
    if (!pairedByAdminName && manualPartner.pairedByAdminName) {
      pairedByAdminName = manualPartner.pairedByAdminName.trim();
    }
    return {
      partnerName: manualPartner.name,
      pairedByAdminName,
    };
  }

  if (entry.signupMode === "with_partner" && entry.partnerName) {
    return {
      partnerName: entry.partnerName,
      pairedByAdminName,
    };
  }

  if (entry.partnerPlayerName) {
    return {
      partnerName: entry.partnerPlayerName,
      pairedByAdminName,
    };
  }

  const inviter = findPartnershipInviter(entry, tournamentEntries);

  if (inviter) {
    return {
      partnerName: inviter.name,
      pairedByAdminName,
    };
  }

  return { partnerName: null, pairedByAdminName };
}

export function formatRosterEntryDetails(entry: Entry, tournamentEntries: Entry[]) {
  let partnershipStatusLabel =
    entry.partnershipStatus && entry.partnershipStatus !== "not_applicable"
      ? partnershipStatusLabels[entry.partnershipStatus as PartnershipStatus]
      : null;

  const { partnerName, pairedByAdminName } = getRosterPartnerInfo(entry, tournamentEntries);

  if (!partnershipStatusLabel && partnerName) {
    const inviter = findPartnershipInviter(entry, tournamentEntries);
    if (inviter?.partnershipStatus && inviter.partnershipStatus !== "not_applicable") {
      partnershipStatusLabel = partnershipStatusLabels[inviter.partnershipStatus as PartnershipStatus];
    }
  }
  const parts: string[] = [];

  if (entry.email) parts.push(entry.email);
  if (entry.playingSide) parts.push(playingSideLabels[entry.playingSide]);

  if (partnerName) {
    parts.push(`Partner: ${partnerName}`);
  }

  if (partnershipStatusLabel) {
    parts.push(partnershipStatusLabel);
  }

  if (pairedByAdminName) {
    parts.push(`Paired by ${pairedByAdminName}`);
  }

  return parts.join(" · ");
}
