import type { StandingRow } from "@/lib/bracket/standings";

type StandingsTableProps = {
  rows: StandingRow[];
  teamLabels: Map<string, string>;
};

export function StandingsTable({ rows, teamLabels }: StandingsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="table-scroll">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-cream-dark text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">P</th>
              <th className="px-3 py-2">W</th>
              <th className="px-3 py-2">L</th>
              <th className="px-3 py-2">SF</th>
              <th className="px-3 py-2">SA</th>
              <th className="px-3 py-2">SD</th>
              <th className="px-3 py-2">GF</th>
              <th className="px-3 py-2">GA</th>
              <th className="px-3 py-2">GD</th>
              <th className="px-3 py-2">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.teamId}>
                <td className="px-3 py-2 font-medium">{row.rank}</td>
                <td className="px-3 py-2">{teamLabels.get(row.teamId) ?? row.teamId}</td>
                <td className="px-3 py-2">{row.played}</td>
                <td className="px-3 py-2">{row.won}</td>
                <td className="px-3 py-2">{row.lost}</td>
                <td className="px-3 py-2">{row.setsFor}</td>
                <td className="px-3 py-2">{row.setsAgainst}</td>
                <td className="px-3 py-2">{row.setDiff}</td>
                <td className="px-3 py-2">{row.gamesFor}</td>
                <td className="px-3 py-2">{row.gamesAgainst}</td>
                <td className="px-3 py-2">{row.gameDiff}</td>
                <td className="px-3 py-2 font-semibold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
