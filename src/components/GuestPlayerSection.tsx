"use client";

import { useState, useTransition } from "react";
import { createGuestEntryAction, createGuestTeamAction } from "@/lib/actions";
import { playingSideLabels } from "@/lib/player-profile";
import type { Tournament } from "@/lib/types";

type GuestPlayerSectionProps = {
  tournaments: Tournament[];
  onComplete: () => void;
};

type GuestMode = "solo" | "team";

export function GuestPlayerSection({ tournaments, onComplete }: GuestPlayerSectionProps) {
  const [isPending, startTransition] = useTransition();
  const upcomingTournaments = tournaments.filter((t) => t.status === "upcoming");
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    upcomingTournaments[0]?.id ?? "",
  );
  const [mode, setMode] = useState<GuestMode>("solo");

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

  if (upcomingTournaments.length === 0) return null;

  return (
    <section id="guest-players" className="mb-10">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Add Guest Players</h2>
      <p className="mb-4 text-sm text-gray-600">
        Guest players are added only for this tournament and do not need a site account.
        Pair solo guests and registered members together in the Player Pairing section below.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          formData.set("tournamentId", selectedTournamentId);
          wrapAction(() =>
            mode === "solo"
              ? createGuestEntryAction(formData)
              : createGuestTeamAction(formData),
          );
        }}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tournament</label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="input"
            required
          >
            {upcomingTournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name} — {tournament.registeredCount}/{tournament.maxPlayers} teams
                confirmed
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Add as</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="guestMode"
                value="solo"
                checked={mode === "solo"}
                onChange={() => setMode("solo")}
              />
              Solo guest
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="guestMode"
                value="team"
                checked={mode === "team"}
                onChange={() => setMode("team")}
              />
              Guest team (2 players)
            </label>
          </div>
        </div>

        {mode === "solo" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input name="name" required className="input" placeholder="Player name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <input name="phone" className="input" placeholder="Phone number" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Playing side</label>
              <select name="playingSide" defaultValue="any" className="input">
                {Object.entries(playingSideLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-gray-100 p-3">
              <h3 className="text-sm font-semibold text-gray-800">Player 1</h3>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input name="nameA" required className="input" placeholder="Player name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone (optional)
                </label>
                <input name="phoneA" className="input" placeholder="Phone number" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Playing side</label>
                <select name="playingSideA" defaultValue="any" className="input">
                  {Object.entries(playingSideLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-gray-100 p-3">
              <h3 className="text-sm font-semibold text-gray-800">Player 2</h3>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input name="nameB" required className="input" placeholder="Player name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone (optional)
                </label>
                <input name="phoneB" className="input" placeholder="Phone number" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Playing side</label>
                <select name="playingSideB" defaultValue="any" className="input">
                  {Object.entries(playingSideLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={isPending} className="btn-primary">
          {mode === "solo" ? "Add guest player" : "Add guest team"}
        </button>
      </form>
    </section>
  );
}
