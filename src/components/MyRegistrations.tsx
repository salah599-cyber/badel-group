"use client";

import { useTransition } from "react";
import { withdrawEntryAction } from "@/lib/actions";
import { entryStatusLabels } from "@/lib/entries";
import { isPartnershipTeamEntry } from "@/lib/partnerships";
import {
  findManualPairPartner,
  userCanWithdrawSolo,
  userCanWithdrawTeam,
} from "@/lib/tournament-teams";
import type { Entry } from "@/lib/types";

type MyRegistrationsProps = {
  registrations: Entry[];
  tournamentEntries: Entry[];
  userId: string;
  userEmail: string;
};

function registrationTitle(entry: Entry) {
  if (isPartnershipTeamEntry(entry) && entry.partnerName) {
    return `${entry.name} + ${entry.partnerName}`;
  }
  return entry.name;
}

export function MyRegistrations({
  registrations,
  tournamentEntries,
  userId,
  userEmail,
}: MyRegistrationsProps) {
  const [isPending, startTransition] = useTransition();

  if (registrations.length === 0) return null;

  function handleWithdraw(entryId: string, mode: "solo" | "team") {
    const label =
      mode === "team"
        ? "Cancel this team registration? Both players will be withdrawn."
        : "Cancel your registration for this tournament?";
    if (!window.confirm(label)) return;

    startTransition(async () => {
      try {
        await withdrawEntryAction(entryId, mode);
        window.location.reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not cancel registration");
      }
    });
  }

  return (
    <div className="mb-8 section-shell">
      <h2 className="mb-1 text-lg font-semibold text-primary-dark">Your registrations</h2>
      <p className="mb-4 text-sm text-gray-600">
        Cancel your own solo entry or withdraw an entire team registration.
      </p>
      <ul className="space-y-3">
        {registrations.map((entry) => {
          const entriesForTournament = tournamentEntries.filter(
            (other) => other.tournamentId === entry.tournamentId,
          );
          const canCancelTeam = userCanWithdrawTeam(entry, userId, userEmail, entriesForTournament);
          const canCancelSolo = userCanWithdrawSolo(entry, userId, entriesForTournament);
          const manualPartner = findManualPairPartner(entry, entriesForTournament);
          const teamLabel =
            isPartnershipTeamEntry(entry) || entry.signupMode === "with_partner"
              ? registrationTitle(entry)
              : manualPartner
                ? `${entry.name} + ${manualPartner.name}`
                : entry.name;

          return (
            <li
              key={entry.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{entry.tournamentName}</p>
                  <p className="text-sm text-gray-600">{teamLabel}</p>
                  <p className="mt-1 text-xs font-medium capitalize text-primary-dark">
                    {entryStatusLabels[entry.status as keyof typeof entryStatusLabels] ??
                      entry.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canCancelSolo && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleWithdraw(entry.id, "solo")}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel my registration
                    </button>
                  )}
                  {canCancelTeam && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleWithdraw(entry.id, "team")}
                      className="rounded-lg border border-brand-red/30 bg-brand-red/5 px-3 py-1.5 text-sm font-semibold text-brand-red hover:bg-brand-red/10 disabled:opacity-50"
                    >
                      Cancel team registration
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
