import { clerkClient } from "@clerk/nextjs/server";
import type { AdminMetadata } from "@/lib/permissions";
import {
  deleteMembershipIndex,
  getUserIdByMembershipNumber,
  reserveMembershipNumber,
  upsertMembershipIndex,
} from "@/lib/membership-index";
import {
  getMembershipFromMetadata,
  membershipNumberBounds,
  normalizeMembershipNumber,
} from "@/lib/membership-utils";

export {
  formatMembershipNumber,
  getMembershipFromMetadata,
  normalizeMembershipNumber,
} from "@/lib/membership-utils";

const { min: MEMBERSHIP_MIN, max: MEMBERSHIP_MAX } = membershipNumberBounds;
const MAX_ASSIGN_ATTEMPTS = 50;

function randomMembershipNumber() {
  return String(Math.floor(Math.random() * (MEMBERSHIP_MAX - MEMBERSHIP_MIN + 1)) + MEMBERSHIP_MIN);
}

async function persistMembershipNumber(userId: string, membershipNumber: string) {
  const normalized = normalizeMembershipNumber(membershipNumber);
  if (!normalized) return;
  await upsertMembershipIndex(userId, normalized);
}

export async function rebuildMembershipIndexFromClerk() {
  const { listAllClerkUsers } = await import("@/lib/clerk-user-list");
  const users = await listAllClerkUsers();
  const client = await clerkClient();

  for (const user of users) {
    let membershipNumber = getMembershipFromMetadata(user.publicMetadata as AdminMetadata);

    if (!membershipNumber) {
      try {
        const fullUser = await client.users.getUser(user.id);
        membershipNumber = getMembershipFromMetadata(fullUser.publicMetadata as AdminMetadata);
      } catch {
        continue;
      }
    }

    if (membershipNumber) {
      await persistMembershipNumber(user.id, membershipNumber);
    }
  }
}

async function lookupUserByMembershipNumber(normalized: string) {
  const indexedUserId = await getUserIdByMembershipNumber(normalized);
  if (indexedUserId) {
    const client = await clerkClient();
    try {
      const user = await client.users.getUser(indexedUserId);
      if (getMembershipFromMetadata(user.publicMetadata as AdminMetadata) === normalized) {
        return user;
      }
    } catch {
      // Stale index — fall through.
    }
  }

  const client = await clerkClient();
  const { data: queryResults } = await client.users.getUserList({
    query: normalized,
    limit: 100,
  });

  for (const user of queryResults) {
    if (getMembershipFromMetadata(user.publicMetadata as AdminMetadata) === normalized) {
      await persistMembershipNumber(user.id, normalized);
      return user;
    }
  }

  return null;
}

export async function isMembershipNumberTaken(
  membershipNumber: string,
  excludeUserId?: string,
) {
  const normalized = normalizeMembershipNumber(membershipNumber);
  if (!normalized) return false;

  const indexedUserId = await getUserIdByMembershipNumber(normalized);
  if (!indexedUserId) return false;
  if (excludeUserId && indexedUserId === excludeUserId) return false;
  return true;
}

export async function findUserByMembershipNumber(membershipNumber: string) {
  const normalized = normalizeMembershipNumber(membershipNumber);
  if (!normalized) return null;
  return lookupUserByMembershipNumber(normalized);
}

export async function ensureMembershipNumber(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = user.publicMetadata as AdminMetadata;

  const existing = getMembershipFromMetadata(metadata);
  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt += 1) {
    const membershipNumber = randomMembershipNumber();
    const reserved = await reserveMembershipNumber(userId, membershipNumber);
    if (!reserved) continue;

    try {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          membershipNumber,
        },
      });
      return membershipNumber;
    } catch {
      await deleteMembershipIndex(userId);
    }
  }

  throw new Error("Could not assign a unique membership number. Please try again.");
}
