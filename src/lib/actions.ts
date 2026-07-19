"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { findUserByEmail } from "@/lib/admin-members";
import {
  getAdminContext,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { entries, galleryPhotos, results, sponsors, tournaments } from "@/lib/db/schema";
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

export async function createTournamentAction(formData: FormData) {
  await requirePermission("tournaments:manage");
  if (!db) throw new Error("Database not configured");

  await db.insert(tournaments).values({
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    location: formData.get("location") as string,
    format: formData.get("format") as "singles" | "doubles",
    description: formData.get("description") as string,
    maxPlayers: Number(formData.get("maxPlayers")),
    status: "upcoming",
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createEntryAction(formData: FormData) {
  if (!db) throw new Error("Database not configured");

  await db.insert(entries).values({
    tournamentId: formData.get("tournamentId") as string,
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    partnerName: (formData.get("partnerName") as string) || null,
    skillLevel: formData.get("skillLevel") as string,
    notes: (formData.get("notes") as string) || null,
    status: "pending",
  });

  revalidatePath("/admin");
}

export async function updateEntryStatusAction(entryId: string, status: "approved" | "rejected") {
  await assertEntryAccess(entryId);
  if (!db) throw new Error("Database not configured");

  await db.update(entries).set({ status }).where(eq(entries.id, entryId));
  revalidatePath("/admin");
}

export async function createSponsorAction(formData: FormData) {
  await requirePermission("sponsors:manage");
  if (!db) throw new Error("Database not configured");

  await db.insert(sponsors).values({
    name: formData.get("name") as string,
    tier: formData.get("tier") as "platinum" | "gold" | "silver" | "bronze",
    logoUrl: formData.get("logoUrl") as string,
    website: (formData.get("website") as string) || null,
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
