import Image from "next/image";
import { getMediaSrc } from "@/lib/media";
import type { PlayerRanking } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function RankingPlayerCard({ player }: { player: PlayerRanking }) {
  return (
    <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dark to-[#1a1a2e] p-4 shadow-lg sm:p-5">
      <div className="flex items-end gap-3">
        <span
          className="shrink-0 text-6xl font-black leading-none text-white/90 sm:text-7xl"
          aria-hidden
        >
          {player.rank}
        </span>

        <div className="relative -ml-2 h-24 w-20 shrink-0 sm:h-28 sm:w-24">
          {player.photoUrl ? (
            <Image
              src={getMediaSrc(player.photoUrl)}
              alt={player.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 80px, 96px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
              {getInitials(player.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <h3 className="truncate text-base font-bold tracking-wide text-white uppercase sm:text-lg">
            {player.name}
          </h3>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-sm text-white/90">
        <span>
          {player.placements} placement{player.placements !== 1 ? "s" : ""}
        </span>
        <span className="font-bold text-secondary">Points {player.points}</span>
      </div>
    </article>
  );
}
