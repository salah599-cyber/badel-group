"use client";

import { useTransition } from "react";
import { EndTournamentSection } from "@/components/EndTournamentSection";
import { PlayerPhotosSection } from "@/components/PlayerPhotosSection";
import { SiteMembersSection } from "@/components/SiteMembersSection";
import { AdminMembersSection } from "@/components/AdminMembersSection";
import { GalleryUploadSection } from "@/components/GalleryUploadSection";
import { SponsorUploadSection } from "@/components/SponsorUploadSection";
import { UserApprovalsSection } from "@/components/UserApprovalsSection";
import { EntryPairingSection } from "@/components/EntryPairingSection";
import { GuestPlayerSection } from "@/components/GuestPlayerSection";
import { TournamentsSection } from "@/components/TournamentsSection";
import { TournamentRosterSection } from "@/components/TournamentRosterSection";
import { TournamentTypesSection } from "@/components/TournamentTypesSection";
import {
  deleteTournamentEntryAction,
  updateEntryStatusAction,
} from "@/lib/actions";
import type { AdminMember, SiteMember } from "@/lib/admin-members";
import { partnershipStatusLabels } from "@/lib/partnerships";
import { playingSideLabels } from "@/lib/player-profile";
import type { Permission } from "@/lib/permissions";
import type { Entry, PlayerProfile, PlayerRanking, Sponsor, Tournament, TournamentType } from "@/lib/types";
import type { PendingUser } from "@/lib/clerk-users";

type AdminPanelProps = {
  tournaments: Tournament[];
  tournamentTypes: TournamentType[];
  manageableEntries: Entry[];
  sponsors: Sponsor[];
  playerProfiles: PlayerProfile[];
  rankedPlayers: PlayerRanking[];
  pendingEntries: Entry[];
  pendingUsers: PendingUser[];
  adminMembers: AdminMember[];
  siteMembers: SiteMember[];
  permissions: Permission[];
  isSuperAdmin: boolean;
  scopedTournamentIds: string[];
  tournamentIdsWithResults: string[];
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
  playerProfiles,
  rankedPlayers,
  pendingEntries,
  pendingUsers,
  adminMembers,
  siteMembers,
  permissions,
  isSuperAdmin,
  scopedTournamentIds,
  tournamentIdsWithResults,
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
        window.location.reload();
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
          tournaments={tournaments}
          onComplete={() => window.location.reload()}
        />
      )}

      {canAccess(permissions, "users:approve", isSuperAdmin) && (
        <SiteMembersSection
          siteMembers={siteMembers}
          onComplete={() => window.location.reload()}
        />
      )}

      {canAccess(permissions, "tournaments:manage", isSuperAdmin) && (
        <>
          <TournamentTypesSection
            types={tournamentTypes}
            onComplete={() => window.location.reload()}
          />

          <TournamentsSection
            tournaments={visibleTournaments}
            tournamentTypes={tournamentTypes}
            onComplete={() => window.location.reload()}
          />

          <EntryPairingSection
            tournaments={visibleTournaments}
            entries={manageableEntries.filter((entry) => {
              if (entry.status !== "approved") return false;
              if (isSuperAdmin || role === "admin") return true;
              if (!entry.tournamentId) return false;
              return scopedTournamentIds.includes(entry.tournamentId);
            })}
            onComplete={() => window.location.reload()}
          />
        </>
      )}

      {canAccess(permissions, "entries:manage", isSuperAdmin) && (
        <section id="entries">
          <GuestPlayerSection
            tournaments={visibleTournaments}
            onComplete={() => window.location.reload()}
          />

          <TournamentRosterSection
            tournaments={visibleTournaments}
            entries={manageableEntries.filter((entry) => {
              if (isSuperAdmin || role === "admin") return true;
              if (!entry.tournamentId) return false;
              return scopedTournamentIds.includes(entry.tournamentId);
            })}
            onComplete={() => window.location.reload()}
          />

          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Pending Entries ({visibleEntries.length})
          </h2>
          {visibleEntries.length > 0 ? (
            <div className="space-y-3">
              {visibleEntries.map((entry) => {
                const partnershipLabel = entry.partnershipStatus
                  ? partnershipStatusLabels[entry.partnershipStatus]
                  : null;
                const partnerLabel =
                  entry.signupMode === "with_partner"
                    ? entry.partnershipStatus === "approved" && entry.partnerName
                      ? `Team: ${entry.name} + ${entry.partnerName}`
                      : entry.partnerEmail
                        ? `Partner: ${entry.partnerName ?? entry.partnerEmail} (${entry.partnerEmail})`
                        : entry.partnerName
                          ? `Partner: ${entry.partnerName} (unregistered)`
                          : "With partner"
                    : entry.pairingMode === "manual"
                      ? "Solo signup"
                      : null;
                const canApprove =
                  entry.partnershipStatus === "not_applicable" ||
                  entry.partnershipStatus === "approved" ||
                  entry.partnershipStatus === "pending_admin";

                return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-sm text-gray-500">
                      {entry.tournamentName} · {entry.email}
                      {entry.playingSide
                        ? ` · ${playingSideLabels[entry.playingSide]}`
                        : ""}
                      {partnerLabel ? ` · ${partnerLabel}` : ""}
                      {entry.partnerPlayerName
                        ? ` · Paired with ${entry.partnerPlayerName}`
                        : entry.pairingMode === "manual" && entry.signupMode !== "with_partner"
                          ? " · Awaiting partner"
                          : ""}
                    </p>
                    {partnershipLabel && (
                      <p className="mt-1 text-xs font-medium text-primary-dark">{partnershipLabel}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending || !canApprove}
                      onClick={() =>
                        wrapAction(() => updateEntryStatusAction(entry.id, "approved"))
                      }
                      className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
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
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Remove ${entry.name} from ${entry.tournamentName}? This cannot be undone.`,
                          )
                        ) {
                          return;
                        }
                        wrapAction(() => deleteTournamentEntryAction(entry.id));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
              })}
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
        <EndTournamentSection
          tournaments={visibleTournaments}
          entries={manageableEntries.filter((entry) => {
            if (isSuperAdmin || role === "admin") return true;
            if (!entry.tournamentId) return false;
            return scopedTournamentIds.includes(entry.tournamentId);
          })}
          tournamentIdsWithResults={tournamentIdsWithResults}
          isPending={isPending}
          wrapAction={wrapAction}
        />
      )}

      {canAccess(permissions, "results:manage", isSuperAdmin) && (
        <PlayerPhotosSection
          profiles={playerProfiles}
          rankedPlayers={rankedPlayers}
          onComplete={() => window.location.reload()}
        />
      )}
    </div>
  );
}
