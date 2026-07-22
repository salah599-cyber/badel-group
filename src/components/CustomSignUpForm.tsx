"use client";

import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordRequirementsHint } from "@/components/CompleteProfileForm";
import {
  normalizeProfileName,
  registrationFieldLimits,
  validatePassword,
  validateRegistrationNames,
} from "@/lib/registration";

type Step = "form" | "verify";

function getClerkErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ?? fallback
  );
}

export function CustomSignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/10 bg-white p-8 text-center text-sm text-gray-500 shadow-lg">
        Loading sign-up...
      </div>
    );
  }

  async function handleGoogleSignUp() {
    if (!signUp) return;
    setError("");
    setIsSubmitting(true);
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: "/pending-approval",
      });
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, "Could not start Google sign-up."));
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!signUp) return;

    const normalizedFirstName = normalizeProfileName(firstName);
    const normalizedLastName = normalizeProfileName(lastName);
    const normalizedEmail = email.trim().toLowerCase();

    const nameError = validateRegistrationNames(normalizedFirstName, normalizedLastName);
    if (nameError) {
      setError(nameError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!normalizedEmail) {
      setError("Email address is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await signUp.create({
        emailAddress: normalizedEmail,
        password,
        unsafeMetadata: {
          profileFirstName: normalizedFirstName,
          profileLastName: normalizedLastName,
        },
      });

      setPassword("");
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, "Could not create your account."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!signUp) return;

    const verificationCode = code.trim();
    if (!verificationCode) {
      setError("Verification code is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/pending-approval");
        return;
      }
      setError("Additional verification is required. Please try again.");
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, "Invalid verification code."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/10 bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-primary-dark">Create your account</h1>
        <p className="mt-2 text-sm text-gray-600">
          First name and last name are required to register.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {step === "form" ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
              First name <span className="text-red-600">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              aria-required="true"
              minLength={registrationFieldLimits.nameMinLength}
              maxLength={registrationFieldLimits.nameMaxLength}
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
              Last name <span className="text-red-600">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              aria-required="true"
              minLength={registrationFieldLimits.nameMinLength}
              maxLength={registrationFieldLimits.nameMaxLength}
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email address <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              aria-required="true"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password <span className="text-red-600">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              aria-required="true"
              autoComplete="new-password"
              minLength={registrationFieldLimits.passwordMinLength}
              maxLength={registrationFieldLimits.passwordMaxLength}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
            />
            <PasswordRequirementsHint />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Continue"}
          </button>

          <div className="relative py-2 text-center text-xs uppercase tracking-wide text-gray-400">
            <span className="bg-white px-2">or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>
          <p className="text-center text-xs text-gray-500">
            Google sign-up still requires first and last name before approval.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4" noValidate>
          <p className="text-sm text-gray-600">
            Enter the verification code sent to <span className="font-medium">{email}</span>.
          </p>
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
              Verification code <span className="text-red-600">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              required
              aria-required="true"
              autoComplete="one-time-code"
              spellCheck={false}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Verifying..." : "Verify email"}
          </button>
        </form>
      )}
    </div>
  );
}
