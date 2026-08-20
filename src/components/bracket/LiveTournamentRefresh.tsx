"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type LiveTournamentRefreshProps = {
  intervalMs?: number;
  children: React.ReactNode;
};

export function LiveTournamentRefresh({
  intervalMs = 30000,
  children,
}: LiveTournamentRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return (
    <>
      {children}
      <p className="mt-8 text-center text-xs text-gray-500">
        Scores update automatically every {Math.round(intervalMs / 1000)} seconds
      </p>
    </>
  );
}
