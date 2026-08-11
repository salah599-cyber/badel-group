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

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: "", lastName: parts[0] ?? "" };
  }
  const lastName = parts.pop()!;
  return { firstName: parts.join(" "), lastName };
}

function RankMedal({ rank }: { rank: number }) {
  if (rank > 3) return null;

  const colors =
    rank === 1
      ? { fill: "#d4af37", stroke: "#f5d76e", label: "1" }
      : rank === 2
        ? { fill: "#a8a9ad", stroke: "#d1d2d4", label: "2" }
        : { fill: "#cd7f32", stroke: "#e8a862", label: "3" };

  return (
    <div
      className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full shadow-md sm:top-4 sm:right-4 sm:h-11 sm:w-11"
      style={{ background: `linear-gradient(135deg, ${colors.stroke}, ${colors.fill})` }}
      aria-hidden
    >
      <span className="text-sm font-black text-white drop-shadow-sm">{colors.label}</span>
    </div>
  );
}

export function RankingPlayerCard({ player }: { player: PlayerRanking }) {
  const { firstName, lastName } = splitName(player.name);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#1e1e2e] p-4 shadow-lg sm:p-5">
      <RankMedal rank={player.rank} />

      <div className="mb-4 flex items-start gap-4">
        <div className="shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">Rank</p>
          <p className="text-4xl font-black leading-none text-white sm:text-5xl">{player.rank}</p>
        </div>

        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white/10 sm:h-24 sm:w-24">
          {player.photoUrl ? (
            <Image
              src={getMediaSrc(player.photoUrl)}
              alt={player.name}
              fill
              className="object-cover object-top"
              sizes="96px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10 text-lg font-bold text-white">
              {getInitials(player.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1 pr-10">
          {firstName && (
            <p className="truncate text-sm font-medium text-white/80">{firstName}</p>
          )}
          <h3 className="truncate text-xl font-black tracking-wide text-[#d4af37] uppercase sm:text-2xl">
            {lastName || player.name}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-black/30 px-4 py-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-white/50 uppercase">Points</p>
          <p className="mt-0.5 text-xl font-bold text-white sm:text-2xl">{player.points}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-white/50 uppercase">
                          Tournaments Played
          </p>
          <p className="mt-0.5 text-xl font-bold text-white sm:text-2xl">{player.placements}</p>
        </div>
      </div>
    </article>
  );
}
