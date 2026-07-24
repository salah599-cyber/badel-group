import { clerkClient } from "@clerk/nextjs/server";
import type { AdminMetadata } from "@/lib/permissions";
import {
  getUserIdByMembershipNumber,
  upsertMembershipIndex,
} from "@/lib/membership-index";

const MEMBERSHIP_MIN = 100;
const MEMBERSHIP_MAX = 999;
const MAX_ASSIGN_ATTEMPTS = 50;

export function normalizeMembershipNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits || digits.length > 3) return null;

  const value = Number.parseInt(digits, 10);
  if (Number.isNaN(value) || value < MEMBERSHIP_MIN || value > MEMBERSHIP_MAX) {
    return null;
  }

  return String(value);
}

/** Read membership # from Clerk public metadata (supports legacy snake_case). */
export function getMembershipFromMetadata(
  meta: AdminMetadata | Record<string, unknown> | null | undefined,
): string | null {
  if (!meta || typeof meta !== "object") return null;
  const record = meta as Record<string, unknown>;
  const raw = record.membershipNumber ?? record.membership_number;
  if (raw == null || raw === "") return null;
  return normalizeMembershipNumber(String(raw));
}

function randomMembershipNumber() {
  return String(Math.floor(Math.random() * (MEMBERSHIP_MAX - MEMBERSHIP_MIN + 1)) + MEMBERSHIP_MIN);
}

async function listAllUsers() {
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

async function persistMembershipNumber(userId: string, membershipNumber: string) {
  const normalized = normalizeMembershipNumber(membershipNumber);
  if (!normalized) return;
  await upsertMembershipIndex(userId, normalized);
}

export async function rebuildMembershipIndexFromClerk() {
  const users = await listAllUsers();
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

  const users = await listAllUsers();
  for (const user of users) {
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
  if (indexedUserId && indexedUserId !== excludeUserId) {
    return true;
  }

  const users = await listAllUsers();

  return users.some((user) => {
    if (excludeUserId && user.id === excludeUserId) return false;
    return getMembershipFromMetadata(user.publicMetadata as AdminMetadata) === normalized;
  });
}

export async function findUserByMembershipNumber(membershipNumber: string) {
  const normalized = normalizeMembershipNumber(membershipNumber);
  if (!normalized) return null;

  let user = await lookupUserByMembershipNumber(normalized);
  if (user) return user;

  await rebuildMembershipIndexFromClerk();
  return lookupUserByMembershipNumber(normalized);
}

export async function ensureMembershipNumber(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = user.publicMetadata as AdminMetadata;

  const existing = getMembershipFromMetadata(metadata);
  if (existing) {
    await persistMembershipNumber(userId, existing);
    return existing;
  }

  for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt += 1) {
    const membershipNumber = randomMembershipNumber();
    const taken = await isMembershipNumberTaken(membershipNumber, userId);
    if (taken) continue;

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        membershipNumber,
      },
    });

    await persistMembershipNumber(userId, membershipNumber);
    return membershipNumber;
  }

  throw new Error("Could not assign a unique membership number. Please try again.");
}

export function formatMembershipNumber(membershipNumber: string | undefined | null) {
  if (!membershipNumber) return null;
  return normalizeMembershipNumber(membershipNumber);
}
