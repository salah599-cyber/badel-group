"use client";

import { useTransition } from "react";
import {
  createGalleryPhotoAction,
  createResultAction,
  createSponsorAction,
  createTournamentAction,
  deleteSponsorAction,
  updateEntryStatusAction,
} from "@/lib/actions";
import type { Entry, Sponsor, Tournament } from "@/lib/types";

export function AdminPanel({
  tournaments,
  sponsors,
  pendingEntries,
}: {
  tournaments: Tournament[];
  sponsors: Sponsor[];
  pendingEntries: Entry[];
}) {
  const [isPending, startTransition] = useTransition();

  function wrapAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-10">
      <section id="tournaments">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Tournaments</h2>
        <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-dark text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Entries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tournaments.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.date}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.registeredCount}/{t.maxPlayers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            wrapAction(() => createTournamentAction(new FormData(e.currentTarget)));
            e.currentTarget.reset();
          }}
          className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="sm:col-span-2 font-semibold text-primary-dark">Create Tournament</h3>
          <input name="name" placeholder="Tournament name" required className="input" />
          <input name="date" type="date" required className="input" />
          <input name="location" placeholder="Location" required className="input" />
          <select name="format" className="input">
            <option value="doubles">Doubles</option>
            <option value="singles">Singles</option>
          </select>
          <input name="maxPlayers" type="number" placeholder="Max players" defaultValue={32} required className="input" />
          <textarea name="description" placeholder="Description" required className="input sm:col-span-2" rows={2} />
          <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
            + Create Tournament
          </button>
        </form>
      </section>

      <section id="entries">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Pending Entries ({pendingEntries.length})
        </h2>
        {pendingEntries.length > 0 ? (
          <div className="space-y-3">
            {pendingEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-sm text-gray-500">
                    {entry.tournamentName} · {entry.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => wrapAction(() => updateEntryStatusAction(entry.id, "approved"))}
                    className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => wrapAction(() => updateEntryStatusAction(entry.id, "rejected"))}
                    className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            No pending entries.
          </p>
        )}
      </section>

      <section id="sponsors">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Sponsors ({sponsors.length})</h2>
        <ul className="mb-4 space-y-2">
          {sponsors.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3"
            >
              <span className="font-medium">{s.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-primary uppercase">{s.tier}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => wrapAction(() => deleteSponsorAction(s.id))}
                  className="text-xs text-brand-red hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            wrapAction(() => createSponsorAction(new FormData(e.currentTarget)));
            e.currentTarget.reset();
          }}
          className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="sm:col-span-2 font-semibold text-primary-dark">Add Sponsor</h3>
          <input name="name" placeholder="Sponsor name" required className="input" />
          <select name="tier" className="input">
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </select>
          <input name="logoUrl" placeholder="Logo image URL" required className="input sm:col-span-2" />
          <input name="website" placeholder="Website URL (optional)" className="input sm:col-span-2" />
          <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
            + Add Sponsor
          </button>
        </form>
      </section>

      <section id="gallery">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Gallery Uploads</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            wrapAction(() => createGalleryPhotoAction(new FormData(e.currentTarget)));
            e.currentTarget.reset();
          }}
          className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <input name="tournamentName" placeholder="Tournament name" required className="input" />
          <input name="imageUrl" placeholder="Image URL" required className="input" />
          <input name="caption" placeholder="Caption" required className="input sm:col-span-2" />
          <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
            + Add Photo
          </button>
        </form>
      </section>

      <section id="results">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Enter Results</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const tournamentId = fd.get("tournamentId") as string;
            const tournament = tournaments.find((t) => t.id === tournamentId);
            if (tournament) {
              fd.set("tournamentName", tournament.name);
              fd.set("date", tournament.date);
            }
            fd.set(
              "winners",
              JSON.stringify([
                { place: "1st", names: fd.get("first") as string },
                { place: "2nd", names: fd.get("second") as string },
                { place: "3rd", names: fd.get("third") as string },
              ]),
            );
            wrapAction(() => createResultAction(fd));
            e.currentTarget.reset();
          }}
          className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <select name="tournamentId" required className="input sm:col-span-2">
            <option value="">Select tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input name="first" placeholder="1st place" required className="input" />
          <input name="second" placeholder="2nd place" required className="input" />
          <input name="third" placeholder="3rd place" required className="input sm:col-span-2" />
          <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
            Publish Results
          </button>
        </form>
      </section>
    </div>
  );
}
