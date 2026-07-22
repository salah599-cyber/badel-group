import type { AdminMetadata } from "@/lib/permissions";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 64;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const NAME_PATTERN = /^[\p{L}\p{M}' -]+$/u;

export const PASSWORD_REQUIREMENTS = [
  `At least ${PASSWORD_MIN_LENGTH} characters`,
  "One uppercase letter",
  "One lowercase letter",
  "One number",
  "One special character",
] as const;

export function normalizeProfileName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateProfileName(
  value: string,
  label: "First name" | "Last name",
): string | null {
  const normalized = normalizeProfileName(value);
  if (!normalized) return `${label} is required.`;
  if (normalized.length < NAME_MIN_LENGTH) {
    return `${label} must be at least ${NAME_MIN_LENGTH} characters.`;
  }
  if (normalized.length > NAME_MAX_LENGTH) {
    return `${label} must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!NAME_PATTERN.test(normalized)) {
    return `${label} can only include letters, spaces, hyphens, and apostrophes.`;
  }
  return null;
}

export function validateRegistrationNames(
  firstName: string,
  lastName: string,
): string | null {
  return (
    validateProfileName(firstName, "First name") ??
    validateProfileName(lastName, "Last name")
  );
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }
  return null;
}

export function hasRequiredProfile(
  metadata: AdminMetadata | null | undefined,
  user?: { firstName?: string | null; lastName?: string | null },
): boolean {
  const clerkName = [user?.firstName, user?.lastName].map((part) => part?.trim()).filter(Boolean);
  if (clerkName.length === 2) return true;

  return Boolean(
    metadata?.profileFirstName?.trim() && metadata?.profileLastName?.trim(),
  );
}

export const registrationFieldLimits = {
  nameMinLength: NAME_MIN_LENGTH,
  nameMaxLength: NAME_MAX_LENGTH,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  passwordMaxLength: PASSWORD_MAX_LENGTH,
} as const;
