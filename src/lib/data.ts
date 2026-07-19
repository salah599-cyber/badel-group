import { hasDatabase } from "@/lib/db";
import {
  getGalleryPhotos,
  getManageableEntries,
  getPendingEntries,
  getResults,
  getSponsors,
  getSponsorsByTier,
  getTournamentTypes,
  getUpcomingWithCounts,
} from "@/lib/db/queries";
import { resolveSponsorLogos } from "@/lib/media";
import {
  defaultTournamentTypes,
  getSeedSponsorsByTier,
  seedGallery,
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

export async function fetchManageableEntries() {
  if (hasDatabase()) return getManageableEntries();
  return [];
}

export async function fetchPendingEntries() {
  if (hasDatabase()) return getPendingEntries();
  return [];
}
