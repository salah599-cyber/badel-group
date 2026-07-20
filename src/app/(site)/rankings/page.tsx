import { RankingPlayerCard } from "@/components/RankingPlayerCard";
import { SectionHeading } from "@/components/SectionHeading";
import { fetchTopRankings } from "@/lib/data";
import { PLACEMENT_POINTS } from "@/lib/rankings";

export const metadata = {
  title: "Rankings | Badel Group",
};

export default async function RankingsPage() {
  const rankings = await fetchTopRankings(12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Player Rankings"
        subtitle="Top 12 players ranked by points earned across all tournaments"
      />

      {rankings.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rankings.map((player) => (
              <RankingPlayerCard key={player.name} player={player} />
            ))}
          </div>

          <div className="section-shell p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Scoring System</h2>
            <p className="mb-4 text-sm text-gray-600">
              Each player in a placed pair earns the full points for that placement.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(PLACEMENT_POINTS).map(([place, points]) => (
                <div
                  key={place}
                  className="rounded-xl border border-primary/10 bg-cream/50 px-4 py-3 text-center"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{place}</p>
                  <p className="mt-1 text-xl font-bold text-primary">{points}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          No rankings yet. Check back after tournament results are published!
        </p>
      )}
    </div>
  );
}
