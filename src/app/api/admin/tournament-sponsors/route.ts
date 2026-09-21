import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/auth";
import { canManageTournament } from "@/lib/permissions";
import { db } from "@/lib/db";
import { tournamentSponsors } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const input = (await request.json()) as {
      tournamentId?: string;
      name?: string;
      tier?: "platinum" | "gold" | "silver" | "bronze";
      logoUrl?: string;
    };

    const tournamentId = input.tournamentId?.trim();
    const name = input.name?.trim();
    const logoUrl = input.logoUrl?.trim();
    const tier = input.tier ?? "gold";

    if (!tournamentId) {
      return NextResponse.json({ ok: false, error: "Tournament id is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ ok: false, error: "Sponsor name is required" }, { status: 400 });
    }
    if (!logoUrl) {
      return NextResponse.json({ ok: false, error: "Sponsor logo is required" }, { status: 400 });
    }

    const ctx = await requireAdminContext();
    if (!canManageTournament(ctx, tournamentId)) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this tournament" },
        { status: 403 },
      );
    }

    try {
      await db.insert(tournamentSponsors).values({
        tournamentId,
        name,
        tier,
        logoUrl,
        linkType: "website",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("link_type")) throw error;
      await db.insert(tournamentSponsors).values({
        tournamentId,
        name,
        tier,
        logoUrl,
      });
    }

    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
      body: JSON.stringify({
        sessionId: "9848f0",
        location: "api/admin/tournament-sponsors/route.ts",
        message: "sponsor save API ok",
        data: { tournamentId, tier },
        timestamp: Date.now(),
        hypothesisId: "E",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this event sponsor. Please try again.";
    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
      body: JSON.stringify({
        sessionId: "9848f0",
        location: "api/admin/tournament-sponsors/route.ts:catch",
        message: "sponsor save API threw",
        data: { message },
        timestamp: Date.now(),
        hypothesisId: "E",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
    console.error("[tournament-sponsors-api]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
