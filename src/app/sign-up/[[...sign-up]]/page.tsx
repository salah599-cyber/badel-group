import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <SignUp
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
