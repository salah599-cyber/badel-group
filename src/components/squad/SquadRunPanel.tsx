"use client";

import { useState, useTransition } from "react";
import { closeRegistrationAction } from "@/lib/actions/close-registration";
import {
  configureKnockoutAction,
  generateKnockoutBracketAction,
  getKnockoutSuggestionAction,
  lockGroupsAction,
  saveGroupMatchScoreAction,
  saveKnockoutMatchScoreAction,
  updateGroupMembershipAction,
} from "@/lib/bracket-actions";
import { computeStandings } from "@/lib/bracket/standings";
import { GroupDrawEditor } from "@/components/bracket/GroupDrawEditor";
import { KnockoutBracketView } from "@/components/bracket/KnockoutBracketView";
import { StandingsTable } from "@/components/bracket/StandingsTable";
import { SquadMatchCard } from "@/components/squad/SquadMatchCard";
import { SquadRankingSection } from "@/components/squad/SquadRankingSection";
import { SquadTeamsSection } from "@/components/squad/SquadTeamsSection";
import { drawSquadGroupsAction, saveMatchLineupAction } from "@/lib/squad-actions";
import type {
  Entry,
  GroupMatch,
  KnockoutMatch,
  KnockoutRound,
  MatchLineup,
  Tournament,
  TournamentGroup,
  TournamentTeam,
} from "@/lib/types";

type SquadRunPanelProps = {
  tournament: Tournament;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  groupMatches: GroupMatch[];
  knockoutMatches: KnockoutMatch[];
  lineups: MatchLineup[];
  entries: Entry[];
  fixturesLocked: boolean;
};

const ROUND_LABELS: Record<string, string> = {
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "3rd place playoff",
};

export function SquadRunPanel({
  tournament,
  teams,
  groups,
  groupMatches,
  knockoutMatches,
  lineups,
  entries,
  fixturesLocked,
}: SquadRunPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const teamLabels = new Map(teams.map((team) => [team.id, team.label]));
  const entryNames = new Map(entries.map((entry) => [entry.id, entry.name]));
  const approvedCount = entries.filter((entry) => entry.status === "approved").length;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string } | void>) {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (result && "ok" in result && result.ok === false) {
          setError(result.error);
          return;
        }
        window.location.reload();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-primary/10 bg-white p-4">
        <p className="text-sm text-gray-600">
          Status:{" "}
          <span className="font-semibold capitalize">{tournament.status.replace(/_/g, " ")}</span>
          · {approvedCount}/{tournament.maxPlayers} players approved · 3 x 2v2 per match
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red" role="alert">
          {error}
        </p>
      )}

      {tournament.status === "upcoming" && (
        <>
          <SquadRankingSection entries={entries} disabled={isPending} />
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-bold">Close registration</h2>
            <p className="mb-4 text-sm text-gray-600">
              Requires {tournament.maxPlayers} approved players, each with an admin skill rank.
            </p>
            <button
              type="button"
              disabled={isPending}
              className="btn-primary"
              onClick={() => run(() => closeRegistrationAction(tournament.id))}
            >
              {isPending ? "Closing…" : "Close registration"}
            </button>
          </section>
        </>
      )}

      {(tournament.status === "registration_closed" ||
        tournament.status === "group_stage" ||
        tournament.status === "upcoming") && (
        <>
          {(tournament.status === "registration_closed" || tournament.status === "group_stage") && (
            <SquadTeamsSection
              tournamentId={tournament.id}
              teams={teams}
              entries={entries}
              disabled={isPending || fixturesLocked}
            />
          )}
        </>
      )}

      {(tournament.status === "registration_closed" ||
        (tournament.status === "group_stage" && !fixturesLocked)) && (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-bold">Group draw</h2>
          {!groups.length ? (
            <button
              type="button"
              disabled={isPending || teams.length !== 8}
              className="btn-primary"
              onClick={() => run(() => drawSquadGroupsAction(tournament.id))}
            >
              Draw groups
            </button>
          ) : (
            <>
              <GroupDrawEditor
                groups={groups}
                teamLabels={teamLabels}
                disabled={fixturesLocked || isPending}
                onSave={(payload) =>
                  run(() => updateGroupMembershipAction(tournament.id, payload))
                }
              />
              {!fixturesLocked && (
                <button
                  type="button"
                  disabled={isPending}
                  className="btn-primary"
                  onClick={() => run(() => lockGroupsAction(tournament.id))}
                >
                  Lock groups & generate fixtures
                </button>
              )}
            </>
          )}
        </section>
      )}

      {(tournament.status === "group_stage" ||
        tournament.status === "knockout_stage" ||
        tournament.status === "completed") &&
        groups.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-bold">Group stage</h2>
            {groups.map((group) => {
              const gMatches = groupMatches.filter((match) => match.groupId === group.id);
              const standings = computeStandings(
                group.teamIds,
                gMatches.map((match) => ({
                  teamAId: match.teamAId,
                  teamBId: match.teamBId,
                  winnerId: match.winnerId ?? null,
                  sets: match.sets,
                  status: match.status,
                })),
                tournament.pointsWin,
                tournament.pointsLoss,
                group.manualTiebreakOrder,
              );

              return (
                <div key={group.id} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="font-bold text-primary-dark">Group {group.label}</h3>
                  <StandingsTable rows={standings} teamLabels={teamLabels} />
                  <div className="space-y-3">
                    {gMatches.map((match) => {
                      const teamA = teams.find((team) => team.id === match.teamAId);
                      const teamB = teams.find((team) => team.id === match.teamBId);
                      if (!teamA || !teamB) return null;

                      const matchLineups = lineups.filter(
                        (lineup) => lineup.groupMatchId === match.id,
                      );

                      return (
                        <SquadMatchCard
                          key={match.id}
                          tournamentId={tournament.id}
                          matchId={match.id}
                          matchType="group"
                          teamA={teamA}
                          teamB={teamB}
                          entryNames={entryNames}
                          lineups={matchLineups}
                          sets={match.sets}
                          status={match.status}
                          winnerId={match.winnerId}
                          outcome={match.outcome}
                          disabled={isPending}
                          onSaveLineup={async (teamId, lineup) => {
                            await saveMatchLineupAction({
                              tournamentId: tournament.id,
                              teamId,
                              groupMatchId: match.id,
                              lineup,
                              asAdmin: true,
                            });
                            window.location.reload();
                          }}
                          onSaveScore={async (data) => {
                            await saveGroupMatchScoreAction({
                              matchId: match.id,
                              sets: data.sets,
                              walkover: data.walkover,
                              walkoverWinnerId: data.walkoverWinnerId,
                            });
                            window.location.reload();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}

      {fixturesLocked && tournament.status !== "completed" && !knockoutMatches.length && (
        <KnockoutConfig
          tournament={tournament}
          groups={groups}
          isPending={isPending}
          run={run}
        />
      )}

      {knockoutMatches.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Knockout bracket</h2>
          {knockoutMatches.map((match) => {
            const teamA = teams.find((team) => team.id === match.teamAId);
            const teamB = teams.find((team) => team.id === match.teamBId);
            if (!teamA || !teamB) return null;

            const matchLineups = lineups.filter(
              (lineup) => lineup.knockoutMatchId === match.id,
            );

            return (
              <SquadMatchCard
                key={match.id}
                tournamentId={tournament.id}
                matchId={match.id}
                matchType="knockout"
                teamA={teamA}
                teamB={teamB}
                entryNames={entryNames}
                lineups={matchLineups}
                sets={match.sets}
                status={match.status}
                winnerId={match.winnerId}
                outcome={match.outcome}
                disabled={isPending}
                onSaveLineup={async (teamId, lineup) => {
                  await saveMatchLineupAction({
                    tournamentId: tournament.id,
                    teamId,
                    knockoutMatchId: match.id,
                    lineup,
                    asAdmin: true,
                  });
                  window.location.reload();
                }}
                onSaveScore={async (data) => {
                  await saveKnockoutMatchScoreAction({
                    matchId: match.id,
                    sets: data.sets,
                    walkover: data.walkover,
                    walkoverWinnerId: data.walkoverWinnerId,
                  });
                  window.location.reload();
                }}
              />
            );
          })}

          <KnockoutBracketView
            matches={knockoutMatches}
            teamLabels={teamLabels}
            roundLabels={ROUND_LABELS}
            admin={false}
            matchFormat={tournament.matchFormat}
            superTiebreakPoints={tournament.superTiebreakPoints}
            disabled={isPending}
            onSaveKnockout={() => Promise.resolve()}
          />
        </section>
      )}
    </div>
  );
}

function KnockoutConfig({
  tournament,
  groups,
  isPending,
  run,
}: {
  tournament: Tournament;
  groups: TournamentGroup[];
  isPending: boolean;
  run: (action: () => Promise<void>) => void;
}) {
  const advancePerGroup = tournament.advancePerGroup ?? 2;
  const knockoutRound = (tournament.knockoutStartRound ?? "semifinal") as KnockoutRound;
  const thirdPlace = tournament.thirdPlacePlayoff;

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold">Knockout configuration</h2>
      <p className="text-sm text-gray-600">
        Top {advancePerGroup} from each group advance to {ROUND_LABELS[knockoutRound]}.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
          onClick={() =>
            run(async () => {
              const suggestion = await getKnockoutSuggestionAction(tournament.id);
              await configureKnockoutAction({
                tournamentId: tournament.id,
                advancePerGroup: Math.max(1, Math.floor(suggestion.advancingCount / groups.length)),
                knockoutStartRound: suggestion.suggestedRound,
                thirdPlacePlayoff: thirdPlace,
              });
            })
          }
        >
          Use suggested settings
        </button>
        <button
          type="button"
          disabled={isPending}
          className="btn-primary"
          onClick={() =>
            run(async () => {
              await configureKnockoutAction({
                tournamentId: tournament.id,
                advancePerGroup,
                knockoutStartRound: knockoutRound,
                thirdPlacePlayoff: thirdPlace,
              });
              await generateKnockoutBracketAction(tournament.id);
            })
          }
        >
          Generate bracket
        </button>
      </div>
    </section>
  );
}
