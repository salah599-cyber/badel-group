"use client";

import { useState, useTransition } from "react";
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
import { formatMatchScore } from "@/lib/bracket/score-format";
import type {
  GroupMatch,
  KnockoutMatch,
  KnockoutRound,
  Tournament,
  TournamentGroup,
  TournamentTeam,
} from "@/lib/types";
import { MatchScoreCard } from "@/components/bracket/MatchScoreCard";
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
  unpairedApprovedCount: number;
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
  unpairedApprovedCount,
  fixturesLocked,
}: TournamentRunPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [advancePerGroup, setAdvancePerGroup] = useState(tournament.advancePerGroup ?? 2);
  const [knockoutRound, setKnockoutRound] = useState<KnockoutRound>(
    tournament.knockoutStartRound ?? "quarterfinal",
  );
  const [thirdPlace, setThirdPlace] = useState(tournament.thirdPlacePlayoff);

  const teamLabels = new Map(teams.map((t) => [t.id, t.label]));

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
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

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red" role="alert">
          {error}
        </p>
      )}

      {tournament.status === "upcoming" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-bold">Close registration</h2>
          <p className="mb-4 text-sm text-gray-600">
            Stops new signups. Random-pairing tournaments will auto-pair remaining solos.
          </p>
          {unpairedApprovedCount > 0 && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red">
              {unpairedApprovedCount} approved player{unpairedApprovedCount === 1 ? "" : "s"} still
              need pairing. Use Player Pairing on the{" "}
              <a href="/admin#pairing" className="font-semibold underline">
                admin panel
              </a>{" "}
              first.
            </p>
          )}
          <button
            type="button"
            disabled={isPending}
            className="btn-primary"
            onClick={() =>
              run(async () => {
                const response = await fetch("/api/admin/close-registration", {
                  method: "POST",
                  credentials: "include",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ tournamentId: tournament.id }),
                });
                const result = (await response.json().catch(() => ({}))) as
                  | { ok: true }
                  | { ok: false; error: string };
                if (!response.ok || result.ok === false) {
                  return {
                    ok: false as const,
                    error:
                      ("error" in result && result.error) ||
                      `Could not close registration (${response.status})`,
                  };
                }
                return { ok: true as const };
              })
            }
          >
            {isPending ? "Closing…" : "Close registration"}
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
              onClick={() =>
                run(async () => {
                  const response = await fetch("/api/admin/draw-groups", {
                    method: "POST",
                    credentials: "include",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ tournamentId: tournament.id }),
                  });
                  const result = (await response.json().catch(() => ({}))) as
                    | { ok: true }
                    | { ok: false; error: string };
                  // #region agent log
                  fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
                    body: JSON.stringify({
                      sessionId: "9848f0",
                      location: "TournamentRunPanel.tsx:drawGroups",
                      message: "draw groups client response",
                      data: {
                        status: response.status,
                        ok: "ok" in result ? result.ok : null,
                        error: "error" in result ? result.error : null,
                      },
                      timestamp: Date.now(),
                      hypothesisId: "A",
                    }),
                  }).catch(() => {});
                  // #endregion
                  if (!response.ok || result.ok === false) {
                    return {
                      ok: false as const,
                      error:
                        ("error" in result && result.error) ||
                        `Could not draw groups (${response.status})`,
                    };
                  }
                  return { ok: true as const };
                })
              }
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
                      <MatchScoreCard
                        key={match.id}
                        teamAName={teamLabels.get(match.teamAId) ?? "A"}
                        teamBName={teamLabels.get(match.teamBId) ?? "B"}
                        teamAId={match.teamAId}
                        teamBId={match.teamBId}
                        scoreText={
                          match.status === "completed"
                            ? match.outcome === "walkover" && match.winnerId
                              ? `${teamLabels.get(match.winnerId) ?? "Winner"} — Walkover`
                              : formatMatchScore(match.sets)
                            : "Scheduled"
                        }
                        status={match.status}
                        matchFormat={tournament.matchFormat}
                        superTiebreakPoints={tournament.superTiebreakPoints}
                        initialSets={match.sets}
                        initialWalkover={match.outcome === "walkover"}
                        initialWalkoverWinnerId={match.winnerId ?? undefined}
                        disabled={isPending}
                        alwaysShowFormWhenScheduled
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
            disabled={isPending}
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
