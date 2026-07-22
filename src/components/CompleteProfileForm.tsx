"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeProfileAction } from "@/lib/profile-actions";
import { PASSWORD_REQUIREMENTS, registrationFieldLimits } from "@/lib/registration";

export function CompleteProfileForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("firstName", firstName);
    formData.set("lastName", lastName);

    try {
      await completeProfileAction(formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
      <p className="text-sm text-gray-600">
        First name and last name are required before your account can be reviewed.
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="profileFirstName" className="mb-1 block text-sm font-medium text-gray-700">
          First name <span className="text-red-600">*</span>
        </label>
        <input
          id="profileFirstName"
          name="firstName"
          type="text"
          required
          minLength={registrationFieldLimits.nameMinLength}
          maxLength={registrationFieldLimits.nameMaxLength}
          autoComplete="given-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="profileLastName" className="mb-1 block text-sm font-medium text-gray-700">
          Last name <span className="text-red-600">*</span>
        </label>
        <input
          id="profileLastName"
          name="lastName"
          type="text"
          required
          minLength={registrationFieldLimits.nameMinLength}
          maxLength={registrationFieldLimits.nameMaxLength}
          autoComplete="family-name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save and continue"}
      </button>
    </form>
  );
}

export function PasswordRequirementsHint() {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-500">
      {PASSWORD_REQUIREMENTS.map((requirement) => (
        <li key={requirement}>{requirement}</li>
      ))}
    </ul>
  );
}
