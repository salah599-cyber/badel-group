"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { canEditTournamentScoresAction } from "@/lib/live-access";
import { hasAdminAccess, type AdminMetadata } from "@/lib/permissions";

const ScoreEditContext = createContext(false);

export function ScoreEditProvider({
  tournamentId,
  serverCanEdit = false,
  children,
}: {
  tournamentId: string;
  serverCanEdit?: boolean;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [allowed, setAllowed] = useState(serverCanEdit);
  const isAdmin = Boolean(
    user && hasAdminAccess(user.publicMetadata as AdminMetadata),
  );

  useEffect(() => {
    if (serverCanEdit || !isLoaded) return;

    if (!isSignedIn || !isAdmin) {
      setAllowed(false);
      return;
    }

    let cancelled = false;
    void canEditTournamentScoresAction(tournamentId).then((value) => {
      if (!cancelled) setAllowed(value);
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, isLoaded, isSignedIn, serverCanEdit, tournamentId]);

  return (
    <ScoreEditContext.Provider value={serverCanEdit || allowed}>
      {children}
    </ScoreEditContext.Provider>
  );
}

export function useScoreEditAllowed() {
  return useContext(ScoreEditContext);
}
