import { currentUser } from "@clerk/nextjs/server";
import type { AdminContext, AdminMetadata, Permission } from "@/lib/permissions";
import { hasAdminAccess, parseAdminMetadata } from "@/lib/permissions";

export type { AdminContext, Permission };

export async function getAdminContext(): Promise<AdminContext | null> {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  return parseAdminMetadata(user.id, email, user.publicMetadata as AdminMetadata);
}

export async function requireAdminContext(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}

export async function requirePermission(permission: Permission): Promise<AdminContext> {
  const ctx = await requireAdminContext();
  if (!ctx.isSuperAdmin && !ctx.permissions.includes(permission)) {
    throw new Error("You do not have permission to perform this action");
  }
  return ctx;
}

export async function requireSuperAdmin(): Promise<AdminContext> {
  const ctx = await requireAdminContext();
  if (!ctx.isSuperAdmin) throw new Error("Super admin access required");
  return ctx;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) return null;
  if (!hasAdminAccess(user.publicMetadata as AdminMetadata)) return null;
  return user;
}

export async function hasAdminAccessUser(): Promise<boolean> {
  const ctx = await getAdminContext();
  return ctx !== null;
}

export async function isAdmin() {
  return hasAdminAccessUser();
}

export async function isApprovedUser() {
  const user = await currentUser();
  if (!user) return false;
  if (hasAdminAccess(user.publicMetadata as AdminMetadata)) return true;
  return user.publicMetadata?.approved === true;
}

export async function requireApprovedUser() {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in");

  if (hasAdminAccess(user.publicMetadata as AdminMetadata)) return user;
  if (user.publicMetadata?.approved !== true) {
    throw new Error("Your account must be approved before you can perform this action");
  }

  return user;
}
