import { ResultPlacementCard } from "@/components/ResultPlacementCard";
import { SectionHeading } from "@/components/SectionHeading";
import { fetchPlayerProfiles, fetchResults } from "@/lib/data";

export const metadata = {
  title: "Results | Badel Group",
};

export const revalidate = 60;

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
          {results.map((result) => (
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
                {result.winners.map((winner) => (
                  <ResultPlacementCard
                    key={`${result.id}-${winner.place}`}
                    place={winner.place}
                    names={winner.names}
                    photoByKey={photoByKey}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          No results posted yet. Check back after our next tournament!
        </p>
      )}
    </div>
  );
}
