import { createClerkClient } from "@clerk/backend";
import { readFileSync } from "fs";

const SUPER_ADMIN_EMAIL = "salah599@gmail.com";

const env = readFileSync(".env.local", "utf8");
const secretKey = env.match(/CLERK_SECRET_KEY="([^"]+)"/)?.[1];
if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");

const client = createClerkClient({ secretKey });

const { data } = await client.users.getUserList({
  emailAddress: [SUPER_ADMIN_EMAIL],
  limit: 1,
});

const user = data[0];
if (!user) {
  console.error(`User ${SUPER_ADMIN_EMAIL} not found`);
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

console.log(`Promoted ${SUPER_ADMIN_EMAIL} to super_admin (${user.id})`);
