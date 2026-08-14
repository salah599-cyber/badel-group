import { and, count, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  entries,
  galleryPhotos,
  playerProfiles,
  results,
  sponsors,
  tournamentTypes,
  tournaments,
} from "./schema";
import { querySponsors } from "./sponsor-db";
import { countConfirmedTeams } from "@/lib/tournament-teams";
import type { SponsorTier } from "@/lib/types";

function tournamentSelect() {
  return db!.select({
    id: tournaments.id,
    name: tournaments.name,
    date: tournaments.date,
    startTime: tournaments.startTime,
    location: tournaments.location,
    status: tournaments.status,
    description: tournaments.description,
    maxPlayers: tournaments.maxPlayers,
    countsTowardRankings: tournaments.countsTowardRankings,
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

export async function getEntriesForTournament(tournamentId: string) {
  if (!db) return [];
  const partnerEntry = alias(entries, "partner_entry");

  return db
    .select(entrySelect())
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .leftJoin(partnerEntry, eq(entries.partnerEntryId, partnerEntry.id))
    .where(eq(entries.tournamentId, tournamentId));
}

export async function getEntriesForTournaments(tournamentIds: string[]) {
  if (!tournamentIds.length) return [];
  const chunks = await Promise.all(tournamentIds.map((id) => getEntriesForTournament(id)));
  return chunks.flat();
}

export async function countConfirmedEntries(tournamentId: string) {
  if (!db) return 0;

  const rows = await getEntriesForTournament(tournamentId);
  return countConfirmedTeams(rows);
}

export async function countWaitlistedEntries(tournamentId: string) {
  if (!db) return 0;

  const [{ value }] = await db
    .select({ value: count() })
    .from(entries)
    .where(and(eq(entries.tournamentId, tournamentId), eq(entries.status, "waitlisted")));

  return Number(value);
}

export async function getTournamentCapacity(tournamentId: string) {
  if (!db) return null;

  const [tournament] = await db
    .select({ maxPlayers: tournaments.maxPlayers })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return null;

  const [withCounts] = await attachTournamentCounts([{ id: tournamentId, maxPlayers: tournament.maxPlayers }]);
  const confirmedCount = withCounts?.registeredCount ?? 0;

  return {
    maxPlayers: tournament.maxPlayers,
    confirmedCount,
    spotsLeft: Math.max(0, tournament.maxPlayers - confirmedCount),
    isFull: confirmedCount >= tournament.maxPlayers,
  };
}

async function attachTournamentCounts<T extends { id: string }>(
  tournamentList: T[],
): Promise<(T & { registeredCount: number; waitlistCount: number })[]> {
  if (!db || tournamentList.length === 0) {
    return tournamentList.map((tournament) => ({
      ...tournament,
      registeredCount: 0,
      waitlistCount: 0,
    }));
  }

  const ids = tournamentList.map((tournament) => tournament.id);
  const partnerEntry = alias(entries, "partner_entry");

  const entryRows = await db
    .select(entrySelect())
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .leftJoin(partnerEntry, eq(entries.partnerEntryId, partnerEntry.id))
    .where(inArray(entries.tournamentId, ids));

  const entriesByTournament = new Map<string, typeof entryRows>();
  for (const row of entryRows) {
    const tournamentEntries = entriesByTournament.get(row.tournamentId) ?? [];
    tournamentEntries.push(row);
    entriesByTournament.set(row.tournamentId, tournamentEntries);
  }

  const waitlistRows = await db
    .select({
      tournamentId: entries.tournamentId,
      value: count(),
    })
    .from(entries)
    .where(and(inArray(entries.tournamentId, ids), eq(entries.status, "waitlisted")))
    .groupBy(entries.tournamentId);

  const waitlistByTournament = new Map(
    waitlistRows.map((row) => [row.tournamentId, Number(row.value)]),
  );

  return tournamentList.map((tournament) => ({
    ...tournament,
    registeredCount: countConfirmedTeams(entriesByTournament.get(tournament.id) ?? []),
    waitlistCount: waitlistByTournament.get(tournament.id) ?? 0,
  }));
}

export async function getTournamentWithCounts() {
  if (!db) return [];
  const all = await getTournaments();
  return attachTournamentCounts(all);
}

export async function getUpcomingWithCounts() {
  if (!db) return [];
  const upcoming = await getUpcomingTournaments();
  return attachTournamentCounts(upcoming);
}

export async function getSponsors() {
  return querySponsors();
}

export async function getSponsorsByTier(tier: SponsorTier) {
  return querySponsors(eq(sponsors.tier, tier));
}

export async function getGalleryPhotos() {
  if (!db) return [];

  const rows = await db
    .select({
      id: galleryPhotos.id,
      tournamentId: galleryPhotos.tournamentId,
      tournamentName: galleryPhotos.tournamentName,
      tournamentDate: galleryPhotos.tournamentDate,
      imageUrl: galleryPhotos.imageUrl,
      caption: galleryPhotos.caption,
      linkedTournamentDate: tournaments.date,
    })
    .from(galleryPhotos)
    .leftJoin(tournaments, eq(galleryPhotos.tournamentId, tournaments.id))
    .orderBy(desc(galleryPhotos.createdAt));

  return rows.map((row) => ({
    id: row.id,
    tournamentId: row.tournamentId,
    tournamentName: row.tournamentName,
    tournamentDate: row.tournamentDate ?? row.linkedTournamentDate ?? null,
    imageUrl: row.imageUrl,
    caption: row.caption,
  }));
}

export async function getResults() {
  if (!db) return [];
  return db.select().from(results).orderBy(desc(results.date));
}

export async function getTournamentIdsWithResults() {
  if (!db) return [];
  const rows = await db.select({ tournamentId: results.tournamentId }).from(results);
  return rows.map((row) => row.tournamentId);
}

export async function getPlayerProfiles() {
  if (!db) return [];
  try {
    return await db.select().from(playerProfiles).orderBy(playerProfiles.displayName);
  } catch (error) {
    console.error("Failed to load player profiles:", error);
    return [];
  }
}

export async function upsertPlayerProfile(data: {
  nameKey: string;
  displayName: string;
  photoUrl: string;
}) {
  if (!db) throw new Error("Database not configured");

  const existing = await db
    .select({ id: playerProfiles.id })
    .from(playerProfiles)
    .where(eq(playerProfiles.nameKey, data.nameKey))
    .limit(1);

  if (existing[0]) {
    await db
      .update(playerProfiles)
      .set({
        displayName: data.displayName,
        photoUrl: data.photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.id, existing[0].id));
    return existing[0].id;
  }

  const [row] = await db
    .insert(playerProfiles)
    .values({
      nameKey: data.nameKey,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
    })
    .returning({ id: playerProfiles.id });

  return row.id;
}

export async function deletePlayerProfile(id: string) {
  if (!db) throw new Error("Database not configured");
  await db.delete(playerProfiles).where(eq(playerProfiles.id, id));
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
    pairedByAdminId: entries.pairedByAdminId,
    pairedByAdminName: entries.pairedByAdminName,
    partnershipStatus: entries.partnershipStatus,
    playingSide: entries.playingSide,
    skillLevel: entries.skillLevel,
    status: entries.status,
    isGuest: entries.isGuest,
    addedByAdminId: entries.addedByAdminId,
    addedByAdminName: entries.addedByAdminName,
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
    .where(and(eq(entries.status, "pending"), eq(tournaments.status, "upcoming")))
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
    .where(and(ne(entries.status, "rejected"), eq(tournaments.status, "upcoming")))
    .orderBy(desc(entries.createdAt));
}

export async function getPartnershipRequestsForUser(email: string, userId?: string) {
  if (!db) return [];
  const normalizedEmail = email.trim().toLowerCase();

  const partnerMatch = userId
    ? or(
        sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`,
        eq(entries.partnerUserId, userId),
      )
    : sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`;

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
        partnerMatch,
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
  const participation = await findTournamentParticipation(tournamentId, email, userId);
  return participation !== null;
}

export type TournamentParticipationRole = "primary" | "partner";

export async function findTournamentParticipation(
  tournamentId: string,
  email: string,
  userId?: string,
) {
  if (!db) return null;
  const normalizedEmail = email.trim().toLowerCase();

  const activeStatusFilter = or(
    eq(entries.status, "pending"),
    eq(entries.status, "approved"),
    eq(entries.status, "waitlisted"),
  );

  const primaryMatch = userId
    ? or(eq(entries.userId, userId), sql`lower(${entries.email}) = ${normalizedEmail}`)
    : sql`lower(${entries.email}) = ${normalizedEmail}`;

  const [primary] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.tournamentId, tournamentId), primaryMatch, activeStatusFilter))
    .limit(1);

  if (primary) {
    return { entryId: primary.id, role: "primary" as const };
  }

  const partnerMatch = userId
    ? or(eq(entries.partnerUserId, userId), sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`)
    : sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`;

  const [partnerRow] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(
        eq(entries.tournamentId, tournamentId),
        partnerMatch,
        activeStatusFilter,
        eq(entries.signupMode, "with_partner"),
      ),
    )
    .limit(1);

  if (partnerRow) {
    return { entryId: partnerRow.id, role: "partner" as const };
  }

  return null;
}

export async function getActiveRegistrationsForUser(email: string, userId?: string) {
  if (!db) return [];
  const normalizedEmail = email.trim().toLowerCase();
  const partnerEntry = alias(entries, "partner_entry");

  const primaryMatch = userId
    ? or(eq(entries.userId, userId), sql`lower(${entries.email}) = ${normalizedEmail}`)
    : sql`lower(${entries.email}) = ${normalizedEmail}`;

  const partnerMatch = userId
    ? or(eq(entries.partnerUserId, userId), sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`)
    : sql`lower(${entries.partnerEmail}) = ${normalizedEmail}`;

  const rows = await db
    .select(entrySelect())
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .innerJoin(tournamentTypes, eq(tournaments.tournamentTypeId, tournamentTypes.id))
    .leftJoin(partnerEntry, eq(entries.partnerEntryId, partnerEntry.id))
    .where(
      and(
        or(
          eq(entries.status, "pending"),
          eq(entries.status, "approved"),
          eq(entries.status, "waitlisted"),
        ),
        or(primaryMatch, and(eq(entries.signupMode, "with_partner"), partnerMatch)),
      ),
    )
    .orderBy(desc(entries.createdAt));

  const deduped = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    deduped.set(row.id, row);
  }

  return [...deduped.values()];
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
