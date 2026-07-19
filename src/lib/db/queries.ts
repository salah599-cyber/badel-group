import { and, count, desc, eq, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  entries,
  galleryPhotos,
  results,
  sponsors,
  tournamentTypes,
  tournaments,
} from "./schema";
import type { SponsorTier } from "@/lib/types";

function tournamentSelect() {
  return db!.select({
    id: tournaments.id,
    name: tournaments.name,
    date: tournaments.date,
    location: tournaments.location,
    status: tournaments.status,
    description: tournaments.description,
    maxPlayers: tournaments.maxPlayers,
    tournamentTypeId: tournaments.tournamentTypeId,
    typeName: tournamentTypes.name,
    typeSlug: tournamentTypes.slug,
    requiresPartner: tournamentTypes.requiresPartner,
    pairingMode: tournamentTypes.pairingMode,
  })
    .from(tournaments)
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id));
}

export async function getTournamentTypes() {
  if (!db) return [];
  return db
    .select()
    .from(tournamentTypes)
    .orderBy(tournamentTypes.sortOrder, tournamentTypes.name);
}

export async function getTournamentTypeById(id: string) {
  if (!db) return null;
  const rows = await db
    .select()
    .from(tournamentTypes)
    .where(eq(tournamentTypes.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTournaments() {
  if (!db) return [];
  return tournamentSelect().orderBy(desc(tournaments.date));
}

export async function getUpcomingTournaments() {
  if (!db) return [];
  return tournamentSelect()
    .where(eq(tournaments.status, "upcoming"))
    .orderBy(tournaments.date);
}

export async function getTournamentById(id: string) {
  if (!db) return null;
  const rows = await tournamentSelect().where(eq(tournaments.id, id)).limit(1);
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

function entrySelect() {
  const partnerEntry = alias(entries, "partner_entry");

  return {
    id: entries.id,
    userId: entries.userId,
    name: entries.name,
    email: entries.email,
    phone: entries.phone,
    signupMode: entries.signupMode,
    partnerName: entries.partnerName,
    partnerEmail: entries.partnerEmail,
    partnerUserId: entries.partnerUserId,
    partnerEntryId: entries.partnerEntryId,
    partnerPlayerName: partnerEntry.name,
    partnershipStatus: entries.partnershipStatus,
    skillLevel: entries.skillLevel,
    status: entries.status,
    createdAt: entries.createdAt,
    tournamentId: entries.tournamentId,
    tournamentName: tournaments.name,
    pairingMode: tournamentTypes.pairingMode,
  };
}

export async function getPendingEntries() {
  if (!db) return [];
  const partnerEntry = alias(entries, "partner_entry");

  return db
    .select(entrySelect())
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .leftJoin(partnerEntry, eq(entries.partnerEntryId, partnerEntry.id))
    .where(eq(entries.status, "pending"))
    .orderBy(desc(entries.createdAt));
}

export async function getManageableEntries() {
  if (!db) return [];
  const partnerEntry = alias(entries, "partner_entry");

  return db
    .select(entrySelect())
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .leftJoin(partnerEntry, eq(entries.partnerEntryId, partnerEntry.id))
    .where(ne(entries.status, "rejected"))
    .orderBy(desc(entries.createdAt));
}

export async function getPartnershipRequestsForUser(email: string) {
  if (!db) return [];
  const normalizedEmail = email.trim().toLowerCase();

  return db
    .select({
      id: entries.id,
      name: entries.name,
      email: entries.email,
      partnerName: entries.partnerName,
      partnerEmail: entries.partnerEmail,
      partnershipStatus: entries.partnershipStatus,
      tournamentId: entries.tournamentId,
      tournamentName: tournaments.name,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .where(
      and(
        sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`,
        eq(entries.partnershipStatus, "pending_partner"),
      ),
    )
    .orderBy(desc(entries.createdAt));
}

export async function getEntryById(entryId: string) {
  if (!db) return null;
  const partnerEntry = alias(entries, "partner_entry");

  const rows = await db
    .select(entrySelect())
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .leftJoin(partnerEntry, eq(entries.partnerEntryId, partnerEntry.id))
    .where(eq(entries.id, entryId))
    .limit(1);

  return rows[0] ?? null;
}

export async function hasExistingEntry(tournamentId: string, email: string, userId?: string) {
  if (!db) return false;
  const normalizedEmail = email.trim().toLowerCase();

  const identityMatch = userId
    ? or(eq(entries.userId, userId), sql`lower(${entries.email}) = ${normalizedEmail}`)
    : sql`lower(${entries.email}) = ${normalizedEmail}`;

  const rows = await db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(
        eq(entries.tournamentId, tournamentId),
        identityMatch,
        ne(entries.status, "rejected"),
      ),
    )
    .limit(1);

  return rows.length > 0;
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

export async function countTournamentsByType(typeId: string) {
  if (!db) return 0;
  const [{ value }] = await db
    .select({ value: count() })
    .from(tournaments)
    .where(eq(tournaments.tournamentTypeId, typeId));
  return Number(value);
}
