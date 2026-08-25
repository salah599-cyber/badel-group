import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgTable } from "drizzle-orm/pg-core";
import fs from "fs";
import path from "path";
import {
  entries,
  galleryPhotos,
  groupMatches,
  groups,
  knockoutMatches,
  notifications,
  rankingSeasons,
  results,
  sponsors,
  matchLineups,
  tournamentPartners,
  tournamentSponsors,
  tournamentTeams,
  tournaments,
  userMembershipNumbers,
} from "../src/lib/db/schema";

function loadEnvFile(filename: string) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function getCount(db: ReturnType<typeof drizzle>, table: PgTable) {
  const [{ value }] = await db.select({ value: count() }).from(table);
  return Number(value);
}

async function logCounts(db: ReturnType<typeof drizzle>, label: string) {
  const [
    resultsCount,
    rankingSeasonsCount,
    groupMatchesCount,
    knockoutMatchesCount,
    groupsCount,
    tournamentTeamsCount,
    entriesCount,
    notificationsCount,
    tournamentsCount,
    galleryPhotosCount,
    sponsorsCount,
    membershipNumbersCount,
  ] = await Promise.all([
    getCount(db, results),
    getCount(db, rankingSeasons),
    getCount(db, groupMatches),
    getCount(db, knockoutMatches),
    getCount(db, groups),
    getCount(db, tournamentTeams),
    getCount(db, entries),
    getCount(db, notifications),
    getCount(db, tournaments),
    getCount(db, galleryPhotos),
    getCount(db, sponsors),
    getCount(db, userMembershipNumbers),
  ]);

  console.log(`\n${label}`);
  console.log("  Competition data:");
  console.log(`    tournament_results: ${resultsCount}`);
  console.log(`    ranking_seasons:   ${rankingSeasonsCount}`);
  console.log(`    group_matches:     ${groupMatchesCount}`);
  console.log(`    knockout_matches:  ${knockoutMatchesCount}`);
  console.log(`    groups:            ${groupsCount}`);
  console.log(`    tournament_teams:  ${tournamentTeamsCount}`);
  console.log(`    entries:           ${entriesCount}`);
  console.log(`    notifications:     ${notificationsCount}`);
  console.log(`    tournaments:       ${tournamentsCount} (kept, reset to upcoming)`);
  console.log("  Preserved data:");
  console.log(`    gallery_photos:    ${galleryPhotosCount}`);
  console.log(`    sponsors:          ${sponsorsCount}`);
  console.log(`    membership_numbers:${membershipNumbersCount}`);
}

async function resetCompetition() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("localhost:5432/ci")) {
    console.error("DATABASE_URL is required (set in .env.local)");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  console.log("Resetting competition data (rankings, games, live, tournament results, entries)...");
  console.log("Keeping: gallery, sponsors, members, tournament listings.");

  await logCounts(db, "Before reset:");

  console.log("\nDeleting in FK-safe order...");

  await db.delete(results);
  console.log("  Deleted tournament results");

  await db.delete(matchLineups);
  console.log("  Deleted match_lineups");

  await db.delete(groupMatches);
  console.log("  Deleted group_matches");

  await db.delete(knockoutMatches);
  console.log("  Deleted knockout_matches");

  await db.delete(groups);
  console.log("  Deleted groups");

  await db.delete(tournamentTeams);
  console.log("  Deleted tournament_teams");

  await db.delete(tournamentPartners);
  console.log("  Deleted tournament_partners");

  await db.delete(tournamentSponsors);
  console.log("  Deleted tournament_sponsors");

  await db.delete(entries);
  console.log("  Deleted entries");

  await db.delete(rankingSeasons);
  console.log("  Deleted ranking_seasons");

  await db.delete(notifications);
  console.log("  Deleted notifications");

  const [newSeason] = await db
    .insert(rankingSeasons)
    .values({ name: "Current Season" })
    .returning();
  console.log(`  Created ranking season: ${newSeason.name} (${newSeason.id})`);

  const updatedTournaments = await db
    .update(tournaments)
    .set({
      status: "upcoming",
      championTeamId: null,
      groupDrawSeed: null,
    })
    .returning({ id: tournaments.id });
  console.log(`  Reset ${updatedTournaments.length} tournament(s) to upcoming`);

  await logCounts(db, "After reset:");

  console.log("\nCompetition reset complete!");
}

resetCompetition().catch((err) => {
  console.error(err);
  process.exit(1);
});
