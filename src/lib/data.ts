import { hasDatabase } from "@/lib/db";
import { calculatePlayerRankings, normalizePlayerKey } from "@/lib/rankings";
import {
  getArchivedRankingSeasons,
  getCurrentRankingSeason,
  getGalleryPhotos,
  getManageableEntries,
  getPartnershipRequestsForUser,
  getPendingEntries,
  getPlayerProfiles,
  getRankingSeasonById,
  getRankingSeasons,
  getResults,
  getResultsForSeason,
  getSponsors,
  getSponsorsByTier,
  getTournamentTypes,
  getTournamentWithCounts,
  getUpcomingWithCounts,
  getLiveWithCounts,
} from "@/lib/db/queries";
import { resolveSponsorLogosForDisplay } from "@/lib/media";
import {
  defaultTournamentTypes,
  getSeedSponsorsByTier,
  seedGallery,
  seedPlayerProfiles,
  seedResults,
  seedSponsors,
  seedTournaments,
} from "@/lib/seed";
import type { PlayerRanking, PlayerRankingSnapshot, RankingSeason, SponsorTier, TournamentResult } from "@/lib/types";

function filterRankingEligibleResults(
  results: TournamentResult[],
  excludedTournamentIds: Set<string>,
  seasonId?: string | null,
) {
  return results.filter((result) => {
    if (excludedTournamentIds.has(result.tournamentId)) return false;
    if (seasonId && result.seasonId !== seasonId) return false;
    return true;
  });
}

function attachRankingPhotos(
  rankings: PlayerRankingSnapshot[],
  profiles: Awaited<ReturnType<typeof fetchPlayerProfiles>>,
): PlayerRanking[] {
  const photoMap = new Map(profiles.map((profile) => [profile.nameKey, profile.photoUrl]));
  return rankings.map((ranking) => ({
    ...ranking,
    photoUrl: photoMap.get(normalizePlayerKey(ranking.name)) ?? null,
  }));
}

export async function fetchTournamentTypes() {
  if (hasDatabase()) return getTournamentTypes();
  return defaultTournamentTypes;
}

export async function fetchUpcomingTournaments() {
  if (hasDatabase()) return getUpcomingWithCounts();
  return seedTournaments.filter((t) => t.status === "upcoming");
}

export async function fetchLiveTournaments() {
  if (hasDatabase()) return getLiveWithCounts();
  return seedTournaments.filter(
    (t) => t.status === "group_stage" || t.status === "knockout_stage",
  );
}

export async function fetchAllTournaments() {
  if (hasDatabase()) return getTournamentWithCounts();
  return seedTournaments;
}

export async function fetchSponsors() {
  if (hasDatabase()) return resolveSponsorLogosForDisplay(await getSponsors());
  return seedSponsors;
}

export async function fetchSponsorsByTier(tier: SponsorTier) {
  if (hasDatabase()) return resolveSponsorLogosForDisplay(await getSponsorsByTier(tier));
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

export async function fetchTournamentIdsWithResults() {
  if (hasDatabase()) {
    const { getTournamentIdsWithResults } = await import("@/lib/db/queries");
    return getTournamentIdsWithResults();
  }
  return seedResults.map((result) => result.tournamentId);
}

export async function fetchPlayerProfiles() {
  if (hasDatabase()) return getPlayerProfiles();
  return seedPlayerProfiles;
}

export async function fetchCurrentRankingSeason(): Promise<RankingSeason | null> {
  if (!hasDatabase()) return null;
  const season = await getCurrentRankingSeason();
  if (!season) return null;
  return {
    id: season.id,
    name: season.name,
    startedAt: season.startedAt,
    endedAt: season.endedAt,
    rankings: season.rankings,
  };
}

export async function fetchRankingSeasonsForDisplay(): Promise<RankingSeason[]> {
  if (!hasDatabase()) return [];
  const seasons = await getRankingSeasons();
  return seasons.map((season) => ({
    id: season.id,
    name: season.name,
    startedAt: season.startedAt,
    endedAt: season.endedAt,
    rankings: season.rankings,
  }));
}

export async function fetchArchivedRankingSeasons(): Promise<RankingSeason[]> {
  if (!hasDatabase()) return [];
  const seasons = await getArchivedRankingSeasons();
  return seasons.map((season) => ({
    id: season.id,
    name: season.name,
    startedAt: season.startedAt,
    endedAt: season.endedAt,
    rankings: season.rankings,
  }));
}

export async function fetchTopRankings(limit: number | null = 12) {
  const [results, tournaments, profiles] = await Promise.all([
    fetchResults(),
    fetchAllTournaments(),
    fetchPlayerProfiles(),
  ]);
  const excludedTournamentIds = new Set(
    tournaments.filter((t) => !t.countsTowardRankings).map((t) => t.id),
  );

  if (hasDatabase()) {
    const currentSeason = await getCurrentRankingSeason();
    const rankingResults = filterRankingEligibleResults(
      results,
      excludedTournamentIds,
      currentSeason?.id,
    );
    return attachRankingPhotos(calculatePlayerRankings(rankingResults, limit), profiles);
  }

  const rankingResults = filterRankingEligibleResults(results, excludedTournamentIds);
  return attachRankingPhotos(calculatePlayerRankings(rankingResults, limit), profiles);
}

export async function fetchSeasonRankings(seasonId: string): Promise<{
  season: RankingSeason | null;
  rankings: PlayerRanking[];
  isCurrent: boolean;
}> {
  if (!hasDatabase()) {
    return { season: null, rankings: [], isCurrent: false };
  }

  const [season, profiles, tournaments] = await Promise.all([
    getRankingSeasonById(seasonId),
    fetchPlayerProfiles(),
    fetchAllTournaments(),
  ]);

  if (!season) {
    return { season: null, rankings: [], isCurrent: false };
  }

  const mappedSeason: RankingSeason = {
    id: season.id,
    name: season.name,
    startedAt: season.startedAt,
    endedAt: season.endedAt,
    rankings: season.rankings,
  };

  const isCurrent = season.endedAt === null;

  if (!isCurrent && season.rankings) {
    return {
      season: mappedSeason,
      rankings: attachRankingPhotos(season.rankings, profiles),
      isCurrent: false,
    };
  }

  const excludedTournamentIds = new Set(
    tournaments.filter((t) => !t.countsTowardRankings).map((t) => t.id),
  );
  const seasonResults = await getResultsForSeason(seasonId);
  const rankingResults = filterRankingEligibleResults(
    seasonResults,
    excludedTournamentIds,
    seasonId,
  );
  const limit = isCurrent ? 12 : null;

  return {
    season: mappedSeason,
    rankings: attachRankingPhotos(
      calculatePlayerRankings(rankingResults, isCurrent ? limit : null),
      profiles,
    ),
    isCurrent,
  };
}

export async function fetchManageableEntries() {
  if (hasDatabase()) return getManageableEntries();
  return [];
}

export async function fetchPendingEntries() {
  if (hasDatabase()) return getPendingEntries();
  return [];
}

export async function fetchActiveRegistrations(email: string, userId?: string) {
  if (hasDatabase()) {
    const { getActiveRegistrationsForUser } = await import("@/lib/db/queries");
    return getActiveRegistrationsForUser(email, userId);
  }
  return [];
}

export async function fetchPartnershipRequests(email: string, userId?: string) {
  if (hasDatabase()) return getPartnershipRequestsForUser(email, userId);
  return [];
}
