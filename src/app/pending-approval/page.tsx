import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/components/CompleteProfileForm";
import { isMemberApproved } from "@/lib/permissions";
import type { AdminMetadata } from "@/lib/permissions";
import { hasRequiredProfile } from "@/lib/registration";

export default async function PendingApprovalPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const metadata = user.publicMetadata as AdminMetadata;

  if (isMemberApproved(metadata)) {
    redirect("/");
  }

  const profileComplete = hasRequiredProfile(metadata, user);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="section-shell w-full">
        {!profileComplete ? (
          <>
            <div className="mb-4 text-4xl">📝</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Complete your profile</h1>
            <CompleteProfileForm />
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">⏳</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Account Pending Approval</h1>
            <p className="mb-6 text-gray-600">
              Thanks for signing up! An admin will review your account shortly. You&apos;ll get
              access once approved.
            </p>
          </>
        )}
        <SignOutButton>
          <button className="btn-primary mt-6">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
}
