import { hasDatabase } from "@/lib/db";
import { calculatePlayerRankings, normalizePlayerKey } from "@/lib/rankings";
import {
  getGalleryPhotos,
  getManageableEntries,
  getPartnershipRequestsForUser,
  getPendingEntries,
  getPlayerProfiles,
  getResults,
  getSponsors,
  getSponsorsByTier,
  getTournamentTypes,
  getTournamentWithCounts,
  getUpcomingWithCounts,
} from "@/lib/db/queries";
import { resolveSponsorLogos } from "@/lib/media";
import {
  defaultTournamentTypes,
  getSeedSponsorsByTier,
  seedGallery,
  seedPlayerProfiles,
  seedResults,
  seedSponsors,
  seedTournaments,
} from "@/lib/seed";
import type { SponsorTier } from "@/lib/types";

export async function fetchTournamentTypes() {
  if (hasDatabase()) return getTournamentTypes();
  return defaultTournamentTypes;
}

export async function fetchUpcomingTournaments() {
  if (hasDatabase()) return getUpcomingWithCounts();
  return seedTournaments.filter((t) => t.status === "upcoming");
}

export async function fetchAllTournaments() {
  if (hasDatabase()) return getTournamentWithCounts();
  return seedTournaments;
}

export async function fetchSponsors() {
  if (hasDatabase()) return resolveSponsorLogos(await getSponsors());
  return seedSponsors;
}

export async function fetchSponsorsByTier(tier: SponsorTier) {
  if (hasDatabase()) return resolveSponsorLogos(await getSponsorsByTier(tier));
  return getSeedSponsorsByTier(tier);
}

export async function fetchGalleryPhotos() {
  if (hasDatabase()) return getGalleryPhotos();
  return seedGallery;
}

export async function fetchResults() {
  if (hasDatabase()) return getResults();
  return seedResults;
}

export async function fetchPlayerProfiles() {
  if (hasDatabase()) return getPlayerProfiles();
  return seedPlayerProfiles;
}

export async function fetchTopRankings(limit = 12) {
  const [results, profiles] = await Promise.all([fetchResults(), fetchPlayerProfiles()]);
  const photoMap = new Map(profiles.map((p) => [p.nameKey, p.photoUrl]));

  return calculatePlayerRankings(results, limit).map((ranking) => ({
    ...ranking,
    photoUrl: photoMap.get(normalizePlayerKey(ranking.name)) ?? null,
  }));
}

export async function fetchManageableEntries() {
  if (hasDatabase()) return getManageableEntries();
  return [];
}

export async function fetchPendingEntries() {
  if (hasDatabase()) return getPendingEntries();
  return [];
}

export async function fetchPartnershipRequests(email: string) {
  if (hasDatabase()) return getPartnershipRequestsForUser(email);
  return [];
}
