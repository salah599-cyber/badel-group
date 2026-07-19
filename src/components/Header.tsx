import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
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
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Badel Group"
            width={48}
            height={48}
            className="h-10 w-10 object-contain sm:h-12 sm:w-12"
            priority
          />
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-wide text-primary-dark uppercase">
              Badel Group
            </p>
            <p className="text-xs text-gray-500">Padel Tournaments</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-primary/10 hover:text-primary sm:px-3"
            >
              {link.label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="rounded-lg px-2 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10 sm:px-3"
            >
              Admin
            </Link>
          )}
          <Link
            href="/signup"
            className="ml-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-dark sm:ml-2 sm:px-4 sm:py-2"
          >
            Sign Up
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
