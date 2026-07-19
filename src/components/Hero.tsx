import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-secondary">
      <div className="absolute inset-0 opacity-10">
        <Image
          src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1600&h=900&fit=crop"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-24 lg:flex-row lg:text-left">
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Badel Group"
            width={200}
            height={200}
            className="mx-auto h-40 w-40 object-contain drop-shadow-lg sm:h-48 sm:w-48 lg:mx-0"
            priority
          />
        </div>

        <div className="max-w-xl">
          <p className="mb-2 text-sm font-semibold tracking-widest text-white/80 uppercase">
            Padel Tournaments & Community
          </p>
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Welcome to Badel Group
          </h1>
          <p className="mb-8 text-lg text-white/90">
            Join our padel community. Compete in tournaments, connect with players,
            and celebrate the sport together.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-primary transition hover:bg-cream"
            >
              Register for a Tournament
            </Link>
            <Link
              href="/gallery"
              className="rounded-xl border-2 border-white/60 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              View Gallery
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
