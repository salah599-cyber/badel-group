"use client";

import { useState, useTransition } from "react";
import {
  formSquadsAction,
  swapSquadPlayersAction,
  updateSquadTeamAction,
} from "@/lib/squad-actions";
import type { Entry, TournamentTeam } from "@/lib/types";

type SquadTeamsSectionProps = {
  tournamentId: string;
  teams: TournamentTeam[];
  entries: Entry[];
  disabled?: boolean;
};

export function SquadTeamsSection({
  tournamentId,
  teams,
  entries,
  disabled,
}: SquadTeamsSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const entryNames = new Map(entries.map((entry) => [entry.id, entry.name]));

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Squads</h2>
          <p className="text-sm text-gray-600">
            Form balanced teams, rename squads, assign captains, or swap players.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || isPending}
          className="btn-primary"
          onClick={() => run(() => formSquadsAction(tournamentId))}
        >
          {teams.length ? "Re-form teams" : "Form teams"}
        </button>
      </div>

      {teams.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                entryNames={entryNames}
                disabled={disabled || isPending}
                onSave={(updates) =>
                  run(() => updateSquadTeamAction({ teamId: team.id, ...updates }))
                }
              />
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Swap players</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                Player A
                <select
                  className="input mt-1"
                  value={swapA}
                  onChange={(e) => setSwapA(e.target.value)}
                >
                  <option value="">Select player</option>
                  {teams.flatMap((team) =>
                    team.entryIds.map((id) => (
                      <option key={id} value={id}>
                        {entryNames.get(id) ?? id}
                      </option>
                    )),
                  )}
                </select>
              </label>
              <label className="text-sm">
                Player B
                <select
                  className="input mt-1"
                  value={swapB}
                  onChange={(e) => setSwapB(e.target.value)}
                >
                  <option value="">Select player</option>
                  {teams.flatMap((team) =>
                    team.entryIds.map((id) => (
                      <option key={id} value={id}>
                        {entryNames.get(id) ?? id}
                      </option>
                    )),
                  )}
                </select>
              </label>
              <button
                type="button"
                disabled={disabled || isPending || !swapA || !swapB}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
                onClick={() =>
                  run(() =>
                    swapSquadPlayersAction({
                      tournamentId,
                      entryIdA: swapA,
                      entryIdB: swapB,
                    }),
                  )
                }
              >
                Swap
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function TeamCard({
  team,
  entryNames,
  disabled,
  onSave,
}: {
  team: TournamentTeam;
  entryNames: Map<string, string>;
  disabled?: boolean;
  onSave: (updates: {
    label?: string;
    captainEntryId?: string | null;
  }) => void;
}) {
  const [label, setLabel] = useState(team.label);
  const [captainEntryId, setCaptainEntryId] = useState(team.captainEntryId ?? team.entryIds[0] ?? "");

  return (
    <article className="rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          className="input flex-1 py-1"
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          disabled={disabled}
          className="rounded-lg border border-primary/30 px-3 py-1 text-xs font-semibold text-primary"
          onClick={() => onSave({ label })}
        >
          Save name
        </button>
      </div>
      <ul className="mb-3 space-y-1 text-sm text-gray-700">
        {team.entryIds.map((entryId) => (
          <li key={entryId}>{entryNames.get(entryId) ?? entryId}</li>
        ))}
      </ul>
      <label className="block text-sm">
        Captain
        <select
          className="input mt-1 py-1"
          value={captainEntryId}
          disabled={disabled}
          onChange={(e) => setCaptainEntryId(e.target.value)}
        >
          {team.entryIds.map((entryId) => (
            <option key={entryId} value={entryId}>
              {entryNames.get(entryId) ?? entryId}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={disabled}
        className="mt-2 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold"
        onClick={() => onSave({ captainEntryId: captainEntryId || null })}
      >
        Save captain
      </button>
    </article>
  );
}
