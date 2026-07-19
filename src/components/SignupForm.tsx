"use client";

import { useState, useTransition } from "react";
import { createEntryAction } from "@/lib/actions";
import type { Tournament } from "@/lib/types";

export function SignupForm({ tournaments }: { tournaments: Tournament[] }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createEntryAction(formData);
        setSubmitted(true);
      } catch {
        setError("Registration failed. Please try again or contact support.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-green/30 bg-white p-8 text-center shadow-sm">
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
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
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
          defaultValue={tournaments[0]?.id}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {new Date(t.date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label htmlFor="partnerName" className="mb-1 block text-sm font-medium text-gray-700">
          Partner Name (for doubles)
        </label>
        <input
          id="partnerName"
          name="partnerName"
          type="text"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label htmlFor="skillLevel" className="mb-1 block text-sm font-medium text-gray-700">
          Skill Level
        </label>
        <select
          id="skillLevel"
          name="skillLevel"
          defaultValue="intermediate"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit Registration"}
      </button>
    </form>
  );
}
