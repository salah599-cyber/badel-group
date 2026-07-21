"use client";

import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

type Step = "details" | "verify";

export function CustomSignUpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const [step, setStep] = useState<Step>("details");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signUp) return;

    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string).trim();
    const lastName = (formData.get("lastName") as string).trim();
    const emailAddress = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (!firstName || !lastName) {
      setFormError("First name and last name are required.");
      return;
    }

    const { error } = await signUp.password({
      emailAddress,
      password,
      firstName,
      lastName,
    });

    if (error) {
      setFormError(error.message);
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setFormError(sendError.message);
      return;
    }

    setStep("verify");
  }

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signUp) return;

    setFormError(null);
    const code = new FormData(e.currentTarget).get("code") as string;
    const { error } = await signUp.verifications.verifyEmailCode({ code });

    if (error) {
      setFormError(error.message);
      return;
    }

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          window.location.href = decorateUrl("/pending-approval");
        },
      });
      return;
    }

    if (signUp.status === "missing_requirements") {
      window.location.href = "/complete-profile";
      return;
    }

    setFormError("Unable to complete sign-up. Please try again.");
  }

  const fieldError = (field: keyof NonNullable<typeof errors>["fields"]) =>
    errors?.fields?.[field]?.message;

  if (step === "verify") {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-dark">Verify your email</h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Enter the verification code sent to your email address.
        </p>

        <form onSubmit={handleVerifySubmit} className="space-y-4">
          {formError && (
            <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{formError}</p>
          )}

          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
              Verification code
            </label>
            <input id="code" name="code" type="text" required autoComplete="one-time-code" className="input" />
            {fieldError("code") && (
              <p className="mt-1 text-sm text-brand-red">{fieldError("code")}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={fetchStatus === "fetching"}
            className="btn-primary w-full"
          >
            {fetchStatus === "fetching" ? "Verifying..." : "Verify email"}
          </button>

          <button
            type="button"
            disabled={fetchStatus === "fetching"}
            onClick={async () => {
              setFormError(null);
              const { error } = await signUp.verifications.sendEmailCode();
              if (error) setFormError(error.message);
            }}
            className="w-full text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Resend code
          </button>
        </form>

        <div id="clerk-captcha" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-lg">
      <h1 className="mb-2 text-center text-2xl font-bold text-primary-dark">Create your account</h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        First name and last name are required to register.
      </p>

      <form onSubmit={handleDetailsSubmit} className="space-y-4">
        {formError && (
          <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{formError}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              className="input"
            />
            {fieldError("firstName") && (
              <p className="mt-1 text-sm text-brand-red">{fieldError("firstName")}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              className="input"
            />
            {fieldError("lastName") && (
              <p className="mt-1 text-sm text-brand-red">{fieldError("lastName")}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
          />
          {fieldError("emailAddress") && (
            <p className="mt-1 text-sm text-brand-red">{fieldError("emailAddress")}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="input"
          />
          {fieldError("password") && (
            <p className="mt-1 text-sm text-brand-red">{fieldError("password")}</p>
          )}
        </div>

        <button type="submit" disabled={fetchStatus === "fetching"} className="btn-primary w-full">
          {fetchStatus === "fetching" ? "Creating account..." : "Continue"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:text-primary-dark">
          Sign in
        </Link>
      </p>

      <div id="clerk-captcha" />
    </div>
  );
}
