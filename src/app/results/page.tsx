import { fetchResults } from "@/lib/data";

export const metadata = {
  title: "Results | Badel Group",
};

export default async function ResultsPage() {
  const results = await fetchResults();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Results</h1>
        <p className="text-gray-600">Past tournament winners and standings</p>
      </div>

      {results.length > 0 ? (
        <div className="space-y-6">
          {results.map((result) => (
            <article
              key={result.id}
              className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-gray-900">{result.tournamentName}</h2>
                <time className="text-sm text-gray-500">
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
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className={`text-sm font-bold uppercase ${
                        winner.place === "1st"
                          ? "text-primary"
                          : winner.place === "2nd"
                            ? "text-secondary"
                            : "text-gray-500"
                      }`}
                    >
                      {winner.place}
                    </span>
                    <span className="font-medium text-gray-800">{winner.names}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          No results posted yet. Check back after our next tournament!
        </p>
      )}
    </div>
  );
}
