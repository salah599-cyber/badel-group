import { SignOutButton } from "@clerk/nextjs";

export default function PendingApprovalPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="section-shell w-full">
        <div className="mb-4 text-4xl">⏳</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Account Pending Approval</h1>
        <p className="mb-6 text-gray-600">
          Thanks for signing up! An admin will review your account shortly. You&apos;ll get
          access once approved.
        </p>
        <SignOutButton>
          <button className="btn-primary">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
}
