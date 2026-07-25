import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userMembershipNumbers } from "@/lib/db/schema";

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
