import { RankingPlayerCard } from "@/components/RankingPlayerCard";
import { fetchTopRankings } from "@/lib/data";
import { PLACEMENT_POINTS } from "@/lib/rankings";

export const metadata = {
  title: "Rankings | Badel Group",
};

export default async function RankingsPage() {
  const rankings = await fetchTopRankings(12);

  return (
    <div className="min-h-screen bg-[#12121a]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="text-lg font-bold tracking-[0.2em] text-[#d4af37] uppercase sm:text-xl">
            Badel Group Ranking
          </h1>
        </header>

        {rankings.length > 0 ? (
          <div className="space-y-8">
            <div className="space-y-4">
              {rankings.map((player) => (
                <RankingPlayerCard key={player.name} player={player} />
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1e1e2e] p-5 sm:p-6">
              <h2 className="mb-3 text-base font-bold text-white">Scoring System</h2>
              <p className="mb-4 text-sm text-white/60">
                Each player in a placed team earns the full points for that placement. Players with
                the same total share a rank — for example, two players at 8 points are both 1st, and
                the next players at 6 points are ranked 3rd.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(PLACEMENT_POINTS).map(([place, points]) => (
                  <div
                    key={place}
                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center"
                  >
                    <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{place}</p>
                    <p className="mt-1 text-xl font-bold text-[#d4af37]">{points}</p>
                    <p className="text-xs text-white/40">points</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/20 bg-[#1e1e2e] p-10 text-center text-white/50">
            No rankings yet. Check back after tournament results are published!
          </p>
        )}
      </div>
    </div>
  );
}
