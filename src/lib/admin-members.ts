import { clerkClient } from "@clerk/nextjs/server";
import { requirePermission, requireSuperAdmin } from "@/lib/auth";
import {
  ADMIN_ASSIGNABLE_PERMISSIONS,
  hasAdminAccess,
  isAdminRole,
  isMemberApproved,
  isPendingMemberApproval,
  PERMISSIONS,
  type AdminContext,
  type AdminMetadata,
  type AdminRole,
  type Permission,
} from "@/lib/permissions";
import { getUserDisplayName } from "@/lib/user-display";
import { hasRequiredProfile } from "@/lib/registration";
import { getMembershipFromMetadata } from "@/lib/membership";
import { listAllClerkUsers } from "@/lib/clerk-user-list";

export type PendingUser = {
  id: string;
  email: string;
  name: string;
  membershipNumber: string | null;
  createdAt: number;
};

export type AdminMember = {
  id: string;
  email: string;
  name: string;
  membershipNumber: string | null;
  role: AdminRole;
  permissions: Permission[];
  tournamentIds: string[];
  createdAt: number;
};

export type SiteMember = {
  id: string;
  email: string;
  name: string;
  membershipNumber: string | null;
  status: string;
  createdAt: number;
};

type ClerkUser = Awaited<ReturnType<typeof listAllClerkUsers>>[number];

function getUserName(user: {
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata?: AdminMetadata;
}) {
  return getUserDisplayName({
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddresses: user.emailAddresses,
    publicMetadata: user.publicMetadata as AdminMetadata,
  });
}

function getUserEmail(user: { emailAddresses: { emailAddress: string }[] }) {
  return user.emailAddresses[0]?.emailAddress ?? "No email";
}

function getMembershipNumberFromMeta(meta: AdminMetadata): string | null {
  return getMembershipFromMetadata(meta);
}

function mapPendingUsers(data: ClerkUser[]): PendingUser[] {
  return data
    .filter((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      return isPendingMemberApproval(meta) && hasRequiredProfile(meta, user);
    })
    .map((user) => ({
      id: user.id,
      email: getUserEmail(user),
      name: getUserName(user),
      membershipNumber: getMembershipNumberFromMeta(user.publicMetadata as AdminMetadata),
      createdAt: user.createdAt,
    }));
}

function mapAdminMembers(data: ClerkUser[]): AdminMember[] {
  return data
    .filter((user) => isAdminRole((user.publicMetadata as AdminMetadata)?.role))
    .map((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      const role = meta.role as AdminRole;
      const permissions = (meta.permissions ?? []).filter((p): p is Permission =>
        PERMISSIONS.includes(p as Permission),
      );

      return {
        id: user.id,
        email: getUserEmail(user),
        name: getUserName(user),
        membershipNumber: getMembershipNumberFromMeta(meta),
        role,
        permissions:
          role === "super_admin"
            ? [...ADMIN_ASSIGNABLE_PERMISSIONS, "admins:manage" as Permission]
            : permissions.length > 0
              ? permissions
              : role === "tournament_admin"
                ? (["entries:manage", "gallery:manage", "results:manage"] as Permission[])
                : [...ADMIN_ASSIGNABLE_PERMISSIONS],
        tournamentIds: (meta.tournamentIds ?? []).map(String),
        createdAt: user.createdAt,
      };
    });
}

function mapSiteMembers(data: ClerkUser[]): SiteMember[] {
  return data
    .filter((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      return !hasAdminAccess(meta) && isMemberApproved(meta);
    })
    .map((user) => ({
      id: user.id,
      email: getUserEmail(user),
      name: getUserName(user),
      membershipNumber: getMembershipNumberFromMeta(user.publicMetadata as AdminMetadata),
      status: (user.publicMetadata as AdminMetadata)?.status ?? "approved",
      createdAt: user.createdAt,
    }));
}

export async function fetchAdminUserLists(ctx: AdminContext): Promise<{
  pendingUsers: PendingUser[];
  adminMembers: AdminMember[];
  siteMembers: SiteMember[];
}> {
  const canViewMembers = ctx.isSuperAdmin || ctx.permissions.includes("users:approve");
  if (!canViewMembers) {
    return { pendingUsers: [], adminMembers: [], siteMembers: [] };
  }

  await requirePermission("users:approve");
  const data = await listAllClerkUsers();

  return {
    pendingUsers: mapPendingUsers(data),
    adminMembers: ctx.isSuperAdmin ? mapAdminMembers(data) : [],
    siteMembers: mapSiteMembers(data),
  };
}

export async function fetchPendingUsers(): Promise<PendingUser[]> {
  await requirePermission("users:approve");
  const data = await listAllClerkUsers();
  return mapPendingUsers(data);
}

export async function fetchAdminMembers(): Promise<AdminMember[]> {
  await requireSuperAdmin();
  const data = await listAllClerkUsers();
  return mapAdminMembers(data);
}

export async function fetchSiteMembers(): Promise<SiteMember[]> {
  await requirePermission("users:approve");
  const data = await listAllClerkUsers();
  return mapSiteMembers(data);
}

export async function findUserByEmail(email: string) {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  return data[0] ?? null;
}
