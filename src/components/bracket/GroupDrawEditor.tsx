"use client";

import { useState } from "react";
import type { TournamentGroup } from "@/lib/types";

type GroupDrawEditorProps = {
  groups: TournamentGroup[];
  teamLabels: Map<string, string>;
  disabled?: boolean;
  onSave: (payload: { groupId: string; teamIds: string[] }[]) => void;
};

export function GroupDrawEditor({
  groups,
  teamLabels,
  disabled,
  onSave,
}: GroupDrawEditorProps) {
  const [localGroups, setLocalGroups] = useState(
    groups.map((g) => ({ groupId: g.id, label: g.label, teamIds: [...g.teamIds] })),
  );
  const [dragTeamId, setDragTeamId] = useState<string | null>(null);
  const [fromGroupId, setFromGroupId] = useState<string | null>(null);

  function moveTeam(toGroupId: string) {
    if (!dragTeamId || !fromGroupId || fromGroupId === toGroupId) return;
    setLocalGroups((prev) =>
      prev.map((g) => {
        if (g.groupId === fromGroupId) {
          return { ...g, teamIds: g.teamIds.filter((id) => id !== dragTeamId) };
        }
        if (g.groupId === toGroupId) {
          return { ...g, teamIds: [...g.teamIds, dragTeamId!] };
        }
        return g;
      }),
    );
    setDragTeamId(null);
    setFromGroupId(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {localGroups.map((group) => (
          <div
            key={group.groupId}
            className="rounded-xl border border-primary/20 bg-cream-dark/40 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => moveTeam(group.groupId)}
          >
            <h4 className="mb-2 font-bold text-primary-dark">Group {group.label}</h4>
            <ul className="space-y-1">
              {group.teamIds.map((teamId) => (
                <li
                  key={teamId}
                  draggable={!disabled}
                  onDragStart={() => {
                    setDragTeamId(teamId);
                    setFromGroupId(group.groupId);
                  }}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm cursor-grab active:cursor-grabbing"
                >
                  {teamLabels.get(teamId) ?? teamId}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!disabled && (
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            onSave(localGroups.map((g) => ({ groupId: g.groupId, teamIds: g.teamIds })))
          }
        >
          Save group changes
        </button>
      )}
    </div>
  );
}
