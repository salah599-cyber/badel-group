import { getMediaSrc } from "@/lib/media";
import { normalizePlayerKey, parsePairNames, pointsForPlace } from "@/lib/rankings";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function placeNumber(place: string) {
  const match = place.match(/\d+/);
  return match ? Number(match[0]) : 0;
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

function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const src = photoUrl ? getMediaSrc(photoUrl) : null;
  const sizeClass = size === "sm" ? "size-14 sm:size-16" : "size-20 sm:size-24";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-2 border-primary/10 bg-primary/5 ${sizeClass}`}
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
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary sm:text-base">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

export function ResultPlacementCard({
  place,
  names,
  photoByKey,
}: {
  place: string;
  names: string;
  photoByKey: Map<string, string>;
}) {
  const rank = placeNumber(place);
  const players = parsePairNames(names);
  const points = pointsForPlace(place);
  const displayPlayers = players.length > 0 ? players : [names];

  return (
    <article className="section-shell card-hover relative overflow-hidden p-4 sm:p-5">
      <RankMedal rank={rank} />

      <div className="mb-4 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
            Place
          </p>
          <p className="text-4xl font-black leading-none text-gray-900 sm:text-5xl">{rank || place}</p>
        </div>

        <div className="flex shrink-0 items-center -space-x-3">
          {displayPlayers.slice(0, 2).map((player) => (
            <PlayerAvatar
              key={player}
              name={player}
              photoUrl={photoByKey.get(normalizePlayerKey(player)) ?? null}
              size={displayPlayers.length > 1 ? "sm" : "md"}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1 pr-10">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">
            Team
          </p>
          <div className="mt-0.5 space-y-0.5">
            {displayPlayers.map((player) => (
              <h3
                key={player}
                className="truncate text-base font-black tracking-wide text-primary-dark uppercase sm:text-lg"
              >
                {player}
              </h3>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-cream-dark/60 px-4 py-3 text-center">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">
          Points Earned
        </p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 sm:text-2xl">{points}</p>
      </div>
    </article>
  );
}
