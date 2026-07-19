"use server";

import { revalidatePath } from "next/cache";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, max } from "drizzle-orm";
import { findUserByEmail } from "@/lib/admin-members";
import {
  getAdminContext,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { countTournamentsByType, getEntryById, hasExistingEntry } from "@/lib/db/queries";
import {
  entries,
  galleryPhotos,
  results,
  sponsors,
  tournamentTypes,
  tournaments,
} from "@/lib/db/schema";
import { canAdminApproveEntry } from "@/lib/partnerships";
import { parsePlayingSide } from "@/lib/player-profile";
import {
  createNotification,
  getUnreadNotificationCount,
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";
import { hasAdminAccess } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";
import {
  ADMIN_ASSIGNABLE_PERMISSIONS,
  canManageTournament,
  type AdminRole,
  type Permission,
} from "@/lib/permissions";

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
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.emailAddresses[0]?.emailAddress ||
    "Your partner"
  );
}

export async function createTournamentAction(formData: FormData) {
  await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");

  const tournamentTypeId = formData.get("tournamentTypeId") as string;
  if (!tournamentTypeId) throw new Error("Tournament type is required");

  await db.insert(tournaments).values({
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    location: formData.get("location") as string,
    tournamentTypeId,
    description: formData.get("description") as string,
    maxPlayers: Number(formData.get("maxPlayers")),
    status: "upcoming",
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/signup");
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

export async function createEntryAction(formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in to register");

  if (!db) throw new Error("Database not configured");

  const tournamentId = formData.get("tournamentId") as string;
  const email = (formData.get("email") as string).trim().toLowerCase();
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  const playingSide = parsePlayingSide(formData.get("playingSide"));

  if (userEmail && email !== userEmail) {
    throw new Error("Email must match your account email");
  }

  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      pairingMode: tournamentTypes.pairingMode,
    })
    .from(tournaments)
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");

  const signupMode =
    tournament.pairingMode === "random"
      ? "solo"
      : ((formData.get("signupMode") as "solo" | "with_partner") || "solo");
  const partnerType = formData.get("partnerType") as "registered" | "unregistered" | null;
  const partnerEmail = (formData.get("partnerEmail") as string | null)?.trim().toLowerCase() || null;
  const partnerName = (formData.get("partnerName") as string | null)?.trim() || null;

  if (await hasExistingEntry(tournamentId, email, user.id)) {
    throw new Error("You are already registered for this tournament");
  }

  let partnershipStatus: "not_applicable" | "pending_partner" | "pending_admin" | "approved" =
    "not_applicable";
  let partnerUserId: string | null = null;
  let resolvedPartnerName: string | null = null;
  let resolvedPartnerEmail: string | null = null;

  if (signupMode === "with_partner") {
    if (partnerType === "registered") {
      if (!partnerEmail) throw new Error("Partner email is required");

      if (partnerEmail === email) {
        throw new Error("You cannot select yourself as your partner");
      }

      const partnerUser = await findUserByEmail(partnerEmail);
      if (!partnerUser) {
        throw new Error(
          "No registered member found with that email. Choose “Not registered yet” instead.",
        );
      }

      const partnerMeta = partnerUser.publicMetadata as AdminMetadata;
      if (!hasAdminAccess(partnerMeta) && partnerMeta?.approved !== true) {
        throw new Error("Your partner must be a registered and approved member");
      }

      partnerUserId = partnerUser.id;
      resolvedPartnerEmail = partnerEmail;
      resolvedPartnerName = [partnerUser.firstName, partnerUser.lastName]
        .filter(Boolean)
        .join(" ") || partnerEmail;
      partnershipStatus = "pending_partner";
    } else {
      if (!partnerName) throw new Error("Partner name is required");
      resolvedPartnerName = partnerName;
      partnershipStatus = "pending_admin";
    }
  }

  await db.insert(entries).values({
    tournamentId,
    userId: user.id,
    name: formData.get("name") as string,
    email,
    phone: formData.get("phone") as string,
    signupMode,
    partnerName: resolvedPartnerName,
    partnerEmail: resolvedPartnerEmail,
    partnerUserId,
    partnershipStatus,
    playingSide,
    skillLevel: formData.get("skillLevel") as string,
    notes: (formData.get("notes") as string) || null,
    status: "pending",
  });

  if (partnershipStatus === "pending_partner" && partnerUserId) {
    await notifyUserSafe(partnerUserId, {
      type: "partnership_invite",
      title: "New partnership request",
      message: `${formData.get("name") as string} invited you to partner for ${tournament.name}.`,
      href: "/signup",
    });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...user.publicMetadata,
      playingSide,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/signup");
}

async function assertPartnershipAccess(entryId: string) {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in");

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
  if (!canManageTournament(ctx, entry.tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }
  if (entry.status === "rejected") {
    throw new Error("Cannot pair a rejected entry");
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

export async function pairEntriesAction(entryIdA: string, entryIdB: string) {
  if (!db) throw new Error("Database not configured");
  if (entryIdA === entryIdB) throw new Error("Select two different players");

  await assertEntryPairingAccess(entryIdA);
  await assertEntryPairingAccess(entryIdB);

  const [entryA] = await db
    .select({ tournamentId: entries.tournamentId })
    .from(entries)
    .where(eq(entries.id, entryIdA))
    .limit(1);
  const [entryB] = await db
    .select({ tournamentId: entries.tournamentId })
    .from(entries)
    .where(eq(entries.id, entryIdB))
    .limit(1);

  if (!entryA || !entryB) throw new Error("Entry not found");
  if (entryA.tournamentId !== entryB.tournamentId) {
    throw new Error("Players must be in the same tournament");
  }

  if (await isEntryPaired(entryIdA) || await isEntryPaired(entryIdB)) {
    throw new Error("One or both players are already paired. Unpair first.");
  }

  await db.update(entries).set({ partnerEntryId: entryIdB }).where(eq(entries.id, entryIdA));
  await db.update(entries).set({ partnerEntryId: entryIdA }).where(eq(entries.id, entryIdB));

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

  await db.update(entries).set({ partnerEntryId: null }).where(eq(entries.id, entryId));

  if (partnerId) {
    await db.update(entries).set({ partnerEntryId: null }).where(eq(entries.id, partnerId));
  } else {
    await db
      .update(entries)
      .set({ partnerEntryId: null })
      .where(eq(entries.partnerEntryId, entryId));
  }

  revalidatePath("/admin");
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

  const updates =
    status === "approved" && entry.partnershipStatus === "pending_admin"
      ? { status, partnershipStatus: "approved" as const }
      : { status };

  await db.update(entries).set(updates).where(eq(entries.id, entryId));

  if (status === "approved") {
    const playerUserId = await resolveEntryUserId(entry);

    if (entry.partnershipStatus === "pending_admin" && entry.partnerName) {
      await notifyUserSafe(playerUserId, {
        type: "entry_approved",
        title: "Tournament entry approved",
        message: `Your entry for ${entry.tournamentName} with ${entry.partnerName} has been approved.`,
        href: "/signup",
      });
    } else {
      const partnerLabel = entry.partnerName ?? entry.partnerPlayerName;
      await notifyUserSafe(playerUserId, {
        type: "entry_approved",
        title: "Tournament entry approved",
        message: partnerLabel
          ? `Your entry for ${entry.tournamentName} with ${partnerLabel} has been approved.`
          : `Your entry for ${entry.tournamentName} has been approved.`,
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
}

export async function createSponsorAction(input: {
  name: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  logoUrl: string;
  website?: string;
}) {
  await requirePermission("sponsors:manage");
  if (!db) throw new Error("Database not configured");

  const name = input.name?.trim();
  const logoUrl = input.logoUrl?.trim();

  if (!name) throw new Error("Sponsor name is required");
  if (!logoUrl) throw new Error("Sponsor logo is required");

  await db.insert(sponsors).values({
    name,
    tier: input.tier,
    logoUrl,
    website: input.website?.trim() || null,
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
    imageUrl: formData.get("imageUrl") as string,
    caption: formData.get("caption") as string,
  });

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createSponsorsBulkAction(
  items: { name: string; tier: string; logoUrl: string; website?: string }[],
) {
  await requirePermission("sponsors:manage");
  if (!db) throw new Error("Database not configured");
  if (items.length === 0) return;

  await db.insert(sponsors).values(
    items.map((item) => ({
      name: item.name,
      tier: item.tier as "platinum" | "gold" | "silver" | "bronze",
      logoUrl: item.logoUrl,
      website: item.website ?? null,
    })),
  );

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
      imageUrl: item.imageUrl,
      caption: item.caption,
    })),
  );

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createResultAction(formData: FormData) {
  const ctx = await requirePermission("results:manage");
  if (!db) throw new Error("Database not configured");

  const tournamentId = formData.get("tournamentId") as string;
  if (!canManageTournament(ctx, tournamentId)) {
    throw new Error("You do not have access to this tournament");
  }

  const winners = JSON.parse(formData.get("winners") as string) as {
    place: string;
    names: string;
  }[];

  const tournamentName = formData.get("tournamentName") as string;
  const date = formData.get("date") as string;

  await db.insert(results).values({ tournamentId, tournamentName, date, winners });
  await db
    .update(tournaments)
    .set({ status: "completed" })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath("/results");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function approveUserAction(userId: string) {
  await requirePermission("users:approve");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      approved: true,
      status: "approved",
    },
  });

  revalidatePath("/admin");
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

export async function removeMemberAction(userId: string) {
  const ctx = await requireSuperAdmin();
  if (ctx.userId === userId) throw new Error("You cannot remove yourself");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      approved: false,
      status: "removed",
    },
  });

  await client.users.banUser(userId);
  revalidatePath("/admin");
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
