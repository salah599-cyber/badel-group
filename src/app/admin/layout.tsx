import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/admin");

  if (!hasAdminAccess(user.publicMetadata as AdminMetadata)) {
    redirect("/?error=unauthorized");
  }

  return <>{children}</>;
}
