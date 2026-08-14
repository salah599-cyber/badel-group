"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isMemberApproved, type AdminMetadata } from "@/lib/permissions";
import { hasRequiredProfile } from "@/lib/registration";

const BYPASS_PATHS = new Set(["/complete-profile", "/pending-approval"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user || BYPASS_PATHS.has(pathname)) return;

    const meta = user.publicMetadata as AdminMetadata;

    if (!hasRequiredProfile(meta, user)) {
      router.replace("/complete-profile");
      return;
    }

    if (!isMemberApproved(meta)) {
      router.replace("/pending-approval");
    }
  }, [isLoaded, user, pathname, router]);

  return <>{children}</>;
}
