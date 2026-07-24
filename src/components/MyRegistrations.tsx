"use client";

import { useMemo, useTransition } from "react";
import { withdrawEntryAction } from "@/lib/actions";
import { entryStatusLabels } from "@/lib/entries";
import { consolidateRegistrationsForUser } from "@/lib/tournament-teams";
import type { Entry } from "@/lib/types";

type MyRegistrationsProps = {
  registrations: Entry[];
  tournamentEntries: Entry[];
  userId: string;
  userEmail: string;
};

export function MyRegistrations({
  registrations,
  tournamentEntries,
  userId,
  userEmail,
}: MyRegistrationsProps) {
  const [isPending, startTransition] = useTransition();

  const consolidated = useMemo(
    () => consolidateRegistrationsForUser(registrations, tournamentEntries, userId, userEmail),
    [registrations, tournamentEntries, userId, userEmail],
  );

  if (consolidated.length === 0) return null;

  function handleWithdraw(entryId: string, mode: "solo" | "team") {
    const label =
      mode === "team"
        ? "Cancel this team registration? Both players will be withdrawn."
        : "Cancel only your registration for this tournament? Your partner can remain registered if they have their own entry.";
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
        One row per tournament. Cancel only your entry, or withdraw the whole team.
      </p>
      <ul className="space-y-3">
        {consolidated.map((registration) => (
          <li
            key={registration.tournamentId}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-900">{registration.tournamentName}</p>
                <p className="text-sm text-gray-600">{registration.teamLabel}</p>
                <p className="mt-1 text-xs font-medium capitalize text-primary-dark">
                  {entryStatusLabels[registration.status as keyof typeof entryStatusLabels] ??
                    registration.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {registration.canCancelSolo && registration.soloEntryId && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleWithdraw(registration.soloEntryId!, "solo")}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel my registration
                  </button>
                )}
                {registration.canCancelTeam && registration.teamEntryId && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleWithdraw(registration.teamEntryId!, "team")}
                    className="rounded-lg border border-brand-red/30 bg-brand-red/5 px-3 py-1.5 text-sm font-semibold text-brand-red hover:bg-brand-red/10 disabled:opacity-50"
                  >
                    Cancel team registration
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
