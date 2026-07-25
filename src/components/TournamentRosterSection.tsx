"use client";

import { useMemo, useState, useTransition } from "react";
import {
  demoteEntryToWaitlistAction,
  deleteTournamentEntryAction,
  promoteEntryFromWaitlistAction,
  removeConfirmedEntryAction,
} from "@/lib/actions";
import { entryStatusLabels } from "@/lib/entries";
import { isPartnershipTeamEntry } from "@/lib/partnerships";
import { formatRosterEntryDetails } from "@/lib/roster-display";
import type { Entry, Tournament } from "@/lib/types";

type TournamentRosterSectionProps = {
  tournaments: Tournament[];
  entries: Entry[];
  onComplete: () => void;
};

export function TournamentRosterSection({
  tournaments,
  entries,
  onComplete,
}: TournamentRosterSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournaments[0]?.id ?? "");

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);

  const tournamentEntries = useMemo(
    () => entries.filter((entry) => entry.tournamentId === selectedTournamentId),
    [entries, selectedTournamentId],
  );

  const confirmedEntries = useMemo(
    () => tournamentEntries.filter((entry) => entry.status === "approved"),
    [tournamentEntries],
  );

  const waitlistedEntries = useMemo(
    () => tournamentEntries.filter((entry) => entry.status === "waitlisted"),
    [tournamentEntries],
  );

  const spotsLeft = selectedTournament
    ? Math.max(0, selectedTournament.maxPlayers - selectedTournament.registeredCount)
    : 0;

  function confirmDelete(entry: Entry) {
    const label =
      isPartnershipTeamEntry(entry) && entry.partnerName
        ? `${entry.name} + ${entry.partnerName}`
        : entry.name;
    return window.confirm(
      `Remove ${label} from ${selectedTournament?.name ?? "this tournament"}? This cannot be undone.`,
    );
  }

  function wrapAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        onComplete();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  if (tournaments.length === 0) return null;

  return (
    <section id="roster" className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Tournament Roster</h2>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Tournament</label>
        <select
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          className="input"
        >
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name} — {tournament.registeredCount}/{tournament.maxPlayers} teams confirmed
              {tournament.waitlistCount > 0 ? `, ${tournament.waitlistCount} waiting` : ""}
            </option>
          ))}
        </select>

        {selectedTournament && (
          <p className="mt-2 text-sm text-gray-600">
            {spotsLeft > 0
              ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} available`
              : "Tournament is full — move a confirmed player to the waiting list before confirming someone new."}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-primary-dark">
            Confirmed ({confirmedEntries.length})
          </h3>
          <p className="mb-3 text-xs text-gray-500">
            Move a player to the waiting list or remove their registration entirely.
          </p>
          {confirmedEntries.length > 0 ? (
            <div className="space-y-3">
              {confirmedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatRosterEntryDetails(entry, tournamentEntries)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-brand-green">
                      {entryStatusLabels.approved}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Move ${entry.name} to the waiting list for this tournament?`,
                          )
                        ) {
                          return;
                        }
                        wrapAction(() => demoteEntryToWaitlistAction(entry.id));
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Move to waitlist
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirmDelete(entry)) return;
                        wrapAction(() => removeConfirmedEntryAction(entry.id));
                      }}
                      className="rounded-lg border border-brand-red/40 bg-white px-3 py-1.5 text-sm font-semibold text-brand-red disabled:opacity-50"
                    >
                      Remove player
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No confirmed players yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-primary-dark">
            Waiting list ({waitlistedEntries.length})
          </h3>
          {waitlistedEntries.length > 0 ? (
            <div className="space-y-3">
              {waitlistedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatRosterEntryDetails(entry, tournamentEntries)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      {entryStatusLabels.waitlisted}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending || spotsLeft === 0}
                      onClick={() => wrapAction(() => promoteEntryFromWaitlistAction(entry.id))}
                      className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Confirm player
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirmDelete(entry)) return;
                        wrapAction(() => deleteTournamentEntryAction(entry.id));
                      }}
                      className="rounded-lg border border-brand-red px-3 py-1.5 text-sm font-semibold text-brand-red disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No players on the waiting list.</p>
          )}
        </div>
      </div>
    </section>
  );
}
