import { clerkClient } from "@clerk/nextjs/server";
import { requirePermission, requireSuperAdmin } from "@/lib/auth";
import {
  ADMIN_ASSIGNABLE_PERMISSIONS,
  hasAdminAccess,
  isAdminRole,
  isMemberApproved,
  isPendingMemberApproval,
  PERMISSIONS,
  type AdminMetadata,
  type AdminRole,
  type Permission,
} from "@/lib/permissions";
import { getUserDisplayName } from "@/lib/user-display";
import { hasRequiredProfile } from "@/lib/registration";

export type PendingUser = {
  id: string;
  email: string;
  name: string;
  createdAt: number;
};

export type AdminMember = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  tournamentIds: string[];
  createdAt: number;
};

export type SiteMember = {
  id: string;
  email: string;
  name: string;
  status: string;
  createdAt: number;
};

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

export async function fetchPendingUsers(): Promise<PendingUser[]> {
  await requirePermission("users:approve");
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

  return data
    .filter((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      return isPendingMemberApproval(meta) && hasRequiredProfile(meta, user);
    })
    .map((user) => ({
      id: user.id,
      email: getUserEmail(user),
      name: getUserName(user),
      createdAt: user.createdAt,
    }));
}

export async function fetchAdminMembers(): Promise<AdminMember[]> {
  await requireSuperAdmin();
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

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

export async function fetchSiteMembers(): Promise<SiteMember[]> {
  await requirePermission("users:approve");
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

  return data
    .filter((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      return !hasAdminAccess(meta) && isMemberApproved(meta);
    })
    .map((user) => ({
      id: user.id,
      email: getUserEmail(user),
      name: getUserName(user),
      status: (user.publicMetadata as AdminMetadata)?.status ?? "approved",
      createdAt: user.createdAt,
    }));
}

export async function findUserByEmail(email: string) {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  return data[0] ?? null;
}
