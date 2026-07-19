import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/admin");

  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin") {
    redirect("/?error=unauthorized");
  }

  return <>{children}</>;
}
