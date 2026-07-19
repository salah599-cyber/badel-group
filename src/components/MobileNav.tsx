"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

type MobileNavProps = {
  links: NavLink[];
  isAdmin: boolean;
};

export function MobileNav({ links, isAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-white hover:text-primary"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <nav
        id="mobile-nav-panel"
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-[min(100%,20rem)] flex-col border-l border-primary/10 bg-cream shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
          <span className="text-sm font-semibold text-primary-dark">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-white"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-gray-800 transition hover:bg-white hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-primary transition hover:bg-primary/10"
                >
                  Admin
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-3 border-t border-primary/10 p-4">
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="btn-primary block w-full py-3 text-center"
          >
            Sign Up
          </Link>
          {!isSignedIn && (
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="block w-full rounded-xl border border-gray-200 bg-white py-3 text-center text-sm font-semibold text-gray-700 transition hover:border-primary/30 hover:text-primary"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
