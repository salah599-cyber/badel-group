import type { AdminMetadata } from "@/lib/permissions";
import { hasAdminAccess, isMemberApproved } from "@/lib/permissions";

export function getAccessFromClaims(
  sessionClaims: Record<string, unknown> | null | undefined,
) {
  const meta = (sessionClaims?.metadata ?? sessionClaims?.public_metadata) as
    | AdminMetadata
    | undefined;

  const isAdminUser = hasAdminAccess(meta);
  const isApproved = isMemberApproved(meta);

  return { isAdmin: isAdminUser, isApproved, meta };
}
