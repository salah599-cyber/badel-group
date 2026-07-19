"use client";

import { useTransition } from "react";
import { AdminMembersSection } from "@/components/AdminMembersSection";
import { GalleryUploadSection } from "@/components/GalleryUploadSection";
import { SponsorUploadSection } from "@/components/SponsorUploadSection";
import { UserApprovalsSection } from "@/components/UserApprovalsSection";
import { EntryPairingSection } from "@/components/EntryPairingSection";
import { TournamentTypesSection } from "@/components/TournamentTypesSection";
import {
  createResultAction,
  createTournamentAction,
  updateEntryStatusAction,
} from "@/lib/actions";
import type { AdminMember, SiteMember } from "@/lib/admin-members";
import type { Permission } from "@/lib/permissions";
import type { Entry, Sponsor, Tournament, TournamentType } from "@/lib/types";
import type { PendingUser } from "@/lib/clerk-users";

type AdminPanelProps = {
  tournaments: Tournament[];
  tournamentTypes: TournamentType[];
  manageableEntries: Entry[];
  sponsors: Sponsor[];
  pendingEntries: Entry[];
  pendingUsers: PendingUser[];
  adminMembers: AdminMember[];
  siteMembers: SiteMember[];
  permissions: Permission[];
  isSuperAdmin: boolean;
  scopedTournamentIds: string[];
};

function canAccess(
  permissions: Permission[],
  permission: Permission,
  isSuperAdmin: boolean,
) {
  return isSuperAdmin || permissions.includes(permission);
}

function filterByTournamentScope<T extends { id: string }>(
  items: T[],
  scopedTournamentIds: string[],
  isSuperAdmin: boolean,
  role: string,
) {
  if (isSuperAdmin || role === "admin") return items;
  if (role === "tournament_admin") {
    return items.filter((item) => scopedTournamentIds.includes(item.id));
  }
  return items;
}

export function AdminPanel({
  tournaments,
  tournamentTypes,
  manageableEntries,
  sponsors,
  pendingEntries,
  pendingUsers,
  adminMembers,
  siteMembers,
  permissions,
  isSuperAdmin,
  scopedTournamentIds,
  role,
}: AdminPanelProps & { role: string }) {
  const [isPending, startTransition] = useTransition();

  const visibleTournaments = filterByTournamentScope(
    tournaments,
    scopedTournamentIds,
    isSuperAdmin,
    role,
  );

  const visibleEntries = pendingEntries.filter((entry) => {
    if (isSuperAdmin || role === "admin") return true;
    if (!entry.tournamentId) return false;
    return scopedTournamentIds.includes(entry.tournamentId);
  });

  function wrapAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-10">
      {isSuperAdmin && (
        <AdminMembersSection
          adminMembers={adminMembers}
          siteMembers={siteMembers}
          tournaments={tournaments}
          onComplete={() => window.location.reload()}
        />
      )}

      {canAccess(permissions, "tournaments:manage", isSuperAdmin) && (
        <section id="tournaments">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Tournaments</h2>

          <TournamentTypesSection
            types={tournamentTypes}
            onComplete={() => window.location.reload()}
          />

          <EntryPairingSection
            tournaments={visibleTournaments}
            entries={manageableEntries.filter((entry) => {
              if (isSuperAdmin || role === "admin") return true;
              if (!entry.tournamentId) return false;
              return scopedTournamentIds.includes(entry.tournamentId);
            })}
            onComplete={() => window.location.reload()}
          />

          <div className="mb-4 table-scroll overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-cream-dark text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleTournaments.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.typeName}</td>
                    <td className="px-4 py-3 text-gray-600">{t.date}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.registeredCount}/{t.maxPlayers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              wrapAction(() => createTournamentAction(new FormData(e.currentTarget)));
              e.currentTarget.reset();
            }}
            className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
          >
            <h3 className="sm:col-span-2 font-semibold text-primary-dark">Create Tournament</h3>
            <input name="name" placeholder="Tournament name" required className="input" />
            <input name="date" type="date" required className="input" />
            <input name="location" placeholder="Location" required className="input" />
            <select
              name="tournamentTypeId"
              required
              className="input"
              defaultValue={tournamentTypes[0]?.id}
            >
              {tournamentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <input
              name="maxPlayers"
              type="number"
              placeholder="Max players"
              defaultValue={32}
              required
              className="input"
            />
            <textarea
              name="description"
              placeholder="Description"
              required
              className="input sm:col-span-2"
              rows={2}
            />
            <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
              + Create Tournament
            </button>
          </form>
        </section>
      )}

      {canAccess(permissions, "entries:manage", isSuperAdmin) && (
        <section id="entries">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Pending Entries ({visibleEntries.length})
          </h2>
          {visibleEntries.length > 0 ? (
            <div className="space-y-3">
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-sm text-gray-500">
                      {entry.tournamentName} · {entry.email}
                      {entry.partnerPlayerName
                        ? ` · Paired with ${entry.partnerPlayerName}`
                        : entry.pairingMode === "manual"
                          ? " · Awaiting partner"
                          : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        wrapAction(() => updateEntryStatusAction(entry.id, "approved"))
                      }
                      className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        wrapAction(() => updateEntryStatusAction(entry.id, "rejected"))
                      }
                      className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              No pending entries.
            </p>
          )}
        </section>
      )}

      {canAccess(permissions, "users:approve", isSuperAdmin) && (
        <UserApprovalsSection
          pendingUsers={pendingUsers}
          onComplete={() => window.location.reload()}
        />
      )}

      {canAccess(permissions, "sponsors:manage", isSuperAdmin) && (
        <SponsorUploadSection
          sponsors={sponsors}
          onComplete={() => window.location.reload()}
        />
      )}

      {canAccess(permissions, "gallery:manage", isSuperAdmin) && (
        <GalleryUploadSection
          tournaments={visibleTournaments}
          onComplete={() => window.location.reload()}
        />
      )}

      {canAccess(permissions, "results:manage", isSuperAdmin) && (
        <section id="results">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Enter Results</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const tournamentId = fd.get("tournamentId") as string;
              const tournament = visibleTournaments.find((t) => t.id === tournamentId);
              if (tournament) {
                fd.set("tournamentName", tournament.name);
                fd.set("date", tournament.date);
              }
              fd.set(
                "winners",
                JSON.stringify([
                  { place: "1st", names: fd.get("first") as string },
                  { place: "2nd", names: fd.get("second") as string },
                  { place: "3rd", names: fd.get("third") as string },
                ]),
              );
              wrapAction(() => createResultAction(fd));
              e.currentTarget.reset();
            }}
            className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
          >
            <select name="tournamentId" required className="input sm:col-span-2">
              <option value="">Select tournament</option>
              {visibleTournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input name="first" placeholder="1st place" required className="input" />
            <input name="second" placeholder="2nd place" required className="input" />
            <input name="third" placeholder="3rd place" required className="input sm:col-span-2" />
            <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
              Publish Results
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
