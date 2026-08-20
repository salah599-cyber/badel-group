import Link from "next/link";
import type { RankingSeason } from "@/lib/types";

type RankingsSeasonNavProps = {
  seasons: RankingSeason[];
  currentSeasonId?: string | null;
  selectedSeasonId?: string | null;
};

export function RankingsSeasonNav({
  seasons,
  currentSeasonId,
  selectedSeasonId,
}: RankingsSeasonNavProps) {
  if (seasons.length <= 1) return null;

  const activeId = selectedSeasonId ?? currentSeasonId ?? seasons[0]?.id;

  return (
    <nav
      aria-label="Ranking seasons"
      className="mb-8 flex flex-wrap justify-center gap-2"
    >
      {seasons.map((season) => {
        const isCurrent = season.id === currentSeasonId;
        const isActive = season.id === activeId;
        const href = isCurrent ? "/rankings" : `/rankings?season=${season.id}`;
        const label = isCurrent ? "Current season" : season.name;

        return (
          <Link
            key={season.id}
            href={href}
            prefetch={false}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "border border-primary/20 bg-white text-primary hover:bg-primary/5"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
