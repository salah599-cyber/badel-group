export const PERMISSIONS = [
  "tournaments:manage",
  "entries:manage",
  "users:approve",
  "sponsors:manage",
  "gallery:manage",
  "results:manage",
  "admins:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type AdminRole = "super_admin" | "admin" | "tournament_admin";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "tournaments:manage": "Create & manage tournaments",
  "entries:manage": "Approve player entries",
  "users:approve": "Approve site member sign-ups",
  "sponsors:manage": "Manage sponsors",
  "gallery:manage": "Upload gallery photos",
  "results:manage": "Publish tournament results",
  "admins:manage": "Manage admin team & permissions",
};

export const ADMIN_ASSIGNABLE_PERMISSIONS = PERMISSIONS.filter(
  (p) => p !== "admins:manage",
);

export const TOURNAMENT_ADMIN_PERMISSIONS: Permission[] = [
  "entries:manage",
  "gallery:manage",
  "results:manage",
];

export function getSuperAdminEmail(): string {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (email) return email;

  if (process.env.NODE_ENV !== "production") {
    return "salah599@gmail.com";
  }

  return "";
}

export type AdminMetadata = {
  role?: string;
  permissions?: string[];
  tournamentIds?: string[];
  approved?: boolean;
  status?: string;
  playingSide?: string;
  profileFirstName?: string;
  profileLastName?: string;
  profileComplete?: boolean;
};

export type AdminContext = {
  userId: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  tournamentIds: string[];
  isSuperAdmin: boolean;
};

const ADMIN_ROLES = new Set<string>(["super_admin", "admin", "tournament_admin"]);

export function isAdminRole(role: string | undefined): role is AdminRole {
  return !!role && ADMIN_ROLES.has(role);
}

export function parseAdminMetadata(
  userId: string,
  email: string,
  metadata: AdminMetadata | null | undefined,
): AdminContext | null {
  const role = metadata?.role;
  if (!isAdminRole(role)) return null;

  const tournamentIds = (metadata?.tournamentIds ?? []).map(String);
  const explicit = (metadata?.permissions ?? []).filter((p): p is Permission =>
    PERMISSIONS.includes(p as Permission),
  );

  if (role === "super_admin") {
    return {
      userId,
      email,
      role,
      permissions: [...PERMISSIONS],
      tournamentIds,
      isSuperAdmin: true,
    };
  }

  if (role === "tournament_admin") {
    const permissions =
      explicit.length > 0 ? explicit : [...TOURNAMENT_ADMIN_PERMISSIONS];
    return {
      userId,
      email,
      role,
      permissions,
      tournamentIds,
      isSuperAdmin: false,
    };
  }

  const permissions =
    explicit.length > 0 ? explicit : [...ADMIN_ASSIGNABLE_PERMISSIONS];

  return {
    userId,
    email,
    role: "admin",
    permissions,
    tournamentIds,
    isSuperAdmin: false,
  };
}

export function hasPermission(ctx: AdminContext, permission: Permission): boolean {
  if (ctx.isSuperAdmin) return true;
  return ctx.permissions.includes(permission);
}

export function canManageTournament(ctx: AdminContext, tournamentId: string): boolean {
  if (ctx.isSuperAdmin || ctx.role === "admin") return true;
  if (ctx.role === "tournament_admin") {
    return ctx.tournamentIds.includes(tournamentId);
  }
  return false;
}

export function hasAdminAccess(metadata: AdminMetadata | null | undefined): boolean {
  return isAdminRole(metadata?.role);
}

export function isMemberApproved(metadata: AdminMetadata | null | undefined): boolean {
  if (hasAdminAccess(metadata)) return true;
  return metadata?.approved === true || metadata?.status === "approved";
}

export function isPendingMemberApproval(metadata: AdminMetadata | null | undefined): boolean {
  if (hasAdminAccess(metadata) || isMemberApproved(metadata)) return false;
  const status = metadata?.status;
  return status !== "rejected" && status !== "removed";
}
