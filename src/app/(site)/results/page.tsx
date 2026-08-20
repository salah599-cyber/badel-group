import { ResultPlacementCard } from "@/components/ResultPlacementCard";
import { ResultPlacementRow } from "@/components/ResultPlacementRow";
import { SectionHeading } from "@/components/SectionHeading";
import { pointsForPlace } from "@/lib/rankings";
import { fetchPlayerProfiles, fetchResults } from "@/lib/data";

export const metadata = {
  title: "Results | Badel Group",
};

export const revalidate = 60;

function placeNumber(place: string) {
  const match = place.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

export default async function ResultsPage() {
  const [results, profiles] = await Promise.all([fetchResults(), fetchPlayerProfiles()]);
  const photoByKey = new Map(profiles.map((p) => [p.nameKey, p.photoUrl]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Tournament Results"
        subtitle="Past tournament winners and standings"
        align="center"
      />

      {results.length > 0 ? (
        <div className="space-y-10">
          {results.map((result) => {
            const sorted = [...result.winners].sort(
              (a, b) => placeNumber(a.place) - placeNumber(b.place),
            );
            const featured = sorted.filter((w) => placeNumber(w.place) <= 3);
            const rest = sorted.filter((w) => placeNumber(w.place) > 3);

            return (
              <section key={result.id} className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
                      Tournament
                    </p>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
                      {result.tournamentName}
                    </h2>
                  </div>
                  <time className="text-sm font-medium text-primary-dark">
                    {new Date(result.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>

                <div className="space-y-4">
                  {featured.map((winner) => (
                    <ResultPlacementCard
                      key={`${result.id}-${winner.place}`}
                      place={winner.place}
                      names={winner.names}
                      photoByKey={photoByKey}
                    />
                  ))}
                </div>

                {rest.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
                    {rest.map((winner) => (
                      <ResultPlacementRow
                        key={`${result.id}-${winner.place}`}
                        place={winner.place}
                        names={winner.names}
                        points={pointsForPlace(winner.place)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          No results posted yet. Check back after our next tournament!
        </p>
      )}
    </div>
  );
}
