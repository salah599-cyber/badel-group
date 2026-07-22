import type { AdminMetadata } from "@/lib/permissions";

type UserNameSource = {
  firstName: string | null;
  lastName: string | null;
  emailAddresses?: { emailAddress: string }[];
  publicMetadata?: AdminMetadata | Record<string, unknown> | null;
};

export function getUserDisplayName(
  user: UserNameSource,
  fallback = "Unnamed user",
): string {
  const clerkName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (clerkName) return clerkName;

  const meta = user.publicMetadata as AdminMetadata | undefined;
  const profileName = [meta?.profileFirstName, meta?.profileLastName]
    .filter(Boolean)
    .join(" ");
  if (profileName) return profileName;

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (email) return email;

  return fallback;
}
