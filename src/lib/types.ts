export type SponsorTier = "platinum" | "gold" | "silver" | "bronze";
export type SponsorLinkType = "website" | "instagram";
export type PairingMode = "manual" | "random";
export type SignupMode = "solo" | "with_partner";
export type PartnershipStatus =
  | "not_applicable"
  | "pending_partner"
  | "pending_admin"
  | "approved"
  | "rejected";
export type PlayingSide = "right" | "left" | "any";

export interface TournamentType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  requiresPartner: boolean;
  pairingMode: PairingMode;
  sortOrder: number;
}

export type TournamentStatus =
  | "upcoming"
  | "registration_closed"
  | "group_stage"
  | "knockout_stage"
  | "completed";

export type MatchFormat =
  | "best_of_1"
  | "best_of_3_full"
  | "best_of_3_super_tiebreak";

export type KnockoutRound =
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "third_place";

export interface MatchSet {
  a: number;
  b: number;
  tiebreakA?: number;
  tiebreakB?: number;
  isSuperTiebreak?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  startTime?: string | null;
  location: string;
  tournamentTypeId: string;
  typeName: string;
  typeSlug: string;
  requiresPartner: boolean;
  pairingMode: PairingMode;
  status: TournamentStatus;
  description: string;
  maxPlayers: number;
  countsTowardRankings: boolean;
  matchFormat: MatchFormat;
  superTiebreakPoints: number;
  teamsPerGroup: number;
  advancePerGroup?: number | null;
  knockoutStartRound?: KnockoutRound | null;
  thirdPlacePlayoff: boolean;
  pointsWin: number;
  pointsLoss: number;
  groupDrawSeed?: number | null;
  championTeamId?: string | null;
  registeredCount: number;
  waitlistCount: number;
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  label: string;
  entryIds: string[];
}

export interface TournamentGroup {
  id: string;
  tournamentId: string;
  label: string;
  teamIds: string[];
  manualTiebreakOrder?: string[] | null;
}

export interface GroupMatch {
  id: string;
  groupId: string;
  teamAId: string;
  teamBId: string;
  sets: MatchSet[];
  status: "scheduled" | "completed";
  winnerId?: string | null;
  outcome: "played" | "walkover";
}

export interface KnockoutMatch {
  id: string;
  tournamentId: string;
  round: KnockoutRound;
  slot: number;
  teamAId?: string | null;
  teamBId?: string | null;
  sourceA?: { type: string; groupLabel?: string; rank?: number; matchId?: string } | null;
  sourceB?: { type: string; groupLabel?: string; rank?: number; matchId?: string } | null;
  sets: MatchSet[];
  status: "scheduled" | "completed";
  winnerId?: string | null;
  outcome: "played" | "walkover";
}

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string;
  website?: string | null;
  linkType?: SponsorLinkType;
}

export interface GalleryPhoto {
  id: string;
  tournamentId: string | null;
  tournamentName: string;
  tournamentDate?: string | null;
  imageUrl: string;
  caption: string;
}

export interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentName: string;
  date: string;
  winners: { place: string; names: string }[];
}

export interface PlayerRanking {
  rank: number;
  name: string;
  points: number;
  placements: number;
  photoUrl?: string | null;
}

export interface PlayerProfile {
  id: string;
  nameKey: string;
  displayName: string;
  photoUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Entry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  userId?: string | null;
  signupMode?: SignupMode;
  partnerName?: string | null;
  partnerEmail?: string | null;
  partnerUserId?: string | null;
  partnerEntryId?: string | null;
  partnerPlayerName?: string | null;
  pairedByAdminId?: string | null;
  pairedByAdminName?: string | null;
  partnershipStatus?: PartnershipStatus;
  playingSide?: PlayingSide;
  skillLevel?: string;
  status: string;
  isGuest?: boolean;
  addedByAdminId?: string | null;
  addedByAdminName?: string | null;
  tournamentId?: string;
  tournamentName: string;
  pairingMode?: PairingMode;
  createdAt?: Date;
}

export const tierOrder: SponsorTier[] = ["platinum", "gold", "silver", "bronze"];

export const tierLabels: Record<SponsorTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};
