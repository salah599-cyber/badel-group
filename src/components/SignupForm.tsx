"use client";

import { useState, useTransition } from "react";
import { createEntryAction } from "@/lib/actions";
import { playingSideLabels } from "@/lib/player-profile";
import type { PlayingSide, SignupMode, Tournament } from "@/lib/types";

type SignupFormProps = {
  tournaments: Tournament[];
  defaultName: string;
  defaultEmail: string;
  defaultPlayingSide: PlayingSide;
};

function signupHint(tournament: Tournament | undefined, signupMode: SignupMode) {
  if (!tournament) return null;
  if (tournament.pairingMode === "random") {
    return "Sign up solo — teams will be assigned randomly.";
  }
  if (signupMode === "solo") {
    return "Sign up solo — an admin can assign you a partner later.";
  }
  return "Registered partners must approve your request. Unregistered partners require admin approval.";
}

export function SignupForm({
  tournaments,
  defaultName,
  defaultEmail,
  defaultPlayingSide,
}: SignupFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<SignupMode>("solo");
  const [submittedPartnerType, setSubmittedPartnerType] = useState<"registered" | "unregistered" | null>(null);
  const [submittedWaitlisted, setSubmittedWaitlisted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? "");
  const [signupMode, setSignupMode] = useState<SignupMode>("solo");
  const [partnerType, setPartnerType] = useState<"registered" | "unregistered">("registered");

  const selectedTournament = tournaments.find((t) => t.id === selectedId);
  const isSoloOnlyTournament = selectedTournament?.pairingMode === "random";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const mode = (formData.get("signupMode") as SignupMode) || "solo";
    const type = formData.get("partnerType") as "registered" | "unregistered" | null;

    startTransition(async () => {
      try {
        const result = await createEntryAction(formData);
        setSubmittedMode(mode);
        setSubmittedPartnerType(type);
        setSubmittedWaitlisted(result.status === "waitlisted");
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
          {submittedWaitlisted
            ? "This tournament is full. You have been added to the waiting list and will be notified if a spot opens."
            : submittedMode === "with_partner" && submittedPartnerType === "registered"
              ? "Your registration is pending. Your partner must approve the partnership before an admin can finalize your entry."
              : submittedMode === "with_partner" && submittedPartnerType === "unregistered"
                ? "Your registration is pending. An admin must approve your unregistered partner before your entry is confirmed."
                : "Your signup has been received and is pending admin approval."}
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
          onChange={(e) => {
            setSelectedId(e.target.value);
            const tournament = tournaments.find((t) => t.id === e.target.value);
            if (tournament?.pairingMode === "random") {
              setSignupMode("solo");
            }
          }}
          className="input"
        >
          {tournaments.map((t) => {
            const spotsLeft = t.maxPlayers - t.registeredCount;
            const capacityLabel =
              spotsLeft > 0
                ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`
                : `Full — waitlist open (${t.waitlistCount} waiting)`;

            return (
              <option key={t.id} value={t.id}>
                {t.name} — {new Date(t.date).toLocaleDateString()} ({t.typeName}) · {capacityLabel}
              </option>
            );
          })}
        </select>
        {signupHint(selectedTournament, signupMode) && (
          <p className="mt-1 text-xs text-gray-500">{signupHint(selectedTournament, signupMode)}</p>
        )}
        {selectedTournament && selectedTournament.registeredCount >= selectedTournament.maxPlayers && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            This tournament is full. New sign-ups will be added to the waiting list.
          </p>
        )}
      </div>

      {isSoloOnlyTournament ? (
        <>
          <input type="hidden" name="signupMode" value="solo" />
          <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-primary-dark">
            <p className="font-semibold">Solo registration only</p>
            <p className="mt-1 text-primary-dark/80">
              This tournament uses random team selection. You will be paired with another player
              after registration closes.
            </p>
          </div>
        </>
      ) : (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">How are you signing up?</legend>
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <input
              type="radio"
              name="signupMode"
              value="solo"
              checked={signupMode === "solo"}
              onChange={() => setSignupMode("solo")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-900">Sign up solo</span>
              <span className="block text-xs text-gray-500">
                Join on your own and get paired later if needed.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <input
              type="radio"
              name="signupMode"
              value="with_partner"
              checked={signupMode === "with_partner"}
              onChange={() => setSignupMode("with_partner")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-900">Sign up with a partner</span>
              <span className="block text-xs text-gray-500">
                Choose a registered member or someone not yet on the platform.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      {!isSoloOnlyTournament && signupMode === "with_partner" && (
        <fieldset className="space-y-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">Partner details</legend>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <input
                type="radio"
                name="partnerType"
                value="registered"
                checked={partnerType === "registered"}
                onChange={() => setPartnerType("registered")}
              />
              Registered member
            </label>
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <input
                type="radio"
                name="partnerType"
                value="unregistered"
                checked={partnerType === "unregistered"}
                onChange={() => setPartnerType("unregistered")}
              />
              Not registered yet
            </label>
          </div>

          {partnerType === "registered" ? (
            <div>
              <label htmlFor="partnerEmail" className="mb-1 block text-sm font-medium text-gray-700">
                Partner email
              </label>
              <input
                id="partnerEmail"
                name="partnerEmail"
                type="email"
                required
                placeholder="partner@email.com"
                className="input"
              />
              <p className="mt-1 text-xs text-gray-500">
                They must already be a registered and approved member. They will need to accept your
                invite.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="partnerName" className="mb-1 block text-sm font-medium text-gray-700">
                Partner full name
              </label>
              <input
                id="partnerName"
                name="partnerName"
                type="text"
                required
                placeholder="Partner's full name"
                className="input"
              />
              <p className="mt-1 text-xs text-gray-500">
                Because they are not registered, an admin must approve this partnership.
              </p>
            </div>
          )}
        </fieldset>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultName}
          className="input"
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
          readOnly
          defaultValue={defaultEmail}
          className="input bg-gray-50"
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input id="phone" name="phone" type="tel" required className="input" />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">Preferred playing side</legend>
        <p className="text-xs text-gray-500">
          Saved to your profile so you don&apos;t need to choose again next time.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["right", "left", "any"] as const).map((side) => (
            <label
              key={side}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
            >
              <input
                type="radio"
                name="playingSide"
                value={side}
                defaultChecked={defaultPlayingSide === side}
                required
              />
              <span className="font-medium text-gray-800">{playingSideLabels[side]}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
