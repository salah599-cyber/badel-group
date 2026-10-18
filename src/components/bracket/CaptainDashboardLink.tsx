"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCaptainTeamLabelAction } from "@/lib/live-access";

export function CaptainDashboardLink({ tournamentId }: { tournamentId: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    void getCaptainTeamLabelAction(tournamentId).then((team) => {
      if (!cancelled) setLabel(team?.label ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, tournamentId]);

  if (!label) return null;

  return (
    <div className="mb-6">
      <Link
        href={`/tournaments/${tournamentId}/team`}
        className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Captain dashboard — {label}
      </Link>
    </div>
  );
}
