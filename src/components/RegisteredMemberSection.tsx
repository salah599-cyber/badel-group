"use client";

import { useState, useTransition } from "react";
import { createMemberEntryAction } from "@/lib/actions";
import { playingSideLabels } from "@/lib/player-profile";
import type { Tournament } from "@/lib/types";

type RegisteredMemberSectionProps = {
  tournaments: Tournament[];
  onComplete: () => void;
};

export function RegisteredMemberSection({
  tournaments,
  onComplete,
}: RegisteredMemberSectionProps) {
  const [isPending, startTransition] = useTransition();
  const upcomingTournaments = tournaments.filter((t) => t.status === "upcoming");
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    upcomingTournaments[0]?.id ?? "",
  );
  const [memberLookup, setMemberLookup] = useState<"membership_number" | "email">(
    "membership_number",
  );

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
    <section id="registered-members" className="mb-10">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Add Registered Member</h2>
      <p className="mb-4 text-sm text-gray-600">
        Add an approved site member to a tournament as a solo player. They are confirmed
        immediately but do not count as a team until paired in the Player Pairing section below.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          formData.set("tournamentId", selectedTournamentId);
          formData.set("memberLookup", memberLookup);
          wrapAction(() => createMemberEntryAction(formData));
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
          <p className="mb-2 text-sm font-medium text-gray-700">Find member by</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="memberLookupUi"
                value="membership_number"
                checked={memberLookup === "membership_number"}
                onChange={() => setMemberLookup("membership_number")}
              />
              Membership number
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="memberLookupUi"
                value="email"
                checked={memberLookup === "email"}
                onChange={() => setMemberLookup("email")}
              />
              Email
            </label>
          </div>
        </div>

        {memberLookup === "membership_number" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Membership number
            </label>
            <input
              name="membershipNumber"
              required
              className="input"
              placeholder="e.g. 142"
              inputMode="numeric"
              pattern="[0-9]{3}"
              maxLength={3}
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              name="memberEmail"
              type="email"
              required
              className="input"
              placeholder="member@example.com"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Playing side</label>
          <select name="playingSide" defaultValue="any" className="input">
            {Object.entries(playingSideLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Override the member&apos;s profile side if needed.
          </p>
        </div>

        <button type="submit" disabled={isPending} className="btn-primary">
          Add member to tournament
        </button>
      </form>
    </section>
  );
}
