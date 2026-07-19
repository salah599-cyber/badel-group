export type SponsorTier = "platinum" | "gold" | "silver" | "bronze";
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

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  tournamentTypeId: string;
  typeName: string;
  typeSlug: string;
  requiresPartner: boolean;
  pairingMode: PairingMode;
  status: "upcoming" | "completed";
  description: string;
  maxPlayers: number;
  registeredCount: number;
  waitlistCount: number;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string;
  website?: string | null;
}

export interface GalleryPhoto {
  id: string;
  tournamentId: string | null;
  tournamentName: string;
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
  partnershipStatus?: PartnershipStatus;
  playingSide?: PlayingSide;
  skillLevel?: string;
  status: string;
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
