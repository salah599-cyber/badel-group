"use client";

import { useState, useTransition } from "react";
import { LocationSelect } from "@/components/LocationSelect";
import {
  createTournamentAction,
  deleteTournamentAction,
  updateTournamentAction,
} from "@/lib/actions";
import type { Tournament, TournamentType } from "@/lib/types";

type TournamentsSectionProps = {
  tournaments: Tournament[];
  tournamentTypes: TournamentType[];
  onComplete: () => void;
};

export function TournamentsSection({
  tournaments,
  tournamentTypes,
  onComplete,
}: TournamentsSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const editingTournament = tournaments.find((t) => t.id === editingId);

  return (
    <section id="tournaments">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Tournaments</h2>

      {tournaments.length > 0 ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="table-scroll">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-cream-dark text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Entries</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tournaments.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.typeName}</td>
                    <td className="px-4 py-3 text-gray-600">{t.date}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{t.status}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.registeredCount}/{t.maxPlayers}
                      {t.waitlistCount > 0 ? ` (+${t.waitlistCount} waiting)` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setEditingId(t.id)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            wrapAction(async () => {
                              if (
                                confirm(
                                  `Delete "${t.name}"? This will also remove all entries and results for this tournament.`,
                                )
                              ) {
                                await deleteTournamentAction(t.id);
                                if (editingId === t.id) setEditingId(null);
                              }
                            })
                          }
                          className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mb-4 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          No tournaments yet. Create one below.
        </p>
      )}

      {editingTournament && (
        <form
          key={editingTournament.id}
          onSubmit={(e) => {
            e.preventDefault();
            wrapAction(async () => {
              await updateTournamentAction(new FormData(e.currentTarget));
              setEditingId(null);
            });
          }}
          className="mb-4 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2"
        >
          <h3 className="sm:col-span-2 font-semibold text-primary-dark">
            Edit Tournament
          </h3>
          <input type="hidden" name="id" value={editingTournament.id} />
          <input
            name="name"
            defaultValue={editingTournament.name}
            placeholder="Tournament name"
            required
            className="input"
          />
          <input
            name="date"
            type="date"
            defaultValue={editingTournament.date}
            required
            className="input"
          />
          <LocationSelect
            className="input"
            defaultLocation={editingTournament.location}
          />
          <select
            name="tournamentTypeId"
            required
            defaultValue={editingTournament.tournamentTypeId}
            className="input"
          >
            {tournamentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <input
            name="maxPlayers"
            type="number"
            defaultValue={editingTournament.maxPlayers}
            required
            className="input"
          />
          <select
            name="status"
            defaultValue={editingTournament.status}
            className="input"
          >
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
          <textarea
            name="description"
            defaultValue={editingTournament.description}
            required
            className="input sm:col-span-2"
            rows={2}
          />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={isPending} className="btn-primary">
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          wrapAction(async () => {
            await createTournamentAction(new FormData(e.currentTarget));
            e.currentTarget.reset();
          });
        }}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <h3 className="sm:col-span-2 font-semibold text-primary-dark">Create Tournament</h3>
        <input name="name" placeholder="Tournament name" required className="input" />
        <input name="date" type="date" required className="input" />
        <LocationSelect className="input" />
        <select
          name="tournamentTypeId"
          required
          className="input"
          defaultValue={tournamentTypes[0]?.id}
        >
          {tournamentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <input
          name="maxPlayers"
          type="number"
          placeholder="Max players"
          defaultValue={32}
          required
          className="input"
        />
        <textarea
          name="description"
          placeholder="Description"
          required
          className="input sm:col-span-2"
          rows={2}
        />
        <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
          + Create Tournament
        </button>
      </form>
    </section>
  );
}
