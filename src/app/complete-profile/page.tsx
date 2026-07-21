import { CompleteProfileForm } from "@/components/CompleteProfileForm";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isMemberApproved } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";
import { hasCompleteName } from "@/lib/user-profile";

export default async function CompleteProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  if (hasCompleteName(user)) {
    if (isMemberApproved(user.publicMetadata as AdminMetadata)) {
      redirect("/");
    }
    redirect("/pending-approval");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16">
      <div className="section-shell w-full">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Complete your profile</h1>
        <p className="mb-6 text-center text-gray-600">
          Please enter your first and last name to finish registering.
        </p>
        <CompleteProfileForm />
      </div>
    </div>
  );
}
