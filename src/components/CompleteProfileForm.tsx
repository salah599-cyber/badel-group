"use client";

import { useState, useTransition } from "react";
import { completeProfileAction } from "@/lib/actions";

export function CompleteProfileForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await completeProfileAction(formData);
        window.location.href = "/pending-approval";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save your profile");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            className="input"
          />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
