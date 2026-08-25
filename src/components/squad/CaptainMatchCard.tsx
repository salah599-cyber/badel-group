"use client";

import { useTransition } from "react";
import { saveMatchLineupAction } from "@/lib/squad-actions";
import { formatLineupPair } from "@/lib/squad/lineups";
import { SquadLineupForm } from "@/components/squad/SquadLineupForm";
import type { MatchLineup } from "@/lib/types";

type CaptainMatchCardProps = {
  tournamentId: string;
  teamId: string;
  opponentLabel: string;
  groupMatchId?: string;
  knockoutMatchId?: string;
  rosterEntryIds: string[];
  entryNames: Map<string, string>;
  lineup?: MatchLineup;
  opponentLineup?: MatchLineup;
};

export function CaptainMatchCard({
  tournamentId,
  teamId,
  opponentLabel,
  groupMatchId,
  knockoutMatchId,
  rosterEntryIds,
  entryNames,
  lineup,
  opponentLineup,
}: CaptainMatchCardProps) {
  const [isPending, startTransition] = useTransition();
  const bothSubmitted = Boolean(lineup && opponentLineup);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-primary-dark">vs {opponentLabel}</h3>
      {bothSubmitted && lineup ? (
        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          <li>Set 1: {formatLineupPair(lineup.set1EntryIds, entryNames)}</li>
          <li>Set 2: {formatLineupPair(lineup.set2EntryIds, entryNames)}</li>
          <li>Set 3: {formatLineupPair(lineup.set3EntryIds, entryNames)}</li>
        </ul>
      ) : lineup ? (
        <p className="mt-2 text-sm text-gray-600">Lineup submitted. Waiting for opponent.</p>
      ) : (
        <SquadLineupForm
          rosterEntryIds={rosterEntryIds}
          entryNames={entryNames}
          disabled={isPending}
          onSubmit={(lineupPayload) =>
            startTransition(async () => {
              try {
                await saveMatchLineupAction({
                  tournamentId,
                  teamId,
                  groupMatchId,
                  knockoutMatchId,
                  lineup: lineupPayload,
                });
                window.location.reload();
              } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to submit lineup");
              }
            })
          }
        />
      )}
    </article>
  );
}
