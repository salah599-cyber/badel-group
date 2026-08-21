export function ResultPlacementRow({
  place,
  names,
  points,
  showPoints = true,
}: {
  place: string;
  names: string;
  points: number;
  showPoints?: boolean;
}) {
  const rank = Number(place.match(/\d+/)?.[0] ?? 0);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 shrink-0 text-lg font-black text-gray-400">{rank}</span>
        <span className="truncate font-semibold text-primary-dark">{names}</span>
      </div>
      {showPoints && (
        <span className="shrink-0 text-xs font-medium text-gray-500">
          {points} pt{points === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
