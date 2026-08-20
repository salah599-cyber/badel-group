import { RankingPlayerCard } from "@/components/RankingPlayerCard";
import { RankingsSeasonNav } from "@/components/RankingsSeasonNav";
import { SectionHeading } from "@/components/SectionHeading";
import {
  fetchCurrentRankingSeason,
  fetchRankingSeasonsForDisplay,
  fetchSeasonRankings,
  fetchTopRankings,
} from "@/lib/data";
import { hasDatabase } from "@/lib/db";
import { PLACEMENT_POINTS } from "@/lib/rankings";

export const metadata = {
  title: "Rankings | Badel Group",
};

export const revalidate = 60;

type RankingsPageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const { season: seasonParam } = await searchParams;

  const [seasons, currentSeason] = await Promise.all([
    hasDatabase() ? fetchRankingSeasonsForDisplay() : Promise.resolve([]),
    hasDatabase() ? fetchCurrentRankingSeason() : Promise.resolve(null),
  ]);

  let rankings;
  let activeSeason = currentSeason;
  let isArchivedView = false;

  if (hasDatabase() && seasonParam) {
    const { season, rankings: seasonRankings, isCurrent } = await fetchSeasonRankings(seasonParam);
    if (season) {
      activeSeason = season;
      rankings = seasonRankings;
      isArchivedView = !isCurrent;
    } else {
      rankings = await fetchTopRankings(12);
    }
  } else {
    rankings = await fetchTopRankings(12);
  }

  const subtitle = isArchivedView
    ? `Final standings — ${activeSeason?.name ?? "Archived season"}`
    : "Top players by tournament points";

  const emptyMessage = isArchivedView
    ? "No rankings were saved for this season."
    : currentSeason && rankings.length === 0
      ? "A new season has started. Rankings will appear after the next tournament."
      : "No rankings yet. Check back after tournament results are published!";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading title="Rankings" subtitle={subtitle} align="center" />

      {seasons.length > 0 && (
        <RankingsSeasonNav
          seasons={seasons}
          currentSeasonId={currentSeason?.id}
          selectedSeasonId={seasonParam ?? currentSeason?.id}
        />
      )}

      {rankings.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-4">
            {rankings.map((player) => (
              <RankingPlayerCard key={`${activeSeason?.id ?? "current"}-${player.name}`} player={player} />
            ))}
          </div>

          {!isArchivedView && (
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
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
