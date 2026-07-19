"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";

export function AuthNav() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: { avatarBox: "h-8 w-8" },
        }}
      />
    );
  }

  return (
    <Link
      href="/sign-in"
      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary"
    >
      Sign In
    </Link>
  );
}
