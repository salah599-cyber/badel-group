import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignUpSsoCallbackPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/pending-approval"
        signUpFallbackRedirectUrl="/pending-approval"
      />
    </div>
  );
}
