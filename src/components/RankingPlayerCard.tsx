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

  const badgeClass =
    rank === 1
      ? "bg-primary/15 text-primary"
      : rank === 2
        ? "bg-secondary/20 text-primary-dark"
        : "bg-amber-100 text-amber-800";

  return (
    <div
      className={`absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full shadow-sm sm:top-4 sm:right-4 sm:h-11 sm:w-11 ${badgeClass}`}
      aria-hidden
    >
      <span className="text-sm font-black">{rank}</span>
    </div>
  );
}

function PlayerAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const src = photoUrl ? getMediaSrc(photoUrl) : null;

  return (
    <div
      className="relative size-20 shrink-0 self-center overflow-hidden rounded-full border-2 border-primary/10 bg-primary/5 sm:size-24"
      role={src ? "img" : undefined}
      aria-label={src ? name : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar crop needs explicit object-position control
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full max-w-none object-cover"
          style={{ objectFit: "cover", objectPosition: "center 20%" }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

export function RankingPlayerCard({ player }: { player: PlayerRanking }) {
  const { firstName, lastName } = splitName(player.name);

  return (
    <article className="section-shell card-hover relative overflow-hidden p-4 sm:p-5">
      <RankMedal rank={player.rank} />

      <div className="mb-4 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">Rank</p>
          <p className="text-4xl font-black leading-none text-gray-900 sm:text-5xl">{player.rank}</p>
        </div>

        <PlayerAvatar name={player.name} photoUrl={player.photoUrl} />

        <div className="min-w-0 flex-1 pr-10">
          {firstName && (
            <p className="truncate text-sm font-medium text-gray-600">{firstName}</p>
          )}
          <h3 className="truncate text-xl font-black tracking-wide text-primary-dark uppercase sm:text-2xl">
            {lastName || player.name}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-cream-dark/60 px-4 py-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">Points</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900 sm:text-2xl">{player.points}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">
            Tournaments Played
          </p>
          <p className="mt-0.5 text-xl font-bold text-gray-900 sm:text-2xl">{player.placements}</p>
        </div>
      </div>
    </article>
  );
}
