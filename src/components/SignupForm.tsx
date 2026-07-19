"use client";

import { useState, useTransition } from "react";
import { createEntryAction } from "@/lib/actions";
import type { Tournament } from "@/lib/types";

function signupHint(tournament: Tournament | undefined) {
  if (!tournament) return null;
  if (tournament.pairingMode === "random") {
    return "Sign up solo — teams will be assigned randomly.";
  }
  return "Sign up individually — an admin will assign your partner.";
}

export function SignupForm({ tournaments }: { tournaments: Tournament[] }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? "");

  const selectedTournament = tournaments.find((t) => t.id === selectedId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createEntryAction(formData);
        setSubmitted(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again or contact support.",
        );
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-8 text-center">
        <div className="mb-4 text-4xl text-brand-green">✓</div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Registration Submitted</h2>
        <p className="text-gray-600">
          Your signup has been received and is pending admin approval. You&apos;ll be
          notified by email once approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{error}</p>
      )}

      <div>
        <label htmlFor="tournamentId" className="mb-1 block text-sm font-medium text-gray-700">
          Tournament
        </label>
        <select
          id="tournamentId"
          name="tournamentId"
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {new Date(t.date).toLocaleDateString()} ({t.typeName})
            </option>
          ))}
        </select>
        {signupHint(selectedTournament) && (
          <p className="mt-1 text-xs text-gray-500">{signupHint(selectedTournament)}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input id="name" name="name" type="text" required className="input" />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input id="email" name="email" type="email" required className="input" />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input id="phone" name="phone" type="tel" required className="input" />
      </div>

      <div>
        <label htmlFor="skillLevel" className="mb-1 block text-sm font-medium text-gray-700">
          Skill Level
        </label>
        <select id="skillLevel" name="skillLevel" defaultValue="intermediate" className="input">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={3} className="input" />
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full py-3">
        {isPending ? "Submitting..." : "Submit Registration"}
      </button>
    </form>
  );
}
