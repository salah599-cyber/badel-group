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

  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href ?? "/signup",
  });
}

export async function getUnreadNotifications(userId: string): Promise<AppNotification[]> {
  if (!db) return [];

  return db
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
}

export async function getUnreadNotificationCount(userId: string) {
  if (!db) return 0;

  const [{ value }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return Number(value);
}

export async function markNotificationRead(notificationId: string, userId: string) {
  if (!db) return;

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string) {
  if (!db) return;

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
