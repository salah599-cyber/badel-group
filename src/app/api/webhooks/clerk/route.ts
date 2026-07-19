import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSuperAdminEmail, hasAdminAccess } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  const client = await clerkClient();

  if (event.type === "user.created") {
    const user = event.data;
    const email = user.email_addresses[0]?.email_address?.toLowerCase();
    const existingMeta = user.public_metadata as AdminMetadata;
    const existingRole = existingMeta?.role;

    const superAdminEmail = getSuperAdminEmail();

    if (superAdminEmail && email === superAdminEmail) {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...existingMeta,
          role: "super_admin",
          approved: true,
          status: "approved",
        },
      });
    } else if (hasAdminAccess({ role: existingRole })) {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...existingMeta,
          approved: true,
          status: "approved",
        },
      });
    } else {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...existingMeta,
          approved: false,
          status: "pending",
        },
      });
    }
  }

  return new Response("OK", { status: 200 });
}
