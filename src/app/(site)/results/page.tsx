import { SectionHeading } from "@/components/SectionHeading";
import { fetchResults } from "@/lib/data";

export const metadata = {
  title: "Results | Badel Group",
};

export default async function ResultsPage() {
  const results = await fetchResults();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Tournament Results"
        subtitle="Past tournament winners and standings"
      />

      {results.length > 0 ? (
        <div className="space-y-6">
          {results.map((result) => (
            <article
              key={result.id}
              className="section-shell card-hover overflow-hidden"
            >
              <div className="mb-5 flex flex-col gap-2 border-b border-primary/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{result.tournamentName}</h2>
                <time className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary-dark">
                  {new Date(result.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              <div className="divide-y divide-gray-100">
                {result.winners.map((winner) => (
                  <div
                    key={winner.place}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span
                      className={`inline-flex w-fit min-w-16 items-center justify-center rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        winner.place === "1st"
                          ? "bg-primary/15 text-primary"
                          : winner.place === "2nd"
                            ? "bg-secondary/20 text-primary-dark"
                            : winner.place === "3rd"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {winner.place}
                    </span>
                    <span className="font-semibold text-gray-800">{winner.names}</span>
                  </div>
                ))}
              </div>
            </article>
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
