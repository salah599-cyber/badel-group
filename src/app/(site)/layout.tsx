import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  if (user) {
    const isAdmin = user.publicMetadata?.role === "admin";
    const isApproved = user.publicMetadata?.approved === true;

    if (!isAdmin && !isApproved) {
      redirect("/pending-approval");
    }
  }

  return <>{children}</>;
}
