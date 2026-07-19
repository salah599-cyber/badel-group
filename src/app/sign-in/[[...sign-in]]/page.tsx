import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <SignIn
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
