import Link from "next/link";
import { formatTournamentDateTimeShort } from "@/lib/dates";
import type { Tournament, TournamentStatus } from "@/lib/types";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  upcoming: "Registration open",
  registration_closed: "Registration closed",
  group_stage: "Group stage",
  knockout_stage: "Knockout",
  completed: "Completed",
};

export function LiveTournamentCard({ tournament }: { tournament: Tournament }) {
  const dateFormatted =
    formatTournamentDateTimeShort(tournament.date, tournament.startTime) ?? tournament.date;
  const statusLabel = STATUS_LABELS[tournament.status] ?? tournament.status;

  return (
    <article className="card-hover flex flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-brand-green via-primary to-brand-red" />
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
          <span className="shrink-0 rounded-full bg-brand-green/15 px-3 py-1 text-xs font-bold text-brand-green">
            {statusLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-primary-dark">{dateFormatted}</p>
        <p className="text-sm text-gray-600">{tournament.location}</p>
        <p className="mt-4 flex-1 text-sm text-gray-700 line-clamp-2">{tournament.description}</p>
        <Link
          href={`/tournaments/${tournament.id}`}
          prefetch={false}
          className="mt-4 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          View lineups & scores
        </Link>
      </div>
    </article>
  );
}
