import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { Logo } from "@/components/Logo";
import { isAdmin } from "@/lib/auth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
  { href: "/results", label: "Results" },
  { href: "/sponsors", label: "Sponsors" },
];

export async function Header() {
  const admin = await isAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-cream/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group shrink-0">
          <Logo size="md" showText className="transition group-hover:opacity-90" />
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-primary sm:inline-flex md:px-3"
            >
              {link.label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="hidden rounded-lg px-2.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 sm:inline-flex md:px-3"
            >
              Admin
            </Link>
          )}
          <Link
            href="/signup"
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark sm:px-4"
          >
            Sign Up
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
