"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchUnreadNotificationsAction } from "@/lib/actions";
import type { AppNotification } from "@/lib/notifications";

const POLL_INTERVAL_MS = 90_000;

type NotificationContextValue = {
  unreadCount: number;
  notifications: AppNotification[];
  refresh: () => Promise<void>;
  dismissLocal: (id: string) => void;
  dismissAllLocal: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setNotifications([]);
      return;
    }

    if (typeof document !== "undefined" && document.hidden) {
      return;
    }

    const unread = await fetchUnreadNotificationsAction();
    setNotifications(unread);
  }, [isSignedIn]);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const dismissLocal = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const dismissAllLocal = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount: notifications.length,
      notifications,
      refresh,
      dismissLocal,
      dismissAllLocal,
    }),
    [notifications, refresh, dismissLocal, dismissAllLocal],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
