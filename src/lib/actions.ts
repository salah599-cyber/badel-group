"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, max } from "drizzle-orm";
import { findUserByEmail } from "@/lib/admin-members";
import { ensureMembershipNumber, findUserByMembershipNumber, getMembershipFromMetadata, normalizeMembershipNumber } from "@/lib/membership";
import { hasRequiredProfile, normalizeProfileName, validateRegistrationNames } from "@/lib/registration";
import { getUserDisplayName } from "@/lib/user-display";
import {
  getAdminContext,
  requireApprovedUser,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { countTournamentsByType, deletePlayerProfile, findTournamentParticipation, getEntriesForTournament, getEntryById, getTournamentCapacity, hasExistingEntry, upsertPlayerProfile } from "@/lib/db/queries";
import {
  entries,
  galleryPhotos,
  results,
  sponsors,
  tournamentTypes,
  tournaments,
} from "@/lib/db/schema";
import {
  entryWouldOccupyTeamSlot,
  findManualPairPartner,
  getConfirmedTeamOptions,
  userCanWithdrawSolo,
  userCanWithdrawTeam,
} from "@/lib/tournament-teams";
import { canAdminApproveEntry, isPartnershipTeamEntry } from "@/lib/partnerships";
import { parsePlayingSide } from "@/lib/player-profile";
import { parseNameFields, syncClerkUserProfileNames } from "@/lib/user-profile";
import { normalizePlayerKey } from "@/lib/rankings";
import {
  createNotification,
  getUnreadNotificationCount,
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";
import { hasAdminAccess, isMemberApproved } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";
import { insertSponsorRow } from "@/lib/db/sponsor-db";
import { normalizeSponsorLink } from "@/lib/urls";
import {
  ADMIN_ASSIGNABLE_PERMISSIONS,
  canManageTournament,
  type AdminRole,
  type Permission,
} from "@/lib/permissions";

export type CreateEntryResult =
  | { ok: true; status: "pending" | "waitlisted" }
  | { ok: false; error: string };

function entryError(error: string): CreateEntryResult {
  return { ok: false, error };
}

async function assertEntryAccess(entryId: string) {
  const ctx = await requirePermission("entries:manage");
  if (!db) throw new Error("Database not configured");

  const [entry] = await db
    .select({ tournamentId: entries.tournamentId })
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);

  if (!entry) throw new Error("Entry not found");
  if (!canManageTournament(ctx, entry.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function notifyUserSafe(
  userId: string | null | undefined,
  input: {
    type: string;
    title: string;
    message: string;
    href?: string;
  },
) {
  if (!userId) return;

  try {
    await createNotification({ userId, ...input });
  } catch (error) {
    console.error("[notifications] Failed to create notification:", error);
  }
}

async function resolveEntryUserId(entry: { userId?: string | null; email: string }) {
  if (entry.userId) return entry.userId;
  const user = await findUserByEmail(entry.email);
  return user?.id ?? null;
}

function getPartnerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata?: Record<string, unknown>;
}) {
  return getUserDisplayName(user, user.emailAddresses[0]?.emailAddress || "Your partner");
}

export async function createTournamentAction(formData: FormData) {
  await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");

  const tournamentTypeId = formData.get("tournamentTypeId") as string;
  if (!tournamentTypeId) throw new Error("Tournament type is required");

  const location = (formData.get("location") as string)?.trim();
  if (!location) throw new Error("Location is required");

  await db.insert(tournaments).values({
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    location,
    tournamentTypeId,
    description: formData.get("description") as string,
    maxPlayers: Number(formData.get("maxPlayers")),
    countsTowardRankings: formData.get("countsTowardRankings") === "true",
    status: "upcoming",
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/signup");
}

export async function updateTournamentAction(formData: FormData) {
  const ctx = await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");

  const id = formData.get("id") as string;
  if (!id) throw new Error("Tournament ID is required");
  if (!canManageTournament(ctx, id)) {
    throw new Error("You do not have access to this tournament");
  }

  const tournamentTypeId = formData.get("tournamentTypeId") as string;
  if (!tournamentTypeId) throw new Error("Tournament type is required");

  const location = (formData.get("location") as string)?.trim();
  if (!location) throw new Error("Location is required");

  const status = formData.get("status") as string;
  if (status !== "upcoming" && status !== "completed") {
    throw new Error("Invalid tournament status");
  }

  await db
    .update(tournaments)
    .set({
      name: formData.get("name") as string,
      date: formData.get("date") as string,
      location,
      tournamentTypeId,
      description: formData.get("description") as string,
      maxPlayers: Number(formData.get("maxPlayers")),
      countsTowardRankings: formData.get("countsTowardRankings") === "true",
      status,
    })
    .where(eq(tournaments.id, id));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/results");
  revalidatePath("/rankings");
}

export async function deleteTournamentAction(tournamentId: string) {
  const ctx = await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");
  if (!canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  await db.delete(tournaments).where(eq(tournaments.id, tournamentId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/results");
}

export async function createTournamentTypeAction(formData: FormData) {
  await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");

  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Type name is required");

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db
      .select({ id: tournamentTypes.id })
      .from(tournamentTypes)
      .where(eq(tournamentTypes.slug, slug))
      .limit(1);
    if (existing.length === 0) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const [{ value: maxOrder }] = await db
    .select({ value: max(tournamentTypes.sortOrder) })
    .from(tournamentTypes);

  await db.insert(tournamentTypes).values({
    name,
    slug,
    description: (formData.get("description") as string) || null,
    requiresPartner: false,
    pairingMode: (formData.get("pairingMode") as "manual" | "random") || "manual",
    sortOrder: (maxOrder ?? 0) + 1,
  });

  revalidatePath("/admin");
}

export async function deleteTournamentTypeAction(typeId: string) {
  await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");

  const inUse = await countTournamentsByType(typeId);
  if (inUse > 0) {
    throw new Error("Cannot delete a type that is used by existing tournaments");
  }

  await db.delete(tournamentTypes).where(eq(tournamentTypes.id, typeId));
  revalidatePath("/admin");
}

export async function createEntryAction(formData: FormData): Promise<CreateEntryResult> {
  try {
    const user = await currentUser();
    if (!user) return entryError("You must be signed in to register.");

    if (!isMemberApproved(user.publicMetadata as AdminMetadata)) {
      return entryError("Your account must be approved before you can register for tournaments.");
    }

    if (!db) return entryError("Registration is temporarily unavailable. Please try again later.");

    const tournamentId = formData.get("tournamentId") as string;
    const email = (formData.get("email") as string).trim().toLowerCase();
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    const playingSide = parsePlayingSide(formData.get("playingSide"));

    if (userEmail && email !== userEmail) {
      return entryError("Email must match your account email.");
    }

    const [tournament] = await db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        pairingMode: tournamentTypes.pairingMode,
        maxPlayers: tournaments.maxPlayers,
      })
      .from(tournaments)
      .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) return entryError("Tournament not found.");

    const capacity = await getTournamentCapacity(tournamentId);
    if (!capacity) return entryError("Tournament not found.");

    const signupMode =
      tournament.pairingMode === "random"
        ? "solo"
        : ((formData.get("signupMode") as "solo" | "with_partner") || "solo");
    const partnerType = formData.get("partnerType") as "registered" | "unregistered" | null;
    const partnerLookup =
      (formData.get("partnerLookup") as "membership_number" | "email" | null) ??
      "membership_number";
    const partnerEmail = (formData.get("partnerEmail") as string | null)?.trim().toLowerCase() || null;
    const partnerMembershipNumber =
      (formData.get("partnerMembershipNumber") as string | null)?.trim() || null;
    const partnerName = (formData.get("partnerName") as string | null)?.trim() || null;

    if (await hasExistingEntry(tournamentId, email, user.id)) {
      const participation = await findTournamentParticipation(tournamentId, email, user.id);
      if (participation?.role === "partner") {
        return entryError(
          "You are already registered for this tournament as someone else's partner. Cancel that team registration before signing up again.",
        );
      }
      return entryError("You are already registered for this tournament.");
    }

    let partnershipStatus: "not_applicable" | "pending_partner" | "pending_admin" | "approved" =
      "not_applicable";
    let partnerUserId: string | null = null;
    let resolvedPartnerName: string | null = null;
    let resolvedPartnerEmail: string | null = null;

    if (signupMode === "with_partner") {
      if (partnerType === "registered") {
        let partnerUser = null;

        if (partnerLookup === "email") {
          if (!partnerEmail) return entryError("Partner email is required.");

          if (partnerEmail === email) {
            return entryError("You cannot select yourself as your partner.");
          }

          partnerUser = await findUserByEmail(partnerEmail);
          if (!partnerUser) {
            return entryError(
              "No registered member found with that email. Try their membership number instead, or choose “Not registered yet”.",
            );
          }
        } else {
          if (!partnerMembershipNumber) {
            return entryError("Partner membership number is required.");
          }

          const normalizedMembershipNumber = normalizeMembershipNumber(partnerMembershipNumber);
          if (!normalizedMembershipNumber) {
            return entryError("Enter a valid 3-digit membership number between 100 and 999.");
          }

        if (
          getMembershipFromMetadata(user.publicMetadata as AdminMetadata) === normalizedMembershipNumber
        ) {
            return entryError("You cannot select yourself as your partner.");
          }

          partnerUser = await findUserByMembershipNumber(normalizedMembershipNumber);
          if (!partnerUser) {
            return entryError(
              "No registered member found with that membership number. Check the number or choose “Not registered yet”.",
            );
          }
        }

        const partnerMeta = partnerUser.publicMetadata as AdminMetadata;
        if (!hasAdminAccess(partnerMeta) && partnerMeta?.approved !== true) {
          return entryError("Your partner must be a registered and approved member.");
        }

        partnerUserId = partnerUser.id;
        resolvedPartnerEmail = partnerUser.emailAddresses[0]?.emailAddress?.toLowerCase() ?? null;
        resolvedPartnerName = getUserDisplayName(
          {
            firstName: partnerUser.firstName,
            lastName: partnerUser.lastName,
            emailAddresses: partnerUser.emailAddresses,
            publicMetadata: partnerMeta,
          },
          resolvedPartnerEmail ?? "Partner",
        );
        partnershipStatus = "pending_partner";

        const partnerParticipation = await findTournamentParticipation(
          tournamentId,
          resolvedPartnerEmail ?? "",
          partnerUserId,
        );
        if (partnerParticipation) {
          return entryError("Your partner is already registered for this tournament.");
        }
      } else {
        if (!partnerName) return entryError("Partner name is required.");
        resolvedPartnerName = partnerName;
        partnershipStatus = "pending_admin";
      }
    }

    // Solo players are not a confirmed team until paired; only partner sign-ups take a slot now.
    const entryStatus =
      entryWouldOccupyTeamSlot({ signupMode }) && capacity.isFull ? "waitlisted" : "pending";

    let firstName: string;
    let lastName: string;
    let fullName: string;
    try {
      ({ firstName, lastName, fullName } = parseNameFields(formData));
    } catch (error) {
      return entryError(
        error instanceof Error ? error.message : "First name and last name are required.",
      );
    }

    const nameValidationError = validateRegistrationNames(firstName, lastName);
    if (nameValidationError) return entryError(nameValidationError);

    const phone = (formData.get("phone") as string | null)?.trim();
    if (!phone) return entryError("Phone number is required.");

    try {
      await db.insert(entries).values({
        tournamentId,
        userId: user.id,
        name: fullName,
        email,
        phone,
        signupMode,
        partnerName: resolvedPartnerName,
        partnerEmail: resolvedPartnerEmail,
        partnerUserId,
        partnershipStatus,
        playingSide,
        skillLevel: formData.get("skillLevel") as string,
        notes: (formData.get("notes") as string) || null,
        status: entryStatus,
      });
    } catch (error) {
      console.error("[createEntryAction] Failed to insert entry:", error);
      return entryError("Could not save your registration. Please try again or contact support.");
    }

    if (partnershipStatus === "pending_partner" && partnerUserId) {
      await notifyUserSafe(partnerUserId, {
        type: "partnership_invite",
        title: "New partnership request",
        message: `${fullName} invited you to partner for ${tournament.name}.`,
        href: "/signup",
      });
    }

    try {
      await syncClerkUserProfileNames(user.id, firstName, lastName, { playingSide });
    } catch (error) {
      console.error("[createEntryAction] Profile sync failed:", error);
    }

    if (entryStatus === "waitlisted") {
      await notifyUserSafe(user.id, {
        type: "entry_waitlisted",
        title: "Added to waiting list",
        message: `${tournament.name} is full. You have been added to the waiting list and will be notified if a spot opens.`,
        href: "/signup",
      });
    }

    revalidatePath("/admin");
    revalidatePath("/signup");
    revalidatePath("/");

    return { ok: true, status: entryStatus };
  } catch (error) {
    console.error("[createEntryAction] Unexpected error:", error);
    return entryError("Registration failed. Please try again or contact support.");
  }
}

async function assertPartnershipAccess(entryId: string) {
  const user = await requireApprovedUser();

  const entry = await getEntryById(entryId);
  if (!entry) throw new Error("Partnership request not found");

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  const isPartner =
    entry.partnerUserId === user.id ||
    (userEmail && entry.partnerEmail?.toLowerCase() === userEmail);

  if (!isPartner) {
    throw new Error("You are not authorized to respond to this request");
  }

  if (entry.partnershipStatus !== "pending_partner") {
    throw new Error("This partnership request is no longer pending");
  }

  return entry;
}

export async function approvePartnershipAction(entryId: string) {
  const entry = await assertPartnershipAccess(entryId);
  const partner = await currentUser();
  if (!db) throw new Error("Database not configured");

  await db
    .update(entries)
    .set({ partnershipStatus: "approved" })
    .where(eq(entries.id, entryId));

  if (partner) {
    await notifyUserSafe(await resolveEntryUserId(entry), {
      type: "partnership_accepted",
      title: "Partnership accepted",
      message: `${getPartnerDisplayName(partner)} accepted your partnership request for ${entry.tournamentName}.`,
      href: "/signup",
    });
  }

  revalidatePath("/signup");
  revalidatePath("/admin");
}

export async function rejectPartnershipAction(entryId: string) {
  const entry = await assertPartnershipAccess(entryId);
  const partner = await currentUser();
  if (!db) throw new Error("Database not configured");

  await db
    .update(entries)
    .set({ partnershipStatus: "rejected", status: "rejected" })
    .where(eq(entries.id, entryId));

  if (partner) {
    await notifyUserSafe(await resolveEntryUserId(entry), {
      type: "partnership_declined",
      title: "Partnership declined",
      message: `${getPartnerDisplayName(partner)} declined your partnership request for ${entry.tournamentName}.`,
      href: "/signup",
    });
  }

  revalidatePath("/signup");
  revalidatePath("/admin");
}

async function assertEntryPairingAccess(entryId: string) {
  const ctx = await requirePermission("entries:manage");
  if (!db) throw new Error("Database not configured");

  const [entry] = await db
    .select({
      tournamentId: entries.tournamentId,
      status: entries.status,
      pairingMode: tournamentTypes.pairingMode,
    })
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .where(eq(entries.id, entryId))
    .limit(1);

  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "approved") {
    throw new Error("Only confirmed players can be paired");
  }
  if (!canManageTournament(ctx, entry.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }
  if (entry.pairingMode !== "manual") {
    throw new Error("This tournament type does not use manual pairing");
  }

  return entry;
}

async function isEntryPaired(entryId: string) {
  if (!db) return false;

  const [entry] = await db
    .select({ partnerEntryId: entries.partnerEntryId })
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);

  if (entry?.partnerEntryId) return true;

  const [reverse] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.partnerEntryId, entryId))
    .limit(1);

  return Boolean(reverse);
}

function createGuestEmail() {
  return `guest+${randomUUID()}@internal.badel`;
}

async function getAdminDisplayName(ctx: { email: string; userId: string }) {
  const clerkUser = await currentUser();
  if (clerkUser) {
    return getUserDisplayName(
      {
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        emailAddresses: clerkUser.emailAddresses,
        publicMetadata: clerkUser.publicMetadata as AdminMetadata,
      },
      ctx.email,
    );
  }
  return ctx.email;
}

async function assertGuestTournamentAccess(tournamentId: string) {
  const ctx = await requirePermission("entries:manage");
  if (!db) throw new Error("Database not configured");
  if (!canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  const [tournament] = await db
    .select({ status: tournaments.status })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "upcoming") {
    throw new Error("Guest players can only be added to upcoming tournaments");
  }

  return ctx;
}

async function linkEntriesAsPair(
  entryIdA: string,
  entryIdB: string,
  adminId: string,
  adminName: string,
) {
  if (!db) throw new Error("Database not configured");

  await db
    .update(entries)
    .set({
      partnerEntryId: entryIdB,
      pairedByAdminId: adminId,
      pairedByAdminName: adminName,
    })
    .where(eq(entries.id, entryIdA));
  await db
    .update(entries)
    .set({
      partnerEntryId: entryIdA,
      pairedByAdminId: adminId,
      pairedByAdminName: adminName,
    })
    .where(eq(entries.id, entryIdB));
}

export async function createGuestEntryAction(formData: FormData) {
  const tournamentId = (formData.get("tournamentId") as string)?.trim();
  if (!tournamentId) throw new Error("Tournament is required");

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Player name is required");

  const ctx = await assertGuestTournamentAccess(tournamentId);
  const adminName = await getAdminDisplayName(ctx);

  // Solo guests do not occupy a team slot until they are paired.
  const phone = (formData.get("phone") as string | null)?.trim() || "—";
  const playingSide = parsePlayingSide(formData.get("playingSide"));

  await db!.insert(entries).values({
    tournamentId,
    userId: null,
    name,
    email: createGuestEmail(),
    phone,
    signupMode: "solo",
    partnershipStatus: "not_applicable",
    playingSide,
    skillLevel: "intermediate",
    status: "approved",
    isGuest: true,
    addedByAdminId: ctx.userId,
    addedByAdminName: adminName,
  });

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function createGuestTeamAction(formData: FormData) {
  const tournamentId = (formData.get("tournamentId") as string)?.trim();
  if (!tournamentId) throw new Error("Tournament is required");

  const nameA = (formData.get("nameA") as string)?.trim();
  const nameB = (formData.get("nameB") as string)?.trim();
  if (!nameA || !nameB) throw new Error("Both player names are required");
  if (nameA.toLowerCase() === nameB.toLowerCase()) {
    throw new Error("Player names must be different");
  }

  const ctx = await assertGuestTournamentAccess(tournamentId);
  const adminName = await getAdminDisplayName(ctx);

  const capacity = await getTournamentCapacity(tournamentId);
  if (!capacity) throw new Error("Tournament not found");

  const entryStatus = capacity.isFull ? "waitlisted" : "approved";
  const phoneA = (formData.get("phoneA") as string | null)?.trim() || "—";
  const phoneB = (formData.get("phoneB") as string | null)?.trim() || "—";
  const playingSideA = parsePlayingSide(formData.get("playingSideA"));
  const playingSideB = parsePlayingSide(formData.get("playingSideB"));

  const guestEntryValues = {
    tournamentId,
    userId: null as null,
    signupMode: "solo" as const,
    partnershipStatus: "not_applicable" as const,
    skillLevel: "intermediate",
    status: entryStatus as "approved" | "waitlisted",
    isGuest: true,
    addedByAdminId: ctx.userId,
    addedByAdminName: adminName,
  };

  const [entryA] = await db!
    .insert(entries)
    .values({
      ...guestEntryValues,
      name: nameA,
      email: createGuestEmail(),
      phone: phoneA,
      playingSide: playingSideA,
    })
    .returning({ id: entries.id });

  const [entryB] = await db!
    .insert(entries)
    .values({
      ...guestEntryValues,
      name: nameB,
      email: createGuestEmail(),
      phone: phoneB,
      playingSide: playingSideB,
    })
    .returning({ id: entries.id });

  await linkEntriesAsPair(entryA.id, entryB.id, ctx.userId, adminName);

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function pairEntriesAction(entryIdA: string, entryIdB: string) {
  if (!db) throw new Error("Database not configured");
  if (entryIdA === entryIdB) throw new Error("Select two different players");

  const ctx = await requirePermission("entries:manage");
  const clerkUser = await currentUser();
  const pairedByAdminName = clerkUser
    ? getUserDisplayName(
        {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          emailAddresses: clerkUser.emailAddresses,
          publicMetadata: clerkUser.publicMetadata as AdminMetadata,
        },
        ctx.email,
      )
    : ctx.email;

  await assertEntryPairingAccess(entryIdA);
  await assertEntryPairingAccess(entryIdB);

  const entryA = await getEntryById(entryIdA);
  const entryB = await getEntryById(entryIdB);

  if (!entryA || !entryB) throw new Error("Entry not found");
  if (entryA.tournamentId !== entryB.tournamentId) {
    throw new Error("Players must be in the same tournament");
  }

  if (isPartnershipTeamEntry(entryA) || isPartnershipTeamEntry(entryB)) {
    throw new Error("Players who registered together are already a team and cannot be paired again");
  }

  if (entryA.signupMode === "with_partner" || entryB.signupMode === "with_partner") {
    throw new Error("Partnership sign-ups cannot be manually paired");
  }

  if (await isEntryPaired(entryIdA) || (await isEntryPaired(entryIdB))) {
    throw new Error("One or both players are already paired. Unpair first.");
  }

  if (!entryA.tournamentId) throw new Error("Tournament not found");
  const capacity = await getTournamentCapacity(entryA.tournamentId);
  if (!capacity || capacity.isFull) {
    throw new Error("Tournament is full. Free a team spot before creating a new pair.");
  }

  // Guest entries (userId null) are valid manual pair targets alongside registered members.
  await linkEntriesAsPair(entryIdA, entryIdB, ctx.userId, pairedByAdminName);

  revalidatePath("/admin");
}

export async function unpairEntryAction(entryId: string) {
  await assertEntryPairingAccess(entryId);
  if (!db) throw new Error("Database not configured");

  const [entry] = await db
    .select({ partnerEntryId: entries.partnerEntryId })
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);

  if (!entry) throw new Error("Entry not found");

  const partnerId = entry.partnerEntryId;
  const clearPairing = {
    partnerEntryId: null as null,
    pairedByAdminId: null as null,
    pairedByAdminName: null as null,
  };

  await db.update(entries).set(clearPairing).where(eq(entries.id, entryId));

  if (partnerId) {
    await db.update(entries).set(clearPairing).where(eq(entries.id, partnerId));
  } else {
    await db.update(entries).set(clearPairing).where(eq(entries.partnerEntryId, entryId));
  }

  revalidatePath("/admin");
}

async function withdrawEntryRecord(entryId: string) {
  if (!db) throw new Error("Database not configured");

  await clearEntryPairing(entryId);

  await db
    .update(entries)
    .set({ status: "rejected", partnershipStatus: "rejected" })
    .where(eq(entries.id, entryId));
}

export async function withdrawEntryAction(entryId: string, mode: "solo" | "team") {
  const user = await requireApprovedUser();
  if (!db) throw new Error("Database not configured");

  const entry = await getEntryById(entryId);
  if (!entry?.tournamentId) throw new Error("Registration not found");

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  const tournamentEntries = await getEntriesForTournament(entry.tournamentId);

  if (mode === "team") {
    if (!userCanWithdrawTeam(entry, user.id, userEmail, tournamentEntries)) {
      throw new Error("You cannot cancel this team registration");
    }

    if (isPartnershipTeamEntry(entry) || entry.signupMode === "with_partner") {
      await withdrawEntryRecord(entry.id);

      if (entry.partnerUserId) {
        await notifyUserSafe(entry.partnerUserId, {
          type: "entry_rejected",
          title: "Team registration cancelled",
          message: `The team registration for ${entry.tournamentName} was cancelled.`,
          href: "/signup",
        });
      }

      const playerUserId = await resolveEntryUserId(entry);
      if (playerUserId) {
        await notifyUserSafe(playerUserId, {
          type: "entry_rejected",
          title: "Team registration cancelled",
          message: `Your team registration for ${entry.tournamentName} was cancelled.`,
          href: "/signup",
        });
      }
    } else {
      const partner = findManualPairPartner(entry, tournamentEntries);
      if (!partner) {
        throw new Error("This team pairing could not be found");
      }

      await withdrawEntryRecord(entry.id);
      await withdrawEntryRecord(partner.id);

      const notifyIds = new Set<string>();
      const primaryUserId = await resolveEntryUserId(entry);
      const partnerUserId = await resolveEntryUserId(partner);
      if (primaryUserId) notifyIds.add(primaryUserId);
      if (partnerUserId) notifyIds.add(partnerUserId);

      for (const notifyUserId of notifyIds) {
        await notifyUserSafe(notifyUserId, {
          type: "entry_rejected",
          title: "Team registration cancelled",
          message: `Your team registration for ${entry.tournamentName} was cancelled.`,
          href: "/signup",
        });
      }
    }
  } else {
    if (!userCanWithdrawSolo(entry, user.id, tournamentEntries, userEmail)) {
      throw new Error("Use team cancellation to withdraw from a team registration");
    }

    await withdrawEntryRecord(entry.id);

    await notifyUserSafe(user.id, {
      type: "entry_rejected",
      title: "Registration cancelled",
      message: `Your registration for ${entry.tournamentName} was cancelled.`,
      href: "/signup",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function updateEntryStatusAction(entryId: string, status: "approved" | "rejected") {
  await assertEntryAccess(entryId);
  if (!db) throw new Error("Database not configured");

  const entry = await getEntryById(entryId);
  if (!entry) throw new Error("Entry not found");

  if (status === "approved" && !canAdminApproveEntry(entry.partnershipStatus ?? "not_applicable")) {
    if (entry.partnershipStatus === "pending_partner") {
      throw new Error("This entry is waiting for the registered partner to approve");
    }
    throw new Error("This partnership was rejected and cannot be approved");
  }

  if (status === "approved" && entry.tournamentId && entryWouldOccupyTeamSlot(entry)) {
    const capacity = await getTournamentCapacity(entry.tournamentId);
    if (capacity?.isFull) {
      await db
        .update(entries)
        .set({ status: "waitlisted", partnershipStatus: "approved" })
        .where(eq(entries.id, entryId));

      await notifyUserSafe(await resolveEntryUserId(entry), {
        type: "entry_waitlisted",
        title: "Added to waiting list",
        message: `${entry.tournamentName} is full. Your team has been placed on the waiting list.`,
        href: "/signup",
      });

      revalidatePath("/admin");
      revalidatePath("/signup");
      revalidatePath("/");
      return;
    }
  }

  const updates =
    status === "approved" &&
    (entry.signupMode === "with_partner" || entry.partnershipStatus === "pending_admin")
      ? { status, partnershipStatus: "approved" as const }
      : { status };

  await db.update(entries).set(updates).where(eq(entries.id, entryId));

  if (status === "approved") {
    const playerUserId = await resolveEntryUserId(entry);
    const partnerLabel = entry.partnerName ?? entry.partnerPlayerName;

    await notifyUserSafe(playerUserId, {
      type: "entry_approved",
      title: entryWouldOccupyTeamSlot(entry)
        ? "Team confirmed"
        : "Registration approved",
      message: partnerLabel
        ? `Your team for ${entry.tournamentName} with ${partnerLabel} has been confirmed.`
        : entryWouldOccupyTeamSlot(entry)
          ? `Your team for ${entry.tournamentName} has been confirmed.`
          : `Your registration for ${entry.tournamentName} is approved. You will be confirmed once paired into a team.`,
      href: "/signup",
    });

    if (entry.signupMode === "with_partner" && entry.partnerUserId) {
      await notifyUserSafe(entry.partnerUserId, {
        type: "entry_approved",
        title: "Team confirmed",
        message: `Your team for ${entry.tournamentName} with ${entry.name} has been confirmed.`,
        href: "/signup",
      });
    }
  } else if (status === "rejected") {
    await notifyUserSafe(await resolveEntryUserId(entry), {
      type: "entry_rejected",
      title: "Tournament entry not approved",
      message: `Your entry for ${entry.tournamentName} was not approved.`,
      href: "/signup",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

async function clearEntryPairing(entryId: string) {
  if (!db) throw new Error("Database not configured");

  const [entry] = await db
    .select({ partnerEntryId: entries.partnerEntryId })
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);

  if (!entry) throw new Error("Entry not found");

  const partnerId = entry.partnerEntryId;
  const clearPairing = {
    partnerEntryId: null as null,
    pairedByAdminId: null as null,
    pairedByAdminName: null as null,
  };

  await db.update(entries).set(clearPairing).where(eq(entries.id, entryId));

  if (partnerId) {
    await db.update(entries).set(clearPairing).where(eq(entries.id, partnerId));
  } else {
    await db.update(entries).set(clearPairing).where(eq(entries.partnerEntryId, entryId));
  }
}

export async function demoteEntryToWaitlistAction(entryId: string) {
  await assertEntryAccess(entryId);
  if (!db) throw new Error("Database not configured");

  const entry = await getEntryById(entryId);
  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "approved") {
    throw new Error("Only confirmed players can be moved to the waiting list");
  }

  await clearEntryPairing(entryId);

  await db.update(entries).set({ status: "waitlisted" }).where(eq(entries.id, entryId));

  await notifyUserSafe(await resolveEntryUserId(entry), {
    type: "entry_waitlisted",
    title: "Moved to waiting list",
    message: `Your confirmed spot for ${entry.tournamentName} has been moved to the waiting list.`,
    href: "/signup",
  });

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function removeConfirmedEntryAction(entryId: string) {
  await assertEntryAccess(entryId);
  if (!db) throw new Error("Database not configured");

  const entry = await getEntryById(entryId);
  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "approved") {
    throw new Error("Only confirmed players can be removed from the roster");
  }

  await clearEntryPairing(entryId);

  await db
    .update(entries)
    .set({ status: "rejected", partnershipStatus: "rejected" })
    .where(eq(entries.id, entryId));

  await notifyUserSafe(await resolveEntryUserId(entry), {
    type: "entry_rejected",
    title: "Registration removed",
    message: `Your confirmed registration for ${entry.tournamentName} was removed by an admin.`,
    href: "/signup",
  });

  if (entry.signupMode === "with_partner" && entry.partnerUserId) {
    await notifyUserSafe(entry.partnerUserId, {
      type: "entry_rejected",
      title: "Team registration changed",
      message: `The team registration for ${entry.tournamentName} involving ${entry.name} was removed by an admin.`,
      href: "/signup",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function promoteEntryFromWaitlistAction(entryId: string) {
  await assertEntryAccess(entryId);
  if (!db) throw new Error("Database not configured");

  const entry = await getEntryById(entryId);
  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "waitlisted") {
    throw new Error("Only waiting-list players can be confirmed");
  }

  if (!canAdminApproveEntry(entry.partnershipStatus ?? "not_applicable")) {
    if (entry.partnershipStatus === "pending_partner") {
      throw new Error("This entry is waiting for the registered partner to approve");
    }
    throw new Error("This partnership was rejected and cannot be confirmed");
  }

  if (!entry.tournamentId) throw new Error("Tournament not found");

  if (entryWouldOccupyTeamSlot(entry)) {
    const capacity = await getTournamentCapacity(entry.tournamentId);
    if (!capacity || capacity.isFull) {
      throw new Error("Tournament is full. Remove a confirmed team first.");
    }
  }

  await db.update(entries).set({ status: "approved" }).where(eq(entries.id, entryId));

  await notifyUserSafe(await resolveEntryUserId(entry), {
    type: "entry_approved",
    title: entryWouldOccupyTeamSlot(entry) ? "Team confirmed" : "Registration approved",
    message: entryWouldOccupyTeamSlot(entry)
      ? `A team spot opened up for ${entry.tournamentName}. Your team is now confirmed.`
      : `Your registration for ${entry.tournamentName} is approved. You will be confirmed once paired into a team.`,
    href: "/signup",
  });

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function deleteTournamentEntryAction(entryId: string) {
  await assertEntryAccess(entryId);
  if (!db) throw new Error("Database not configured");

  const entry = await getEntryById(entryId);
  if (!entry) throw new Error("Entry not found");

  await clearEntryPairing(entryId);

  await db.delete(entries).where(eq(entries.id, entryId));

  await notifyUserSafe(await resolveEntryUserId(entry), {
    type: "entry_removed",
    title: "Tournament entry removed",
    message: `Your registration for ${entry.tournamentName} has been removed by an administrator.`,
    href: "/signup",
  });

  revalidatePath("/admin");
  revalidatePath("/signup");
  revalidatePath("/");
}

export async function createSponsorAction(input: {
  name: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  logoUrl: string;
  website?: string;
  linkType?: "website" | "instagram";
}) {
  await requirePermission("sponsors:manage");
  if (!db) throw new Error("Database not configured");

  const name = input.name?.trim();
  const logoUrl = input.logoUrl?.trim();
  const linkType = input.linkType ?? "website";
  const linkValue = input.website?.trim();

  if (!name) throw new Error("Sponsor name is required");
  if (!logoUrl) throw new Error("Sponsor logo is required");

  let website: string | null = null;
  if (linkValue) {
    website = normalizeSponsorLink(linkType, linkValue);
    if (!website) {
      throw new Error(
        linkType === "instagram"
          ? "Enter a valid Instagram handle or profile URL"
          : "Enter a valid website URL",
      );
    }
  }

  await insertSponsorRow({
    name,
    tier: input.tier,
    logoUrl,
    website,
    linkType,
  });

  revalidatePath("/sponsors");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteSponsorAction(id: string) {
  await requirePermission("sponsors:manage");
  if (!db) throw new Error("Database not configured");

  await db.delete(sponsors).where(eq(sponsors.id, id));
  revalidatePath("/sponsors");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createGalleryPhotoAction(formData: FormData) {
  const ctx = await requirePermission("gallery:manage");
  if (!db) throw new Error("Database not configured");

  const tournamentId = (formData.get("tournamentId") as string) || null;
  if (tournamentId && !canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  await db.insert(galleryPhotos).values({
    tournamentId,
    tournamentName: formData.get("tournamentName") as string,
    tournamentDate: (formData.get("tournamentDate") as string) || null,
    imageUrl: formData.get("imageUrl") as string,
    caption: formData.get("caption") as string,
  });

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createSponsorsBulkAction(
  items: {
    name: string;
    tier: string;
    logoUrl: string;
    website?: string;
    linkType?: "website" | "instagram";
  }[],
) {
  await requirePermission("sponsors:manage");
  if (!db) throw new Error("Database not configured");
  if (items.length === 0) return;

  for (const item of items) {
    const linkType = item.linkType ?? "website";
    const linkValue = item.website?.trim();
    let website: string | null = null;

    if (linkValue) {
      website = normalizeSponsorLink(linkType, linkValue);
      if (!website) {
        throw new Error(
          linkType === "instagram"
            ? `Invalid Instagram link for sponsor "${item.name}"`
            : `Invalid website link for sponsor "${item.name}"`,
        );
      }
    }

    await insertSponsorRow({
      name: item.name,
      tier: item.tier as "platinum" | "gold" | "silver" | "bronze",
      logoUrl: item.logoUrl,
      website,
      linkType,
    });
  }

  revalidatePath("/sponsors");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createGalleryPhotosBulkAction(
  items: {
    tournamentName: string;
    imageUrl: string;
    caption: string;
    tournamentId?: string;
    tournamentDate?: string;
  }[],
) {
  const ctx = await requirePermission("gallery:manage");
  if (!db) throw new Error("Database not configured");
  if (items.length === 0) return;

  for (const item of items) {
    if (item.tournamentId && !canManageTournament(ctx, item.tournamentId)) {
      throw new Error(`You do not have access to tournament: ${item.tournamentName}`);
    }
  }

  await db.insert(galleryPhotos).values(
    items.map((item) => ({
      tournamentId: item.tournamentId ?? null,
      tournamentName: item.tournamentName,
      tournamentDate: item.tournamentDate ?? null,
      imageUrl: item.imageUrl,
      caption: item.caption,
    })),
  );

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteGalleryPhotoAction(photoId: string) {
  const ctx = await requirePermission("gallery:manage");
  if (!db) throw new Error("Database not configured");

  const [photo] = await db
    .select({
      id: galleryPhotos.id,
      tournamentId: galleryPhotos.tournamentId,
      tournamentName: galleryPhotos.tournamentName,
    })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, photoId))
    .limit(1);

  if (!photo) throw new Error("Photo not found");
  if (photo.tournamentId && !canManageTournament(ctx, photo.tournamentId)) {
    throw new Error(`You do not have access to tournament: ${photo.tournamentName}`);
  }

  await db.delete(galleryPhotos).where(eq(galleryPhotos.id, photoId));

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateGalleryPhotoCaptionAction(photoId: string, caption: string) {
  const ctx = await requirePermission("gallery:manage");
  if (!db) throw new Error("Database not configured");

  const [photo] = await db
    .select({
      id: galleryPhotos.id,
      tournamentId: galleryPhotos.tournamentId,
      tournamentName: galleryPhotos.tournamentName,
    })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, photoId))
    .limit(1);

  if (!photo) throw new Error("Photo not found");
  if (photo.tournamentId && !canManageTournament(ctx, photo.tournamentId)) {
    throw new Error(`You do not have access to tournament: ${photo.tournamentName}`);
  }

  await db
    .update(galleryPhotos)
    .set({ caption: caption.trim() })
    .where(eq(galleryPhotos.id, photoId));

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateGalleryTournamentNameAction(
  currentName: string,
  newName: string,
  tournamentId?: string | null,
) {
  const ctx = await requirePermission("gallery:manage");
  if (!db) throw new Error("Database not configured");

  const trimmedCurrent = currentName.trim();
  const trimmedNew = newName.trim();
  if (!trimmedCurrent) throw new Error("Current tournament name is required");
  if (!trimmedNew) throw new Error("Tournament name is required");
  if (trimmedCurrent === trimmedNew) return;

  const photos = await db
    .select({
      id: galleryPhotos.id,
      tournamentId: galleryPhotos.tournamentId,
    })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.tournamentName, trimmedCurrent));

  if (photos.length === 0) throw new Error("No gallery photos found for this tournament");

  const scopedIds = new Set(
    photos.map((photo) => photo.tournamentId).filter((id): id is string => Boolean(id)),
  );

  if (tournamentId && !scopedIds.has(tournamentId) && scopedIds.size > 0) {
    throw new Error("Tournament group mismatch");
  }

  for (const id of scopedIds) {
    if (!canManageTournament(ctx, id)) {
      throw new Error("You do not have access to this tournament");
    }
  }

  if (scopedIds.size === 0 && ctx.role === "tournament_admin" && !ctx.isSuperAdmin) {
    throw new Error("Only full admins can rename unlinked gallery groups");
  }

  await db
    .update(galleryPhotos)
    .set({ tournamentName: trimmedNew })
    .where(eq(galleryPhotos.tournamentName, trimmedCurrent));

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createResultAction(formData: FormData) {
  const ctx = await requirePermission("results:manage");
  if (!db) throw new Error("Database not configured");

  const tournamentId = (formData.get("tournamentId") as string)?.trim();
  if (!tournamentId) throw new Error("Tournament is required");
  if (!canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      date: tournaments.date,
      status: tournaments.status,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status === "completed") {
    throw new Error("This tournament is already completed");
  }

  const [existingResult] = await db
    .select({ id: results.id })
    .from(results)
    .where(eq(results.tournamentId, tournamentId))
    .limit(1);

  if (existingResult) {
    throw new Error("Results have already been published for this tournament");
  }

  const winners = JSON.parse(formData.get("winners") as string) as {
    place: string;
    names: string;
  }[];

  const requiredPlaces = ["1st", "2nd", "3rd", "4th"] as const;
  const normalizedWinners: { place: string; names: string }[] = [];

  for (const place of requiredPlaces) {
    const winner = winners.find((entry) => entry.place === place);
    const names = winner?.names?.trim() ?? "";
    if (!names) {
      throw new Error(`${place} place team is required`);
    }
    normalizedWinners.push({ place, names });
  }

  const teamNames = normalizedWinners.map((winner) => winner.names);
  if (new Set(teamNames).size !== teamNames.length) {
    throw new Error("Each team can only be placed once");
  }

  const tournamentEntries = await getEntriesForTournament(tournamentId);
  const validLabels = new Set(getConfirmedTeamOptions(tournamentEntries).map((team) => team.label));
  for (const name of teamNames) {
    if (!validLabels.has(name)) {
      throw new Error(`"${name}" is not a confirmed team for this tournament`);
    }
  }

  if (validLabels.size < 4) {
    throw new Error("This tournament needs at least 4 confirmed teams before it can end");
  }

  await db.insert(results).values({
    tournamentId,
    tournamentName: tournament.name,
    date: tournament.date,
    winners: normalizedWinners,
  });
  await db
    .update(tournaments)
    .set({ status: "completed" })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath("/results");
  revalidatePath("/rankings");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/signup");
}

export async function upsertPlayerPhotoAction(input: {
  displayName: string;
  photoUrl: string;
}) {
  await requirePermission("results:manage");
  if (!db) throw new Error("Database not configured");

  const displayName = input.displayName?.trim();
  const photoUrl = input.photoUrl?.trim();

  if (!displayName) throw new Error("Player name is required");
  if (!photoUrl) throw new Error("Player photo is required");

  await upsertPlayerProfile({
    nameKey: normalizePlayerKey(displayName),
    displayName,
    photoUrl,
  });

  revalidatePath("/rankings");
  revalidatePath("/admin");
}

export async function deletePlayerPhotoAction(id: string) {
  await requirePermission("results:manage");
  if (!db) throw new Error("Database not configured");

  await deletePlayerProfile(id);
  revalidatePath("/rankings");
  revalidatePath("/admin");
}

export async function approveUserAction(userId: string) {
  await requirePermission("users:approve");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = user.publicMetadata as AdminMetadata;

  if (!hasRequiredProfile(metadata, user)) {
    throw new Error("This user must complete first and last name before approval.");
  }

  const firstName =
    user.firstName?.trim() || metadata.profileFirstName?.trim() || undefined;
  const lastName =
    user.lastName?.trim() || metadata.profileLastName?.trim() || undefined;

  if (firstName && lastName) {
    try {
      await client.users.updateUser(userId, { firstName, lastName });
    } catch (error) {
      console.warn("[clerk] Could not update firstName/lastName on user record:", error);
    }
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      approved: true,
      status: "approved",
      profileComplete: true,
    },
  });

  await ensureMembershipNumber(userId);

  revalidatePath("/admin");
}

export type AssignMembershipResult =
  | { ok: true; membershipNumber: string }
  | { ok: false; error: string };

export async function assignMembershipNumberAction(input: {
  userId?: string;
  email?: string;
}): Promise<AssignMembershipResult> {
  try {
    await requirePermission("users:approve");

    let userId = input.userId?.trim();
    const email = input.email?.trim().toLowerCase();

    if (!userId && email) {
      const user = await findUserByEmail(email);
      if (!user) {
        return { ok: false, error: `No account found for ${email}.` };
      }
      userId = user.id;
    }

    if (!userId) {
      return { ok: false, error: "Enter a member email or select a user." };
    }

    const membershipNumber = await ensureMembershipNumber(userId);

    revalidatePath("/admin");
    revalidatePath("/signup");

    return { ok: true, membershipNumber };
  } catch (error) {
    console.error("[assignMembershipNumberAction]", error);
    return {
      ok: false,
      error: "Could not assign a membership number. Please try again.",
    };
  }
}

export async function completeProfileAction(formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in.");

  const firstName = normalizeProfileName(String(formData.get("firstName") ?? ""));
  const lastName = normalizeProfileName(String(formData.get("lastName") ?? ""));
  const validationError = validateRegistrationNames(firstName, lastName);
  if (validationError) throw new Error(validationError);

  await syncClerkUserProfileNames(user.id, firstName, lastName);

  await ensureMembershipNumber(user.id);

  revalidatePath("/");
  revalidatePath("/complete-profile");
  revalidatePath("/pending-approval");
}

export async function rejectUserAction(userId: string) {
  await requirePermission("users:approve");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      approved: false,
      status: "rejected",
    },
  });

  await client.users.banUser(userId);
  revalidatePath("/admin");
}

export async function deleteUserAction(userId: string) {
  const ctx = await requirePermission("users:approve");
  if (ctx.userId === userId) throw new Error("You cannot delete yourself");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.publicMetadata as AdminMetadata;

  if (hasAdminAccess(meta)) {
    if (meta.role === "super_admin") {
      throw new Error("Cannot delete a super admin");
    }
    if (!ctx.isSuperAdmin) {
      throw new Error("Only super admins can delete admin accounts");
    }
  }

  await client.users.deleteUser(userId);
  revalidatePath("/admin");
}

export async function removeMemberAction(userId: string) {
  await deleteUserAction(userId);
}

export async function promoteAdminAction(input: {
  email: string;
  role: AdminRole;
  permissions?: Permission[];
  tournamentIds?: string[];
}) {
  await requireSuperAdmin();

  const user = await findUserByEmail(input.email.trim().toLowerCase());
  if (!user) throw new Error("No user found with that email. They must sign up first.");

  if (input.role === "super_admin") {
    throw new Error("Cannot promote to super admin via this form");
  }

  const permissions =
    input.role === "tournament_admin"
      ? (input.permissions?.length
          ? input.permissions
          : (["entries:manage", "gallery:manage", "results:manage"] as Permission[]))
      : (input.permissions ?? [...ADMIN_ASSIGNABLE_PERMISSIONS]);

  if (input.role === "tournament_admin" && !(input.tournamentIds?.length ?? 0)) {
    throw new Error("Tournament admin must be assigned at least one tournament");
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...user.publicMetadata,
      role: input.role,
      permissions,
      tournamentIds: input.role === "tournament_admin" ? input.tournamentIds : [],
      approved: true,
      status: "approved",
    },
  });

  revalidatePath("/admin");
}

export async function updateAdminAction(input: {
  userId: string;
  role: AdminRole;
  permissions: Permission[];
  tournamentIds?: string[];
}) {
  const ctx = await requireSuperAdmin();
  if (ctx.userId === input.userId) throw new Error("You cannot edit your own admin profile");

  if (input.role === "super_admin") {
    throw new Error("Cannot change role to super admin via this form");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(input.userId);
  const currentRole = user.publicMetadata?.role as string | undefined;

  if (currentRole === "super_admin") {
    throw new Error("Cannot modify a super admin");
  }

  if (input.role === "tournament_admin" && !(input.tournamentIds?.length ?? 0)) {
    throw new Error("Tournament admin must be assigned at least one tournament");
  }

  await client.users.updateUserMetadata(input.userId, {
    publicMetadata: {
      ...user.publicMetadata,
      role: input.role,
      permissions: input.permissions,
      tournamentIds: input.role === "tournament_admin" ? input.tournamentIds : [],
      approved: true,
      status: "approved",
    },
  });

  revalidatePath("/admin");
}

export async function demoteAdminAction(userId: string) {
  const ctx = await requireSuperAdmin();
  if (ctx.userId === userId) throw new Error("You cannot demote yourself");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const currentRole = user.publicMetadata?.role as string | undefined;

  if (currentRole === "super_admin") {
    throw new Error("Cannot demote a super admin");
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      role: undefined,
      permissions: undefined,
      tournamentIds: undefined,
      approved: true,
      status: "approved",
    },
  });

  revalidatePath("/admin");
}

export async function getCurrentAdminPermissionsAction() {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  return {
    role: ctx.role,
    permissions: ctx.permissions,
    tournamentIds: ctx.tournamentIds,
    isSuperAdmin: ctx.isSuperAdmin,
  };
}

export async function fetchUnreadNotificationsAction(): Promise<AppNotification[]> {
  const user = await currentUser();
  if (!user) return [];
  return getUnreadNotifications(user.id);
}

export async function fetchUnreadNotificationCountAction() {
  const user = await currentUser();
  if (!user) return 0;
  return getUnreadNotificationCount(user.id);
}

export async function dismissNotificationAction(notificationId: string) {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in");
  await markNotificationRead(notificationId, user.id);
}

export async function dismissAllNotificationsAction() {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in");
  await markAllNotificationsRead(user.id);
}
