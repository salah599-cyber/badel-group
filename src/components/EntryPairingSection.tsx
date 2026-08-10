"use client";

import { useMemo, useState, useTransition } from "react";
import { pairEntriesAction, unpairEntryAction } from "@/lib/actions";
import { hasManualPairLink, isPartnershipTeamEntry } from "@/lib/partnerships";
import { playingSideLabels } from "@/lib/player-profile";
import { isGuestEntryEmail } from "@/lib/roster-display";
import { getPairedTeamDisplayEntries } from "@/lib/tournament-teams";
import type { Entry, Tournament } from "@/lib/types";

type EntryPairingSectionProps = {
  tournaments: Tournament[];
  entries: Entry[];
  onComplete: () => void;
};

function entryLabel(entry: Entry) {
  const guestSuffix = entry.isGuest ? " (Guest)" : "";
  const sideSuffix = entry.playingSide ? ` (${playingSideLabels[entry.playingSide]})` : "";
  return `${entry.name}${guestSuffix}${sideSuffix}`;
}

function entrySubLabel(entry: Entry) {
  if (entry.isGuest || isGuestEntryEmail(entry.email)) return "Guest player";
  return entry.email;
}

function isPaired(entry: Entry, allEntries: Entry[]) {
  if (isPartnershipTeamEntry(entry)) return true;
  return hasManualPairLink(entry, allEntries);
}

export function EntryPairingSection({
  tournaments,
  entries,
  onComplete,
}: EntryPairingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const manualTournaments = tournaments.filter(
    (t) => t.pairingMode === "manual" && t.status === "upcoming",
  );
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    manualTournaments[0]?.id ?? "",
  );
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");

  const tournamentEntries = useMemo(
    () => entries.filter((entry) => entry.tournamentId === selectedTournamentId),
    [entries, selectedTournamentId],
  );

  const { partnershipTeams, manualPairs } = useMemo(
    () => getPairedTeamDisplayEntries(tournamentEntries),
    [tournamentEntries],
  );

  const unpairedEntries = useMemo(
    () =>
      tournamentEntries.filter(
        (entry) => entry.status === "approved" && !isPaired(entry, tournamentEntries),
      ),
    [tournamentEntries],
  );

  const pairedTeamCount = partnershipTeams.length + manualPairs.length;

  function wrapAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        setPlayerA("");
        setPlayerB("");
        onComplete();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  if (manualTournaments.length === 0) {
    return null;
  }

  return (
    <section id="pairing" className="mb-8">
      <h3 className="mb-2 font-semibold text-primary-dark">Player Pairing</h3>
      <p className="mb-4 text-sm text-gray-600">
        Players who signed up together are listed automatically as teams after admin approval.
        Use this section only to pair solo registrants into teams. A team is only
        confirmed (and counts toward capacity) after it is paired.
      </p>

      <div className="mb-4">
        <label htmlFor="pairingTournament" className="mb-1 block text-sm font-medium text-gray-700">
          Tournament
        </label>
        <select
          id="pairingTournament"
          value={selectedTournamentId}
          onChange={(e) => {
            setSelectedTournamentId(e.target.value);
            setPlayerA("");
            setPlayerB("");
          }}
          className="input max-w-md"
        >
          {manualTournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name} ({tournament.typeName})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-800">
            Unpaired Players ({unpairedEntries.length})
          </h4>
          {unpairedEntries.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {unpairedEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-cream/40 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.name}
                      {entry.isGuest && (
                        <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                          Guest
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entrySubLabel(entry)}
                      {entry.playingSide
                        ? ` · ${playingSideLabels[entry.playingSide]}`
                        : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                    {entry.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No unpaired players for this tournament.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-800">
            Paired Teams ({pairedTeamCount})
          </h4>
          {pairedTeamCount > 0 ? (
            <ul className="space-y-3 text-sm">
              {partnershipTeams.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-brand-green/20 bg-brand-green/5 px-3 py-3"
                >
                  <p className="font-medium text-gray-900">
                    {entry.name} + {entry.partnerName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Registered together · {entry.status}
                  </p>
                </li>
              ))}
              {manualPairs.map(({ a, b }) => (
                <li
                  key={`${a.id}-${b.id}`}
                  className="rounded-lg border border-brand-green/20 bg-brand-green/5 px-3 py-3"
                >
                  <p className="font-medium text-gray-900">
                    {a.name} + {b.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {a.status} / {b.status}
                  </p>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => wrapAction(() => unpairEntryAction(a.id))}
                    className="mt-2 text-xs font-semibold text-brand-red hover:underline"
                  >
                    Unpair
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No pairs created yet.</p>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!playerA || !playerB) return;
          wrapAction(() => pairEntriesAction(playerA, playerB));
        }}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <h4 className="sm:col-span-2 text-sm font-semibold text-gray-800">Create a Pair</h4>
        <select
          value={playerA}
          onChange={(e) => setPlayerA(e.target.value)}
          required
          className="input"
        >
          <option value="">Select player 1</option>
          {unpairedEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entryLabel(entry)}
            </option>
          ))}
        </select>
        <select
          value={playerB}
          onChange={(e) => setPlayerB(e.target.value)}
          required
          className="input"
        >
          <option value="">Select player 2</option>
          {unpairedEntries
            .filter((entry) => entry.id !== playerA)
            .map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entryLabel(entry)}
              </option>
            ))}
        </select>
        <button
          type="submit"
          disabled={isPending || unpairedEntries.length < 2}
          className="btn-primary sm:col-span-2"
        >
          Pair Players
        </button>
      </form>
    </section>
  );
}
