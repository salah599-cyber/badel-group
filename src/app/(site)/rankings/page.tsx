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
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Rankings"
        subtitle="Top players by tournament points"
        align="center"
      />

      {rankings.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-4">
            {rankings.map((player) => (
              <RankingPlayerCard key={player.name} player={player} />
            ))}
          </div>

          <div className="section-shell">
            <h2 className="mb-3 text-base font-bold text-gray-900">Scoring System</h2>
            <p className="mb-4 text-sm text-gray-600">
              Each player in a placed team earns the full points for that placement. Players with
              the same total share a rank — for example, two players at 8 points are both 1st, and
              the next players at 6 points are ranked 3rd.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(PLACEMENT_POINTS).map(([place, points]) => (
                <div
                  key={place}
                  className="rounded-xl border border-primary/10 bg-cream-dark/60 px-4 py-3 text-center"
                >
                  <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">{place}</p>
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
