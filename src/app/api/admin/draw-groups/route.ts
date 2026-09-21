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
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not draw groups. Please try again.";
    console.error("[draw-groups-api]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
