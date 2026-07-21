import { CustomSignUpForm } from "@/components/CustomSignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="max-w-md rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center text-sm text-primary-dark">
        Create an account with your first name, last name, email, and password. An admin must
        approve your account before you can access the site.
      </div>
      <CustomSignUpForm />
    </div>
  );
}
