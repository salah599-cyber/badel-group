"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type LiveTournamentRefreshProps = {
  intervalMs?: number;
  children: React.ReactNode;
};

const DEFAULT_INTERVAL_MS = 60_000;

export function LiveTournamentRefresh({
  intervalMs = DEFAULT_INTERVAL_MS,
  children,
}: LiveTournamentRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    function refreshIfVisible() {
      if (document.hidden) return;
      router.refresh();
    }

    const id = window.setInterval(refreshIfVisible, intervalMs);

    function handleVisibilityChange() {
      if (!document.hidden) refreshIfVisible();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, intervalMs]);

  return (
    <>
      {children}
      <p className="mt-8 text-center text-xs text-gray-500">
        Scores update automatically every {Math.round(intervalMs / 1000)} seconds while this tab
        is open
      </p>
    </>
  );
}
