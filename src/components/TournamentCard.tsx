import Link from "next/link";
import type { Tournament } from "@/lib/types";

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const fillPercent = Math.round((tournament.registeredCount / tournament.maxPlayers) * 100);
  const dateFormatted = new Date(tournament.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-brand-red via-white to-brand-green" />
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900 transition group-hover:text-primary">
            {tournament.name}
          </h3>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary-dark">
            {tournament.typeName}
          </span>
        </div>

        <div className="mb-4 space-y-1 text-sm">
          <p className="font-medium text-primary-dark">{dateFormatted}</p>
          <p className="text-gray-600">{tournament.location}</p>
        </div>

        <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-700">
          {tournament.description}
        </p>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="text-gray-500">
              {tournament.registeredCount}/{tournament.maxPlayers} registered
            </span>
            <span className={spotsLeft <= 4 ? "text-brand-red" : "text-brand-green"}>
              {spotsLeft} spots left
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cream-dark">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <Link
          href="/signup"
          className="rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Sign Up
        </Link>
      </div>
    </article>
  );
}
