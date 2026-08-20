"use client";

import { useState, useTransition } from "react";
import {
  closeRegistrationAction,
  configureKnockoutAction,
  drawGroupsAction,
  generateKnockoutBracketAction,
  getKnockoutSuggestionAction,
  lockGroupsAction,
  saveGroupMatchScoreAction,
  saveKnockoutMatchScoreAction,
  updateGroupMembershipAction,
} from "@/lib/bracket-actions";
import { computeStandings } from "@/lib/bracket/standings";
import { formatMatchScore } from "@/lib/bracket/score-format";
import type {
  GroupMatch,
  KnockoutMatch,
  KnockoutRound,
  Tournament,
  TournamentGroup,
  TournamentTeam,
} from "@/lib/types";
import { MatchScoreForm } from "@/components/bracket/MatchScoreForm";
import { StandingsTable } from "@/components/bracket/StandingsTable";
import { KnockoutBracketView } from "@/components/bracket/KnockoutBracketView";
import { GroupDrawEditor } from "@/components/bracket/GroupDrawEditor";

type TournamentRunPanelProps = {
  tournament: Tournament;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  groupMatches: GroupMatch[];
  knockoutMatches: KnockoutMatch[];
  confirmedTeamCount: number;
  fixturesLocked: boolean;
};

const ROUND_LABELS: Record<string, string> = {
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "3rd place playoff",
};

export function TournamentRunPanel({
  tournament,
  teams,
  groups,
  groupMatches,
  knockoutMatches,
  confirmedTeamCount,
  fixturesLocked,
}: TournamentRunPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [advancePerGroup, setAdvancePerGroup] = useState(tournament.advancePerGroup ?? 2);
  const [knockoutRound, setKnockoutRound] = useState<KnockoutRound>(
    tournament.knockoutStartRound ?? "quarterfinal",
  );
  const [thirdPlace, setThirdPlace] = useState(tournament.thirdPlacePlayoff);

  const teamLabels = new Map(teams.map((t) => [t.id, t.label]));

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        window.location.reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-primary/10 bg-white p-4">
        <p className="text-sm text-gray-600">
          Status: <span className="font-semibold capitalize">{tournament.status.replace(/_/g, " ")}</span>
          · {confirmedTeamCount} confirmed teams · Format: {tournament.matchFormat.replace(/_/g, " ")}
        </p>
      </div>

      {tournament.status === "upcoming" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-bold">Close registration</h2>
          <p className="mb-4 text-sm text-gray-600">
            Stops new signups. Random-pairing tournaments will auto-pair remaining solos.
          </p>
          <button
            type="button"
            disabled={isPending}
            className="btn-primary"
            onClick={() => run(() => closeRegistrationAction(tournament.id))}
          >
            Close registration
          </button>
        </section>
      )}

      {(tournament.status === "registration_closed" ||
        (tournament.status === "group_stage" && !fixturesLocked)) && (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-bold">Group draw</h2>
          {!groups.length ? (
            <button
              type="button"
              disabled={isPending}
              className="btn-primary"
              onClick={() => run(() => drawGroupsAction(tournament.id))}
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

      {(tournament.status === "group_stage" || tournament.status === "knockout_stage") &&
        groups.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-bold">Group stage</h2>
            {groups.map((group) => {
              const gMatches = groupMatches.filter((m) => m.groupId === group.id);
              const standings = computeStandings(
                group.teamIds,
                gMatches.map((m) => ({
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  winnerId: m.winnerId ?? null,
                  sets: m.sets,
                  status: m.status,
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
                    {gMatches.map((match) => (
                      <div
                        key={match.id}
                        className="rounded-xl border border-gray-100 bg-cream-dark/30 p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {teamLabels.get(match.teamAId)} vs {teamLabels.get(match.teamBId)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {match.status === "completed"
                              ? formatMatchScore(match.sets)
                              : "Scheduled"}
                          </p>
                        </div>
                        {match.status !== "completed" && tournament.status !== "completed" && (
                          <MatchScoreForm
                            matchFormat={tournament.matchFormat}
                            superTiebreakPoints={tournament.superTiebreakPoints}
                            teamAName={teamLabels.get(match.teamAId) ?? "A"}
                            teamBName={teamLabels.get(match.teamBId) ?? "B"}
                            teamAId={match.teamAId}
                            teamBId={match.teamBId}
                            disabled={isPending}
                            onSubmit={(data) =>
                              run(() =>
                                saveGroupMatchScoreAction({
                                  matchId: match.id,
                                  sets: data.sets,
                                  walkover: data.walkover,
                                  walkoverWinnerId: data.walkoverWinnerId,
                                }),
                              )
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

      {fixturesLocked && tournament.status !== "completed" && !knockoutMatches.length && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
          <h2 className="text-lg font-bold">Knockout configuration</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Teams advancing per group
              <input
                type="number"
                min={1}
                className="input mt-1"
                value={advancePerGroup}
                onChange={(e) => setAdvancePerGroup(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              Start round
              <select
                className="input mt-1"
                value={knockoutRound}
                onChange={(e) => setKnockoutRound(e.target.value as KnockoutRound)}
              >
                <option value="round_of_16">Round of 16</option>
                <option value="quarterfinal">Quarterfinal</option>
                <option value="semifinal">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={thirdPlace}
                onChange={(e) => setThirdPlace(e.target.checked)}
              />
              3rd place playoff
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
              onClick={() =>
                run(async () => {
                  const s = await getKnockoutSuggestionAction(tournament.id);
                  setKnockoutRound(s.suggestedRound);
                  setAdvancePerGroup(Math.max(1, Math.floor(s.advancingCount / groups.length)));
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
      )}

      {knockoutMatches.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Knockout bracket</h2>
          <KnockoutBracketView
            matches={knockoutMatches}
            teamLabels={teamLabels}
            roundLabels={ROUND_LABELS}
            admin
            matchFormat={tournament.matchFormat}
            superTiebreakPoints={tournament.superTiebreakPoints}
            disabled={isPending || tournament.status === "completed"}
            onSaveKnockout={(matchId, data) =>
              run(() =>
                saveKnockoutMatchScoreAction({
                  matchId,
                  sets: data.sets,
                  walkover: data.walkover,
                  walkoverWinnerId: data.walkoverWinnerId,
                }),
              )
            }
          />
        </section>
      )}
    </div>
  );
}
