import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

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
    const existingRole = user.public_metadata?.role as string | undefined;

    if (existingRole !== "admin") {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.public_metadata,
          approved: false,
          status: "pending",
        },
      });
    } else {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.public_metadata,
          approved: true,
          status: "approved",
        },
      });
    }
  }

  return new Response("OK", { status: 200 });
}
