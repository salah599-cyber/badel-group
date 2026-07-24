"use client";

import { useState, useTransition } from "react";
import { assignMembershipNumberAction } from "@/lib/actions";

export function AssignMembershipByEmailForm({ onComplete }: { onComplete?: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await assignMembershipNumberAction({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Assigned membership #${result.membershipNumber}.`);
      setEmail("");
      onComplete?.();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-primary/15 bg-primary/5 p-4"
    >
      <p className="mb-2 text-sm font-semibold text-primary-dark">Assign membership number by email</p>
      <p className="mb-3 text-xs text-primary-dark/80">
        Use this when a member shows &quot;Membership # not assigned yet&quot; or partner lookup fails.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="member@email.com"
          className="input flex-1"
        />
        <button type="submit" disabled={isPending} className="btn-primary whitespace-nowrap px-4 py-2">
          {isPending ? "Assigning…" : "Assign number"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-brand-green">{message}</p>}
      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </form>
  );
}
