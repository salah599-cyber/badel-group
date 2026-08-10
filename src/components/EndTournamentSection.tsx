"use client";

import { useMemo, useState } from "react";
import { createResultAction } from "@/lib/actions";
import { getConfirmedTeamOptions } from "@/lib/tournament-teams";
import type { Entry, Tournament } from "@/lib/types";

type EndTournamentSectionProps = {
  tournaments: Tournament[];
  entries: Entry[];
  tournamentIdsWithResults: string[];
  isPending: boolean;
  wrapAction: (action: () => Promise<void>) => void;
};

const PLACES = [
  { place: "1st", field: "first", label: "1st place" },
  { place: "2nd", field: "second", label: "2nd place" },
  { place: "3rd", field: "third", label: "3rd place" },
  { place: "4th", field: "fourth", label: "4th place" },
] as const;

export function EndTournamentSection({
  tournaments,
  entries,
  tournamentIdsWithResults,
  isPending,
  wrapAction,
}: EndTournamentSectionProps) {
  const endableTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament) =>
          tournament.status === "upcoming" && !tournamentIdsWithResults.includes(tournament.id),
      ),
    [tournaments, tournamentIdsWithResults],
  );

  const [selectedTournamentId, setSelectedTournamentId] = useState(endableTournaments[0]?.id ?? "");
  const [placements, setPlacements] = useState<Record<string, string>>({
    first: "",
    second: "",
    third: "",
    fourth: "",
  });

  const tournamentEntries = useMemo(
    () => entries.filter((entry) => entry.tournamentId === selectedTournamentId),
    [entries, selectedTournamentId],
  );

  const teamOptions = useMemo(
    () => getConfirmedTeamOptions(tournamentEntries),
    [tournamentEntries],
  );

  const selectedKeys = new Set(Object.values(placements).filter(Boolean));

  function optionsForField(field: string) {
    const currentValue = placements[field];
    return teamOptions.filter(
      (team) => team.key === currentValue || !selectedKeys.has(team.key),
    );
  }

  function handleTournamentChange(tournamentId: string) {
    setSelectedTournamentId(tournamentId);
    setPlacements({ first: "", second: "", third: "", fourth: "" });
  }

  function handlePlacementChange(field: string, value: string) {
    setPlacements((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const winners = PLACES.map(({ place, field }) => {
      const key = placements[field];
      const team = teamOptions.find((option) => option.key === key);
      return { place, names: team?.label ?? "" };
    });

    const fd = new FormData();
    fd.set("tournamentId", selectedTournamentId);
    fd.set("winners", JSON.stringify(winners));

    wrapAction(() => createResultAction(fd));
    setPlacements({ first: "", second: "", third: "", fourth: "" });
  }

  const allPlacementsChosen = PLACES.every(({ field }) => Boolean(placements[field]));
  const hasEnoughTeams = teamOptions.length >= 4;

  if (endableTournaments.length === 0) {
    return (
      <section id="end-tournament">
        <h2 className="mb-4 text-xl font-bold text-gray-900">End Tournament</h2>
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No upcoming tournaments are ready to end. Tournaments with published results are hidden
          here.
        </p>
      </section>
    );
  }

  return (
    <section id="end-tournament">
      <h2 className="mb-2 text-xl font-bold text-gray-900">End Tournament</h2>
      <p className="mb-4 text-sm text-gray-600">
        Select the top 4 confirmed teams, publish results, and mark the tournament completed.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label htmlFor="endTournamentId" className="mb-1 block text-sm font-medium text-gray-700">
            Tournament
          </label>
          <select
            id="endTournamentId"
            value={selectedTournamentId}
            onChange={(e) => handleTournamentChange(e.target.value)}
            required
            className="input"
          >
            {endableTournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name} — {new Date(tournament.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {!hasEnoughTeams ? (
          <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This tournament has {teamOptions.length} confirmed team
            {teamOptions.length === 1 ? "" : "s"}. Pair players until there are at least 4
            confirmed teams before ending the tournament.
          </p>
        ) : (
          PLACES.map(({ field, label }) => (
            <div key={field}>
              <label htmlFor={field} className="mb-1 block text-sm font-medium text-gray-700">
                {label}
              </label>
              <select
                id={field}
                value={placements[field]}
                onChange={(e) => handlePlacementChange(field, e.target.value)}
                required
                className="input"
              >
                <option value="">Select team</option>
                {optionsForField(field).map((team) => (
                  <option key={team.key} value={team.key}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}

        <button
          type="submit"
          disabled={isPending || !hasEnoughTeams || !allPlacementsChosen}
          className="btn-primary sm:col-span-2"
        >
          End tournament &amp; publish winners
        </button>
      </form>
    </section>
  );
}
