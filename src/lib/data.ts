import { hasDatabase } from "@/lib/db";
import {
  getGalleryPhotos,
  getPendingEntries,
  getResults,
  getSponsors,
  getSponsorsByTier,
  getUpcomingWithCounts,
} from "@/lib/db/queries";
import {
  getSeedSponsorsByTier,
  seedGallery,
  seedResults,
  seedSponsors,
  seedTournaments,
} from "@/lib/seed";
import type { SponsorTier } from "@/lib/types";

export async function fetchUpcomingTournaments() {
  if (hasDatabase()) return getUpcomingWithCounts();
  return seedTournaments.filter((t) => t.status === "upcoming");
}

export async function fetchSponsors() {
  if (hasDatabase()) return getSponsors();
  return seedSponsors;
}

export async function fetchSponsorsByTier(tier: SponsorTier) {
  if (hasDatabase()) return getSponsorsByTier(tier);
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

export async function fetchPendingEntries() {
  if (hasDatabase()) return getPendingEntries();
  return [];
}
