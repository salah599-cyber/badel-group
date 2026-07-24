import { clerkClient } from "@clerk/nextjs/server";
import type { AdminMetadata } from "@/lib/permissions";
import {
  getUserIdByMembershipNumber,
  upsertMembershipIndex,
} from "@/lib/membership-index";

const MEMBERSHIP_MIN = 100;
const MEMBERSHIP_MAX = 999;
const MAX_ASSIGN_ATTEMPTS = 50;

function membershipNumbersMatch(
  stored: string | number | undefined | null,
  normalized: string,
) {
  if (stored == null || stored === "") return false;
  return normalizeMembershipNumber(String(stored)) === normalized;
}

export function normalizeMembershipNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits || digits.length > 3) return null;

  const value = Number.parseInt(digits, 10);
  if (Number.isNaN(value) || value < MEMBERSHIP_MIN || value > MEMBERSHIP_MAX) {
    return null;
  }

  return String(value);
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
    users.push(...response.data);
    offset += response.data.length;
    if (offset >= response.totalCount || response.data.length === 0) {
      break;
    }
  }

  return users;
}

async function persistMembershipNumber(userId: string, membershipNumber: string) {
  await upsertMembershipIndex(userId, membershipNumber);
}

export async function isMembershipNumberTaken(
  membershipNumber: string,
  excludeUserId?: string,
) {
  const indexedUserId = await getUserIdByMembershipNumber(membershipNumber);
  if (indexedUserId && indexedUserId !== excludeUserId) {
    return true;
  }

  const users = await listAllUsers();

  return users.some((user) => {
    if (excludeUserId && user.id === excludeUserId) return false;
    const meta = user.publicMetadata as AdminMetadata;
    return membershipNumbersMatch(meta.membershipNumber, membershipNumber);
  });
}

export async function findUserByMembershipNumber(membershipNumber: string) {
  const normalized = normalizeMembershipNumber(membershipNumber);
  if (!normalized) return null;

  const indexedUserId = await getUserIdByMembershipNumber(normalized);
  if (indexedUserId) {
    const client = await clerkClient();
    try {
      return await client.users.getUser(indexedUserId);
    } catch {
      // Stale index — fall through to Clerk search.
    }
  }

  const client = await clerkClient();
  const { data: queryResults } = await client.users.getUserList({
    query: normalized,
    limit: 25,
  });
  const fromQuery =
    queryResults.find((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      return membershipNumbersMatch(meta.membershipNumber, normalized);
    }) ?? null;

  if (fromQuery) {
    await persistMembershipNumber(fromQuery.id, normalized);
    return fromQuery;
  }

  const users = await listAllUsers();
  const found =
    users.find((user) => {
      const meta = user.publicMetadata as AdminMetadata;
      return membershipNumbersMatch(meta.membershipNumber, normalized);
    }) ?? null;

  if (found) {
    await persistMembershipNumber(found.id, normalized);
  }

  return found;
}

export async function ensureMembershipNumber(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = user.publicMetadata as AdminMetadata;

  if (metadata.membershipNumber != null && metadata.membershipNumber !== "") {
    const membershipNumber = String(metadata.membershipNumber);
    await persistMembershipNumber(userId, membershipNumber);
    return membershipNumber;
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
