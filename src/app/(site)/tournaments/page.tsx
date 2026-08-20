import Link from "next/link";
import { LiveTournamentCard } from "@/components/bracket/LiveTournamentCard";
import { LiveTournamentRefresh } from "@/components/bracket/LiveTournamentRefresh";
import { SectionHeading } from "@/components/SectionHeading";
import { fetchLiveTournaments } from "@/lib/data";

export const metadata = {
  title: "Live tournaments | Badel Group",
};

export const revalidate = 30;

export default async function LiveTournamentsPage() {
  const live = await fetchLiveTournaments();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Live tournaments"
        subtitle="Group lineups, matchups, and scores — updated by tournament admins"
        align="center"
      />

      <LiveTournamentRefresh>
        {live.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {live.map((tournament) => (
              <LiveTournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
            No tournaments are live right now. Check back during event day or browse{" "}
            <Link href="/results" className="font-semibold text-primary hover:text-primary-dark">
              past results
            </Link>
            .
          </p>
        )}
      </LiveTournamentRefresh>

      <Link
        href="/"
        prefetch={false}
        className="mt-8 inline-block text-sm font-semibold text-primary hover:text-primary-dark"
      >
        ← Back to home
      </Link>
    </div>
  );
}
