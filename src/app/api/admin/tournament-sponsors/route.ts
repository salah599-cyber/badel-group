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

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this event sponsor. Please try again.";
    console.error("[tournament-sponsors-api]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
