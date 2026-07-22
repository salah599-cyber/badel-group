"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import type { AdminMetadata } from "@/lib/permissions";

type UserAccountMenuProps = {
  membershipNumber?: string | null;
};

export function UserAccountMenu({ membershipNumber }: UserAccountMenuProps) {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const metadata = user.publicMetadata as AdminMetadata;
  const resolvedMembershipNumber =
    membershipNumber ?? metadata.membershipNumber ?? null;
  const email = user.primaryEmailAddress?.emailAddress;
  const name =
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "Account";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full ring-2 ring-transparent transition hover:ring-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="font-semibold text-gray-900">{name}</p>
            {email ? <p className="text-sm text-gray-500">{email}</p> : null}
            {resolvedMembershipNumber ? (
              <p className="mt-1 text-sm font-medium text-primary">
                Member #{resolvedMembershipNumber}
              </p>
            ) : null}
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openUserProfile();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            >
              Manage account
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut({ redirectUrl: "/" });
              }}
              className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type AuthNavProps = {
  membershipNumber?: string | null;
};

export function AuthNav({ membershipNumber }: AuthNavProps) {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return <UserAccountMenu membershipNumber={membershipNumber} />;
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
