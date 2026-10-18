"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Keeps old /rankings?season= links working without making the page dynamic. */
export function LegacySeasonRedirect() {
  const params = useSearchParams();
  const router = useRouter();
  const season = params.get("season");

  useEffect(() => {
    if (!season) return;
    router.replace(`/rankings/${season}`);
  }, [router, season]);

  return null;
}
