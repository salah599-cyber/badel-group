import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userMembershipNumbers } from "@/lib/db/schema";

function isUniqueViolation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("unique") || message.includes("duplicate key");
}

export async function getUserIdByMembershipNumber(membershipNumber: string) {
  if (!db) return null;

  try {
    const [row] = await db
      .select({ userId: userMembershipNumbers.userId })
      .from(userMembershipNumbers)
      .where(eq(userMembershipNumbers.membershipNumber, membershipNumber))
      .limit(1);

    return row?.userId ?? null;
  } catch (error) {
    console.warn("[membership-index] Lookup failed:", error);
    return null;
  }
}

export async function upsertMembershipIndex(userId: string, membershipNumber: string) {
  if (!db) return;

  try {
    await db
      .insert(userMembershipNumbers)
      .values({ userId, membershipNumber })
      .onConflictDoUpdate({
        target: userMembershipNumbers.userId,
        set: { membershipNumber },
      });
  } catch (error) {
    console.warn("[membership-index] Upsert failed:", error);
  }
}

export async function reserveMembershipNumber(
  userId: string,
  membershipNumber: string,
): Promise<boolean> {
  if (!db) return true;

  try {
    await db.insert(userMembershipNumbers).values({ userId, membershipNumber });
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return false;
    }
    console.warn("[membership-index] Reserve failed:", error);
    return false;
  }
}

export async function deleteMembershipIndex(userId: string) {
  if (!db) return;

  try {
    await db.delete(userMembershipNumbers).where(eq(userMembershipNumbers.userId, userId));
  } catch (error) {
    console.warn("[membership-index] Delete failed:", error);
  }
}
