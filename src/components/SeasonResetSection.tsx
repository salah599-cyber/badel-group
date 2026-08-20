"use client";

import { useState, useTransition } from "react";
import { endRankingSeasonAction } from "@/lib/actions";
import type { RankingSeason } from "@/lib/types";

type SeasonResetSectionProps = {
  currentSeason: RankingSeason | null;
  archivedSeasons: RankingSeason[];
  currentSeasonPlayerCount: number;
  onComplete: () => void;
};

export function SeasonResetSection({
  currentSeason,
  archivedSeasons,
  currentSeasonPlayerCount,
  onComplete,
}: SeasonResetSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [seasonName, setSeasonName] = useState("");

  function wrapAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        setSeasonName("");
        onComplete();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = seasonName.trim();
    if (!trimmedName) {
      alert("Enter a name for the season you are archiving.");
      return;
    }

    wrapAction(async () => {
      if (
        !window.confirm(
          `End the current season as "${trimmedName}"? This archives the current leaderboard and resets live rankings to zero. This cannot be undone.`,
        )
      ) {
        return;
      }

      const formData = new FormData();
      formData.set("seasonName", trimmedName);
      await endRankingSeasonAction(formData);
    });
  }

  return (
    <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-gray-900">Ranking Seasons</h2>
      <p className="mb-6 text-sm text-gray-600">
        End the current season to archive the leaderboard and start a fresh ranking board.
      </p>

      {currentSeason ? (
        <div className="mb-6 rounded-xl border border-primary/15 bg-cream-dark/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Current season
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">{currentSeason.name}</p>
          <p className="mt-1 text-sm text-gray-600">
            Started{" "}
            {currentSeason.startedAt.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {currentSeasonPlayerCount} ranked player
            {currentSeasonPlayerCount === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <p className="mb-6 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
          No active ranking season found.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <label htmlFor="seasonName" className="mb-1 block text-sm font-semibold text-gray-700">
            Archive name
          </label>
          <input
            id="seasonName"
            type="text"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder="e.g. 2025/26"
            disabled={isPending || !currentSeason}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            This name is shown to players when they browse past seasons.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || !currentSeason || currentSeasonPlayerCount === 0}
          className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Ending season…" : "End season & reset rankings"}
        </button>
      </form>

      {archivedSeasons.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-bold text-gray-900">Archived seasons</h3>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {archivedSeasons.map((season) => (
              <li key={season.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">{season.name}</p>
                  <p className="text-xs text-gray-500">
                    {season.rankings?.length ?? 0} players
                  </p>
                </div>
                {season.endedAt && (
                  <time className="text-sm text-gray-600">
                    {season.endedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No archived seasons yet.</p>
      )}
    </section>
  );
}
