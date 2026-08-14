"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  dismissAllNotificationsAction,
  dismissNotificationAction,
} from "@/lib/actions";
import { useNotifications } from "@/components/NotificationProvider";

export function NotificationPopups() {
  const { isSignedIn } = useAuth();
  const { notifications, dismissLocal, dismissAllLocal } = useNotifications();
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isSignedIn) {
      setVisibleIds([]);
      return;
    }

    setVisibleIds((current) => {
      const nextIds = notifications.map((item) => item.id);
      const preserved = current.filter((id) => nextIds.includes(id));
      const added = nextIds.filter((id) => !preserved.includes(id));
      return [...preserved, ...added];
    });
  }, [isSignedIn, notifications]);

  async function dismiss(id: string) {
    setVisibleIds((current) => current.filter((itemId) => itemId !== id));
    dismissLocal(id);
    await dismissNotificationAction(id);
  }

  async function dismissAll() {
    setVisibleIds([]);
    dismissAllLocal();
    await dismissAllNotificationsAction();
  }

  const visibleItems = notifications.filter((item) => visibleIds.includes(item.id));

  if (visibleItems.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(100%,22rem)] flex-col gap-3">
      {visibleItems.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto rounded-2xl border border-primary/15 bg-white p-4 shadow-xl transition"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">{item.title}</p>
              <p className="mt-1 text-sm text-gray-600">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => void dismiss(item.id)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
          {item.href && (
            <Link
              href={item.href}
              prefetch={false}
              onClick={() => void dismiss(item.id)}
              className="text-sm font-semibold text-primary hover:text-primary-dark"
            >
              View details →
            </Link>
          )}
        </div>
      ))}

      {visibleItems.length > 1 && (
        <button
          type="button"
          onClick={() => void dismissAll()}
          className="pointer-events-auto self-end rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-md ring-1 ring-gray-200 hover:text-primary"
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}
