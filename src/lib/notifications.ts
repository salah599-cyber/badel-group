import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  createdAt: Date;
};

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  href?: string;
}) {
  if (!db) return;

  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? "/signup",
    });
  } catch (error) {
    console.error("[notifications] Failed to create notification:", error);
  }
}

export async function getUnreadNotifications(userId: string): Promise<AppNotification[]> {
  if (!db) return [];

  try {
    return await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        href: notifications.href,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(10);
  } catch (error) {
    console.error("[notifications] Failed to load notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string) {
  if (!db) return 0;

  try {
    const [{ value }] = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return Number(value);
  } catch (error) {
    console.error("[notifications] Failed to count notifications:", error);
    return 0;
  }
}

export async function markNotificationRead(notificationId: string, userId: string) {
  if (!db) return;

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  } catch (error) {
    console.error("[notifications] Failed to mark notification read:", error);
  }
}

export async function markAllNotificationsRead(userId: string) {
  if (!db) return;

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  } catch (error) {
    console.error("[notifications] Failed to mark all notifications read:", error);
  }
}
