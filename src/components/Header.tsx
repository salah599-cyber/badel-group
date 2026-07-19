import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { AuthNav } from "@/components/AuthNav";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { isAdmin } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
  { href: "/results", label: "Results" },
  { href: "/sponsors", label: "Sponsors" },
];

function SignupLink({ pendingCount }: { pendingCount: number }) {
  return (
    <Link
      href="/signup"
      className="relative hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark md:inline-flex"
    >
      Sign Up
      {pendingCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}

export async function Header() {
  const [admin, user] = await Promise.all([isAdmin(), currentUser()]);
  const pendingCount = user?.id ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-cream/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group min-w-0 shrink-0">
          <Logo
            size="md"
            showText
            className="transition group-hover:opacity-90 [&>div:last-child]:hidden sm:[&>div:last-child]:block"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <SignupLink pendingCount={pendingCount} />
          <AuthNav />
          <MobileNav links={navLinks} isAdmin={admin} pendingCount={pendingCount} />
        </div>
      </div>
    </header>
  );
}
