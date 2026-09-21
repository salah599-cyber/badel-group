import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  configureKnockoutAction,
  generateKnockoutBracketAction,
  getKnockoutSuggestionAction,
  saveGroupMatchScoreAction,
  saveKnockoutMatchScoreAction,
} from "@/lib/bracket-actions";
import { lockGroupsCore, updateGroupMembershipCore } from "@/lib/bracket/group-ops-core";
import { canManageTournament } from "@/lib/permissions";
import type { KnockoutRound } from "@/lib/bracket/knockout";
import type { MatchSet } from "@/lib/db/schema";

type BracketBody = {
  action?: string;
  tournamentId?: string;
  groups?: { groupId: string; teamIds: string[] }[];
  advancePerGroup?: number;
  knockoutStartRound?: KnockoutRound;
  thirdPlacePlayoff?: boolean;
  matchId?: string;
  sets?: MatchSet[];
  walkover?: boolean;
  walkoverWinnerId?: string;
};

function jsonResult(result: { ok: true } | { ok: false; error: string }, extra?: Record<string, unknown>) {
  return NextResponse.json(
    extra ? { ...result, ...extra } : result,
    { status: result.ok ? 200 : 400 },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BracketBody;
    const action = body.action;

    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a55fac" },
      body: JSON.stringify({
        sessionId: "a55fac",
        location: "api/admin/bracket/route.ts:entry",
        message: "bracket API entry",
        data: {
          action: action ?? null,
          hasTournamentId: Boolean(body.tournamentId),
          groupCount: Array.isArray(body.groups) ? body.groups.length : 0,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    if (!action) {
      return NextResponse.json({ ok: false, error: "Action is required" }, { status: 400 });
    }

    if (
      action === "update-groups" ||
      action === "lock-groups" ||
      action === "configure-knockout" ||
      action === "generate-knockout" ||
      action === "knockout-suggestion"
    ) {
      if (!body.tournamentId) {
        return NextResponse.json({ ok: false, error: "Tournament id is required" }, { status: 400 });
      }

      const ctx = await requirePermission("results:manage");
      if (!canManageTournament(ctx, body.tournamentId)) {
        return NextResponse.json(
          { ok: false, error: "You do not have access to this tournament" },
          { status: 403 },
        );
      }

      if (action === "update-groups") {
        const result = await updateGroupMembershipCore(body.tournamentId, body.groups ?? []);
        return jsonResult(result);
      }

      if (action === "lock-groups") {
        const result = await lockGroupsCore(body.tournamentId);
        return jsonResult(result);
      }

      if (action === "knockout-suggestion") {
        const suggestion = await getKnockoutSuggestionAction(body.tournamentId);
        return NextResponse.json({ ok: true, ...suggestion });
      }

      await configureKnockoutAction({
        tournamentId: body.tournamentId,
        advancePerGroup: body.advancePerGroup ?? 2,
        knockoutStartRound: body.knockoutStartRound ?? "quarterfinal",
        thirdPlacePlayoff: Boolean(body.thirdPlacePlayoff),
      });
      if (action === "configure-knockout") {
        return NextResponse.json({ ok: true });
      }
      await generateKnockoutBracketAction(body.tournamentId);
      return NextResponse.json({ ok: true });
    }

    if (action === "save-group-score") {
      if (!body.matchId) {
        return NextResponse.json({ ok: false, error: "Match id is required" }, { status: 400 });
      }
      await saveGroupMatchScoreAction({
        matchId: body.matchId,
        sets: body.sets ?? [],
        walkover: body.walkover,
        walkoverWinnerId: body.walkoverWinnerId,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "save-knockout-score") {
      if (!body.matchId) {
        return NextResponse.json({ ok: false, error: "Match id is required" }, { status: 400 });
      }
      await saveKnockoutMatchScoreAction({
        matchId: body.matchId,
        sets: body.sets ?? [],
        walkover: body.walkover,
        walkoverWinnerId: body.walkoverWinnerId,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the bracket. Please try again.";
    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a55fac" },
      body: JSON.stringify({
        sessionId: "a55fac",
        location: "api/admin/bracket/route.ts:catch",
        message: "bracket API threw",
        data: { errMessage: message.slice(0, 300) },
        timestamp: Date.now(),
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    console.error("[bracket-api]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
