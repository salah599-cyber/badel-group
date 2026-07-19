import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth";

export type PendingUser = {
  id: string;
  email: string;
  name: string;
  createdAt: number;
};

export async function fetchPendingUsers(): Promise<PendingUser[]> {
  await requireAdmin();
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

  return data
    .filter((user) => user.publicMetadata?.role !== "admin" && user.publicMetadata?.approved !== true)
    .map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "No email",
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user",
      createdAt: user.createdAt,
    }));
}
