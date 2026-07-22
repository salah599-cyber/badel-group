"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { AdminMetadata } from "@/lib/permissions";
import {
  normalizeProfileName,
  validateRegistrationNames,
} from "@/lib/registration";

export async function completeProfileAction(formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in.");

  const firstName = normalizeProfileName(String(formData.get("firstName") ?? ""));
  const lastName = normalizeProfileName(String(formData.get("lastName") ?? ""));
  const validationError = validateRegistrationNames(firstName, lastName);
  if (validationError) throw new Error(validationError);

  const existingMeta = user.publicMetadata as AdminMetadata;
  const client = await clerkClient();

  await client.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...existingMeta,
      profileFirstName: firstName,
      profileLastName: lastName,
      profileComplete: true,
    },
  });

  revalidatePath("/pending-approval");
}
