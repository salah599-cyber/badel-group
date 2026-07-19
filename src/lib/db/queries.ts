import { count, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  entries,
  galleryPhotos,
  results,
  sponsors,
  tournaments,
} from "./schema";
import type { SponsorTier } from "@/lib/types";

export async function getTournaments() {
  if (!db) return [];
  return db.select().from(tournaments).orderBy(desc(tournaments.date));
}

export async function getUpcomingTournaments() {
  if (!db) return [];
  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "upcoming"))
    .orderBy(tournaments.date);
}

export async function getTournamentById(id: string) {
  if (!db) return null;
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTournamentWithCounts() {
  if (!db) return [];
  const all = await getTournaments();
  const counts = await Promise.all(
    all.map(async (t) => {
      const [{ value }] = await db!
        .select({ value: count() })
        .from(entries)
        .where(eq(entries.tournamentId, t.id));
      return { ...t, registeredCount: Number(value) };
    }),
  );
  return counts;
}

export async function getUpcomingWithCounts() {
  const all = await getTournamentWithCounts();
  return all.filter((t) => t.status === "upcoming");
}

export async function getSponsors() {
  if (!db) return [];
  return db.select().from(sponsors).orderBy(sponsors.tier);
}

export async function getSponsorsByTier(tier: SponsorTier) {
  if (!db) return [];
  return db.select().from(sponsors).where(eq(sponsors.tier, tier));
}

export async function getGalleryPhotos() {
  if (!db) return [];
  return db.select().from(galleryPhotos).orderBy(desc(galleryPhotos.createdAt));
}

export async function getResults() {
  if (!db) return [];
  return db.select().from(results).orderBy(desc(results.date));
}

export async function getPendingEntries() {
  if (!db) return [];
  return db
    .select({
      id: entries.id,
      name: entries.name,
      email: entries.email,
      phone: entries.phone,
      partnerName: entries.partnerName,
      skillLevel: entries.skillLevel,
      status: entries.status,
      createdAt: entries.createdAt,
      tournamentName: tournaments.name,
    })
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .where(eq(entries.status, "pending"))
    .orderBy(desc(entries.createdAt));
}

export async function getAllEntries() {
  if (!db) return [];
  return db
    .select({
      id: entries.id,
      name: entries.name,
      email: entries.email,
      status: entries.status,
      tournamentName: tournaments.name,
    })
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .orderBy(desc(entries.createdAt));
}
