import { currentUser } from "@clerk/nextjs/server";

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) return null;
  if (user.publicMetadata?.role !== "admin") return null;
  return user;
}

export async function isAdmin() {
  const user = await currentUser();
  if (!user) return false;
  return user.publicMetadata?.role === "admin";
}
