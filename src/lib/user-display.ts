import type { AdminMetadata } from "@/lib/permissions";

type UserEmailSource = {
  emailAddresses?: { id?: string; emailAddress?: string }[];
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: { emailAddress?: string } | null;
};

type UserNameSource = UserEmailSource & {
  firstName: string | null;
  lastName: string | null;
  publicMetadata?: AdminMetadata | Record<string, unknown> | null;
};

/** Primary email from a Clerk user, whether the client or backend shape is used. */
export function getClerkUserEmail(user: UserEmailSource): string | null {
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.find((address) => address.id && address.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress;
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

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

  const email = getClerkUserEmail(user);
  if (email) return email;

  return fallback;
}
