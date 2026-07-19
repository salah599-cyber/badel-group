import { createClerkClient } from "@clerk/backend";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const secretKey = env.match(/CLERK_SECRET_KEY="([^"]+)"/)?.[1];
if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");

const superAdminEmail =
  env.match(/SUPER_ADMIN_EMAIL="([^"]+)"/)?.[1]?.trim().toLowerCase() ??
  "salah599@gmail.com";

const client = createClerkClient({ secretKey });

const { data } = await client.users.getUserList({
  emailAddress: [superAdminEmail],
  limit: 1,
});

const user = data[0];
if (!user) {
  console.error(`User ${superAdminEmail} not found`);
  process.exit(1);
}

await client.users.updateUserMetadata(user.id, {
  publicMetadata: {
    ...user.publicMetadata,
    role: "super_admin",
    approved: true,
    status: "approved",
  },
});

console.log(`Promoted ${superAdminEmail} to super_admin (${user.id})`);
