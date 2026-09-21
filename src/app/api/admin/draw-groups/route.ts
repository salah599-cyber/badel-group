import { NextResponse } from "next/server";
import { drawGroupsCore } from "@/lib/bracket/draw-groups-core";
import { requirePermission } from "@/lib/auth";
import { canManageTournament } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const { tournamentId } = (await request.json()) as { tournamentId?: string };
    if (!tournamentId) {
      return NextResponse.json({ ok: false, error: "Tournament id is required" }, { status: 400 });
    }

    const ctx = await requirePermission("results:manage");
    if (!canManageTournament(ctx, tournamentId)) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this tournament" },
        { status: 403 },
      );
    }

    const result = await drawGroupsCore(tournamentId);
    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
      body: JSON.stringify({
        sessionId: "9848f0",
        location: "api/admin/draw-groups/route.ts",
        message: "draw groups API result",
        data: { ok: result.ok, error: result.ok === false ? result.error : null, groupCount: result.ok ? result.groupCount : null },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not draw groups. Please try again.";
    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
      body: JSON.stringify({
        sessionId: "9848f0",
        location: "api/admin/draw-groups/route.ts:catch",
        message: "draw groups API threw",
        data: { message },
        timestamp: Date.now(),
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
    console.error("[draw-groups-api]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
