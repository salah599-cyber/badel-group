"use client";

import { useState, useTransition } from "react";
import {
  demoteAdminAction,
  promoteAdminAction,
  updateAdminAction,
} from "@/lib/actions";
import type { AdminMember } from "@/lib/admin-members";
import {
  ADMIN_ASSIGNABLE_PERMISSIONS,
  PERMISSION_LABELS,
  type AdminRole,
  type Permission,
} from "@/lib/permissions";
import type { Tournament } from "@/lib/types";

function PermissionCheckboxes({
  selected,
  onChange,
  disabled,
}: {
  selected: Permission[];
  onChange: (perms: Permission[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ADMIN_ASSIGNABLE_PERMISSIONS.map((perm) => (
        <label key={perm} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(perm)}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.checked) onChange([...selected, perm]);
              else onChange(selected.filter((p) => p !== perm));
            }}
            className="mt-0.5"
          />
          <span>{PERMISSION_LABELS[perm]}</span>
        </label>
      ))}
    </div>
  );
}

function TournamentSelect({
  tournaments,
  selected,
  onChange,
}: {
  tournaments: Tournament[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
      {tournaments.length === 0 ? (
        <p className="text-sm text-gray-500">No tournaments available</p>
      ) : (
        tournaments.map((t) => (
          <label key={t.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(t.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, t.id]);
                else onChange(selected.filter((id) => id !== t.id));
              }}
            />
            <span>
              {t.name} <span className="text-gray-400">({t.date})</span>
            </span>
          </label>
        ))
      )}
    </div>
  );
}

export function AdminMembersSection({
  adminMembers,
  tournaments,
  onComplete,
}: {
  adminMembers: AdminMember[];
  tournaments: Tournament[];
  onComplete?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [permissions, setPermissions] = useState<Permission[]>([
    ...ADMIN_ASSIGNABLE_PERMISSIONS,
  ]);
  const [tournamentIds, setTournamentIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("admin");
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);
  const [editTournamentIds, setEditTournamentIds] = useState<string[]>([]);

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        onComplete?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  function startEdit(member: AdminMember) {
    setEditingId(member.id);
    setEditRole(member.role === "super_admin" ? "admin" : member.role);
    setEditPermissions(member.permissions.filter((p) => p !== "admins:manage"));
    setEditTournamentIds(member.tournamentIds);
  }

  return (
    <div className="space-y-10">
      <section id="team">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Admin Team</h2>
        <p className="mb-4 text-sm text-gray-600">
          Promote users to admin or tournament admin. Choose exactly what each person can do.
        </p>

        <div className="mb-6 space-y-3">
          {adminMembers.map((member) => (
            <div
              key={member.id}
              className="rounded-xl border border-gray-100 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {member.role.replace("_", " ")}
                  </p>
                  {member.role === "tournament_admin" && member.tournamentIds.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Tournaments:{" "}
                      {member.tournamentIds
                        .map((id) => tournaments.find((t) => t.id === id)?.name ?? id)
                        .join(", ")}
                    </p>
                  )}
                  {member.role !== "super_admin" && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.permissions
                        .filter((p) => p !== "admins:manage")
                        .map((perm) => (
                          <span
                            key={perm}
                            className="rounded-full bg-cream-dark px-2 py-0.5 text-xs text-gray-600"
                          >
                            {perm.split(":")[0]}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {member.role !== "super_admin" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startEdit(member)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(async () => {
                          if (confirm(`Remove admin access for ${member.email}?`)) {
                            await demoteAdminAction(member.id);
                          }
                        })
                      }
                      className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {editingId === member.id && (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as AdminRole)}
                      className="input"
                    >
                      <option value="admin">Admin</option>
                      <option value="tournament_admin">Tournament Admin</option>
                    </select>
                  </div>

                  {editRole === "admin" && (
                    <PermissionCheckboxes
                      selected={editPermissions}
                      onChange={setEditPermissions}
                    />
                  )}

                  {editRole === "tournament_admin" && (
                    <>
                      <PermissionCheckboxes
                        selected={editPermissions}
                        onChange={setEditPermissions}
                      />
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Assigned tournaments
                        </label>
                        <TournamentSelect
                          tournaments={tournaments}
                          selected={editTournamentIds}
                          onChange={setEditTournamentIds}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(async () => {
                          await updateAdminAction({
                            userId: member.id,
                            role: editRole,
                            permissions: editPermissions,
                            tournamentIds: editTournamentIds,
                          });
                          setEditingId(null);
                        })
                      }
                      className="btn-primary"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await promoteAdminAction({
                email,
                role,
                permissions: role === "admin" ? permissions : permissions,
                tournamentIds: role === "tournament_admin" ? tournamentIds : undefined,
              });
              setEmail("");
              setRole("admin");
              setPermissions([...ADMIN_ASSIGNABLE_PERMISSIONS]);
              setTournamentIds([]);
            });
          }}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
        >
          <h3 className="font-semibold text-primary-dark">Add admin</h3>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com (must have signed up)"
            required
            className="input"
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => {
                const next = e.target.value as AdminRole;
                setRole(next);
                if (next === "tournament_admin") {
                  setPermissions(["entries:manage", "gallery:manage", "results:manage"]);
                } else {
                  setPermissions([...ADMIN_ASSIGNABLE_PERMISSIONS]);
                }
              }}
              className="input"
            >
              <option value="admin">Admin (custom permissions)</option>
              <option value="tournament_admin">Tournament Admin (scoped)</option>
            </select>
          </div>

          <PermissionCheckboxes selected={permissions} onChange={setPermissions} />

          {role === "tournament_admin" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Assigned tournaments</label>
              <TournamentSelect
                tournaments={tournaments}
                selected={tournamentIds}
                onChange={setTournamentIds}
              />
            </div>
          )}

          <button type="submit" disabled={isPending} className="btn-primary">
            Promote to admin
          </button>
        </form>
      </section>
    </div>
  );
}
