export function hasCompleteName(user: {
  firstName: string | null;
  lastName: string | null;
}) {
  return Boolean(user.firstName?.trim() && user.lastName?.trim());
}

export function formatFullName(user: {
  firstName: string | null;
  lastName: string | null;
  email?: string;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email || "Unnamed user";
}

export function parseNameFields(formData: FormData) {
  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required");
  }

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

/** Clerk may reject firstName/lastName when those attributes are disabled in the dashboard. */
export async function syncClerkUserProfileNames(
  userId: string,
  firstName: string,
  lastName: string,
  publicMetadataPatch: Record<string, unknown> = {},
) {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  try {
    await client.users.updateUser(userId, { firstName, lastName });
  } catch (error) {
    console.warn("[clerk] Could not update firstName/lastName on user record:", error);
  }

  try {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        profileFirstName: firstName,
        profileLastName: lastName,
        profileComplete: true,
        ...publicMetadataPatch,
      },
    });
  } catch (error) {
    console.warn("[clerk] Could not update profile metadata:", error);
  }
}
