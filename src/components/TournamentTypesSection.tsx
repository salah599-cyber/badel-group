"use client";

import { useTransition } from "react";
import {
  createTournamentTypeAction,
  deleteTournamentTypeAction,
} from "@/lib/actions";
import type { TournamentType } from "@/lib/types";

type TournamentTypesSectionProps = {
  types: TournamentType[];
  onComplete: () => void;
};

function pairingLabel(mode: TournamentType["pairingMode"]) {
  return mode === "random"
    ? "Solo signup — random team assignment"
    : "Solo signup — admin pairs players";
}

export function TournamentTypesSection({ types, onComplete }: TournamentTypesSectionProps) {
  const [isPending, startTransition] = useTransition();

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

  return (
    <section id="tournament-types" className="mb-8">
      <h3 className="mb-3 font-semibold text-primary-dark">Tournament Types</h3>
      <p className="mb-4 text-sm text-gray-600">
        Padel is always played in doubles. Players sign up individually for doubles and
        mixed doubles — admins pair them into teams afterward.
      </p>

      {types.length > 0 ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-cream/30">
          <ul className="divide-y divide-gray-200">
            {types.map((type) => (
              <li
                key={type.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{type.name}</p>
                  {type.description && (
                    <p className="text-sm text-gray-500">{type.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{pairingLabel(type.pairingMode)}</p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => wrapAction(() => deleteTournamentTypeAction(type.id))}
                  className="shrink-0 self-start rounded-lg border border-brand-red/30 px-3 py-1.5 text-sm font-medium text-brand-red transition hover:bg-brand-red/5 sm:self-center"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-4 rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          No tournament types yet. Add one below.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          wrapAction(() => createTournamentTypeAction(new FormData(e.currentTarget)));
          e.currentTarget.reset();
        }}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <h4 className="sm:col-span-2 text-sm font-semibold text-gray-800">Add Tournament Type</h4>
        <input name="name" placeholder="Type name" required className="input" />
        <select name="pairingMode" defaultValue="manual" className="input">
          <option value="manual">Admin pairs solo players</option>
          <option value="random">Random team assignment</option>
        </select>
        <textarea
          name="description"
          placeholder="Short description (optional)"
          className="input sm:col-span-2"
          rows={2}
        />
        <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
          + Add Type
        </button>
      </form>
    </section>
  );
}
