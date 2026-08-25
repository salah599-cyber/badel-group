"use client";

import { useState, useTransition } from "react";
import { updateEntryRankAction } from "@/lib/squad-actions";
import { ADMIN_SKILL_RANKS } from "@/lib/squad/constants";
import type { AdminSkillRank, Entry } from "@/lib/types";

type SquadRankingSectionProps = {
  entries: Entry[];
  disabled?: boolean;
};

export function SquadRankingSection({ entries, disabled }: SquadRankingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const approved = entries.filter((entry) => entry.status === "approved");

  function save(entry: Entry, adminSkillRank: string, isWoman: boolean) {
    startTransition(async () => {
      try {
        await updateEntryRankAction({
          entryId: entry.id,
          adminSkillRank: adminSkillRank || null,
          isWoman,
        });
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to save rank");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-lg font-bold">Rank players</h2>
      <p className="mb-4 text-sm text-gray-600">
        Assign a skill rank (B+ is strongest) and mark women for balanced team formation.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-cream-dark text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Skill rank</th>
              <th className="px-3 py-2">Woman</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {approved.map((entry) => (
              <RankRow
                key={entry.id}
                entry={entry}
                disabled={disabled || isPending}
                onSave={save}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankRow({
  entry,
  disabled,
  onSave,
}: {
  entry: Entry;
  disabled?: boolean;
  onSave: (entry: Entry, rank: string, isWoman: boolean) => void;
}) {
  const [rank, setRank] = useState(entry.adminSkillRank ?? "");
  const [isWoman, setIsWoman] = useState(Boolean(entry.isWoman));

  return (
    <tr>
      <td className="px-3 py-2 font-medium">{entry.name}</td>
      <td className="px-3 py-2">
        <select
          className="input py-1"
          value={rank}
          disabled={disabled}
          onChange={(e) => setRank(e.target.value)}
        >
          <option value="">Select rank</option>
          {ADMIN_SKILL_RANKS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isWoman}
          disabled={disabled}
          onChange={(e) => setIsWoman(e.target.checked)}
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={disabled}
          className="rounded-lg border border-primary/30 px-3 py-1 text-xs font-semibold text-primary"
          onClick={() => onSave(entry, rank, isWoman)}
        >
          Save
        </button>
      </td>
    </tr>
  );
}

export type { AdminSkillRank };
