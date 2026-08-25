"use client";

import { useMemo, useState } from "react";
import type { SquadLineupPayload } from "@/lib/squad/lineups";

type SquadLineupFormProps = {
  rosterEntryIds: string[];
  entryNames: Map<string, string>;
  initialLineup?: {
    set1EntryIds?: string[] | null;
    set2EntryIds?: string[] | null;
    set3EntryIds?: string[] | null;
  } | null;
  disabled?: boolean;
  onSubmit: (lineup: SquadLineupPayload) => void;
};

function pairFromIds(ids: string[] | null | undefined, fallback: [string, string]): [string, string] {
  if (ids && ids.length === 2) return [ids[0], ids[1]];
  return fallback;
}

export function SquadLineupForm({
  rosterEntryIds,
  entryNames,
  initialLineup,
  disabled,
  onSubmit,
}: SquadLineupFormProps) {
  const defaults = useMemo(() => {
    const roster = rosterEntryIds.slice();
    return {
      set1: pairFromIds(initialLineup?.set1EntryIds, [roster[0] ?? "", roster[3] ?? ""]),
      set2: pairFromIds(initialLineup?.set2EntryIds, [roster[1] ?? "", roster[5] ?? ""]),
      set3: pairFromIds(initialLineup?.set3EntryIds, [roster[2] ?? "", roster[4] ?? ""]),
    } satisfies SquadLineupPayload;
  }, [initialLineup, rosterEntryIds]);

  const [set1, setSet1] = useState<[string, string]>(defaults.set1);
  const [set2, setSet2] = useState<[string, string]>(defaults.set2);
  const [set3, setSet3] = useState<[string, string]>(defaults.set3);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-cream/40 p-3">
      <SetPicker
        label="Set 1"
        rosterEntryIds={rosterEntryIds}
        entryNames={entryNames}
        value={set1}
        disabled={disabled}
        onChange={setSet1}
      />
      <SetPicker
        label="Set 2"
        rosterEntryIds={rosterEntryIds}
        entryNames={entryNames}
        value={set2}
        disabled={disabled}
        onChange={setSet2}
      />
      <SetPicker
        label="Set 3"
        rosterEntryIds={rosterEntryIds}
        entryNames={entryNames}
        value={set3}
        disabled={disabled}
        onChange={setSet3}
      />
      <button
        type="button"
        disabled={disabled}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
        onClick={() => onSubmit({ set1, set2, set3 })}
      >
        Save lineup
      </button>
    </div>
  );
}

function SetPicker({
  label,
  rosterEntryIds,
  entryNames,
  value,
  disabled,
  onChange,
}: {
  label: string;
  rosterEntryIds: string[];
  entryNames: Map<string, string>;
  value: [string, string];
  disabled?: boolean;
  onChange: (value: [string, string]) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <select
            key={index}
            className="input py-1"
            value={value[index]}
            disabled={disabled}
            onChange={(e) => {
              const next: [string, string] = [...value] as [string, string];
              next[index] = e.target.value;
              onChange(next);
            }}
          >
            <option value="">Select player</option>
            {rosterEntryIds.map((entryId) => (
              <option key={entryId} value={entryId}>
                {entryNames.get(entryId) ?? entryId}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
