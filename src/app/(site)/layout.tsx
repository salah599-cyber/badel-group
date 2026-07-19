import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  if (user) {
    const meta = user.publicMetadata as AdminMetadata;
    const isAdminUser = hasAdminAccess(meta);
    const isApproved = user.publicMetadata?.approved === true;

    if (!isAdminUser && !isApproved) {
      redirect("/pending-approval");
    }
  }

  return <>{children}</>;
}
