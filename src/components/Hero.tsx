import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-secondary" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-brand-green/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-[auto_1fr] lg:gap-14 lg:py-24">
        <div className="mx-auto flex justify-center lg:mx-0">
          <Logo size="xl" className="drop-shadow-2xl" />
        </div>

        <div className="text-center lg:text-left">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-white/90 uppercase backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Padel Tournaments & Community
          </p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Welcome to Badel Group
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/90 lg:mx-0 mx-auto">
            Join our padel community. Compete in tournaments, connect with players,
            and celebrate the sport together.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-7 py-3.5 text-center font-semibold text-primary shadow-lg transition hover:bg-cream hover:shadow-xl"
            >
              Register for a Tournament
            </Link>
            <Link
              href="/gallery"
              className="rounded-xl border border-white/50 bg-white/10 px-7 py-3.5 text-center font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              View Gallery
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
