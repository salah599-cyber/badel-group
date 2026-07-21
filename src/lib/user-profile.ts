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
