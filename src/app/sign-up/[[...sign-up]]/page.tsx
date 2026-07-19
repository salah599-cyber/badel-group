import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="max-w-md rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center text-sm text-primary-dark">
        After signing up, your account must be approved by an admin before you can access
        the site.
      </div>
      <SignUp
        forceRedirectUrl="/pending-approval"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg border border-primary/10",
            headerTitle: "text-primary-dark",
            formButtonPrimary: "bg-primary hover:bg-primary-dark",
          },
        }}
      />
    </div>
  );
}
