import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isMemberApproved } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";
import { hasRequiredProfile } from "@/lib/registration";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  if (user) {
    const meta = user.publicMetadata as AdminMetadata;

    if (!hasRequiredProfile(meta, user)) {
      redirect("/complete-profile");
    }

    if (!isMemberApproved(meta)) {
      redirect("/pending-approval");
    }
  }

  return <>{children}</>;
}
