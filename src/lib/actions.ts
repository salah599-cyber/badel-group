"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { eq, max } from "drizzle-orm";
import { findUserByEmail } from "@/lib/admin-members";
import {
  getAdminContext,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { countTournamentsByType } from "@/lib/db/queries";
import {
  entries,
  galleryPhotos,
  results,
  sponsors,
  tournamentTypes,
  tournaments,
} from "@/lib/db/schema";
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
  if (!db) throw new Error("Database not configured");

  const tournamentId = formData.get("tournamentId") as string;

  const [tournament] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) throw new Error("Tournament not found");

  await db.insert(entries).values({
    tournamentId,
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    skillLevel: formData.get("skillLevel") as string,
    notes: (formData.get("notes") as string) || null,
    status: "pending",
  });

  revalidatePath("/admin");
  revalidatePath("/signup");
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

  await db.update(entries).set({ status }).where(eq(entries.id, entryId));
  revalidatePath("/admin");
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
