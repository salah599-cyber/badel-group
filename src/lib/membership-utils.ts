import type { AdminMetadata } from "@/lib/permissions";

const MEMBERSHIP_MIN = 100;
const MEMBERSHIP_MAX = 999;

export function normalizeMembershipNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits || digits.length > 3) return null;

  const value = Number.parseInt(digits, 10);
  if (Number.isNaN(value) || value < MEMBERSHIP_MIN || value > MEMBERSHIP_MAX) {
    return null;
  }

  return String(value);
}

/** Read membership # from Clerk public metadata (supports legacy snake_case). */
export function getMembershipFromMetadata(
  meta: AdminMetadata | Record<string, unknown> | null | undefined,
): string | null {
  if (!meta || typeof meta !== "object") return null;
  const record = meta as Record<string, unknown>;
  const raw = record.membershipNumber ?? record.membership_number;
  if (raw == null || raw === "") return null;
  return normalizeMembershipNumber(String(raw));
}

export function formatMembershipNumber(membershipNumber: string | undefined | null) {
  if (!membershipNumber) return null;
  return normalizeMembershipNumber(membershipNumber);
}

export const membershipNumberBounds = {
  min: MEMBERSHIP_MIN,
  max: MEMBERSHIP_MAX,
} as const;
