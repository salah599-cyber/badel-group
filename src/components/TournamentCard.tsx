import Link from "next/link";
import type { Tournament } from "@/lib/types";

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const dateFormatted = new Date(tournament.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="flex flex-col rounded-2xl border border-primary/10 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
        <span className="shrink-0 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-primary-dark capitalize">
          {tournament.format}
        </span>
      </div>

      <p className="mb-1 text-sm text-gray-500">{dateFormatted}</p>
      <p className="mb-3 text-sm text-gray-600">{tournament.location}</p>
      <p className="mb-4 flex-1 text-sm text-gray-700">{tournament.description}</p>

      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {tournament.registeredCount}/{tournament.maxPlayers} registered
        </span>
        <span className={spotsLeft <= 4 ? "font-semibold text-brand-red" : "text-brand-green"}>
          {spotsLeft} spots left
        </span>
      </div>

      <Link
        href="/signup"
        className="rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        Sign Up
      </Link>
    </article>
  );
}
