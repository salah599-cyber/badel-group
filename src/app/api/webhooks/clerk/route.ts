import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSuperAdminEmail, hasAdminAccess } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";
import { normalizeProfileName } from "@/lib/registration";

function readProfileNames(
  existingMeta: AdminMetadata,
  unsafeMeta: AdminMetadata | undefined,
) {
  const profileFirstName = normalizeProfileName(
    unsafeMeta?.profileFirstName ?? existingMeta?.profileFirstName ?? "",
  );
  const profileLastName = normalizeProfileName(
    unsafeMeta?.profileLastName ?? existingMeta?.profileLastName ?? "",
  );

  return {
    profileFirstName: profileFirstName || undefined,
    profileLastName: profileLastName || undefined,
    profileComplete: Boolean(profileFirstName && profileLastName),
  };
}

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
    const unsafeMeta = user.unsafe_metadata as AdminMetadata | undefined;
    const profile = readProfileNames(existingMeta, unsafeMeta);
    const profileFields = {
      ...(profile.profileFirstName ? { profileFirstName: profile.profileFirstName } : {}),
      ...(profile.profileLastName ? { profileLastName: profile.profileLastName } : {}),
      profileComplete: profile.profileComplete,
    };

    const superAdminEmail = getSuperAdminEmail();

    if (superAdminEmail && email === superAdminEmail) {
      await client.users.updateUser(user.id, {
        ...(profile.profileFirstName ? { firstName: profile.profileFirstName } : {}),
        ...(profile.profileLastName ? { lastName: profile.profileLastName } : {}),
      });
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...existingMeta,
          ...profileFields,
          role: "super_admin",
          approved: true,
          status: "approved",
        },
      });
    } else if (hasAdminAccess({ role: existingRole })) {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...existingMeta,
          ...profileFields,
          approved: true,
          status: "approved",
        },
      });
    } else {
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...existingMeta,
          ...profileFields,
          approved: false,
          status: "pending",
        },
      });
    }
  }

  return new Response("OK", { status: 200 });
}
