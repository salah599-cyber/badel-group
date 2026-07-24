import { clerkClient } from "@clerk/nextjs/server";

/** Paginate through every Clerk user (do not rely on totalCount alone). */
export async function listAllClerkUsers() {
  const client = await clerkClient();
  const users = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await client.users.getUserList({ limit, offset, orderBy: "-created_at" });
    if (response.data.length === 0) break;

    users.push(...response.data);
    offset += response.data.length;

    if (response.data.length < limit) break;
  }

  return users;
}
