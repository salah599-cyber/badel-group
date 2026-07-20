import type {
  GalleryPhoto,
  PlayerProfile,
  Sponsor,
  SponsorTier,
  Tournament,
  TournamentResult,
  TournamentType,
} from "./types";

export const defaultTournamentTypes: TournamentType[] = [
  {
    id: "type-doubles",
    name: "Doubles",
    slug: "doubles",
    description: "Standard doubles — sign up solo, admin assigns partners",
    requiresPartner: false,
    pairingMode: "manual",
    sortOrder: 1,
  },
  {
    id: "type-mixed-doubles",
    name: "Mixed Doubles",
    slug: "mixed-doubles",
    description: "Mixed-gender doubles — sign up solo, admin assigns partners",
    requiresPartner: false,
    pairingMode: "manual",
    sortOrder: 2,
  },
  {
    id: "type-random-teams",
    name: "Random Team Selection",
    slug: "random-teams",
    description: "Sign up solo — teams are assigned randomly on the day",
    requiresPartner: false,
    pairingMode: "random",
    sortOrder: 3,
  },
];

export const seedTournaments: Tournament[] = [
  {
    id: "t1",
    name: "Badel Spring Open 2026",
    date: "2026-04-12",
    location: "Dubai Sports City",
    tournamentTypeId: "type-doubles",
    typeName: "Doubles",
    typeSlug: "doubles",
    requiresPartner: false,
    pairingMode: "manual",
    status: "upcoming",
    description:
      "Our flagship doubles tournament. Open to all skill levels — sign up as a pair and compete for the Badel Group trophy.",
    maxPlayers: 32,
    registeredCount: 0,
    waitlistCount: 0,
  },
  {
    id: "t2",
    name: "Community Cup",
    date: "2026-05-03",
    location: "Abu Dhabi Padel Club",
    tournamentTypeId: "type-mixed-doubles",
    typeName: "Mixed Doubles",
    typeSlug: "mixed-doubles",
    requiresPartner: false,
    pairingMode: "manual",
    status: "upcoming",
    description:
      "A friendly mixed doubles tournament celebrating our growing padel community. Admin approval required after signup.",
    maxPlayers: 16,
    registeredCount: 0,
    waitlistCount: 0,
  },
];

export const seedSponsors: Sponsor[] = [
  {
    id: "1",
    name: "Padel Pro UAE",
    tier: "platinum",
    logoUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=200&h=100&fit=crop",
    website: "#",
  },
  {
    id: "2",
    name: "SportZone",
    tier: "gold",
    logoUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&h=100&fit=crop",
    website: "#",
  },
  {
    id: "3",
    name: "Elite Courts",
    tier: "gold",
    logoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=100&fit=crop",
    website: "#",
  },
  {
    id: "4",
    name: "Racket House",
    tier: "silver",
    logoUrl: "https://images.unsplash.com/photo-1626224583764-f87db74ac163?w=200&h=100&fit=crop",
    website: "#",
  },
  {
    id: "5",
    name: "Court Masters",
    tier: "bronze",
    logoUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed4770de?w=200&h=100&fit=crop",
    website: "#",
  },
];

export const seedGallery: GalleryPhoto[] = [
  {
    id: "g1",
    tournamentId: null,
    tournamentName: "Winter Classic 2025",
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&h=400&fit=crop",
    caption: "Final match action",
  },
  {
    id: "g2",
    tournamentId: null,
    tournamentName: "Winter Classic 2025",
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db74ac163?w=600&h=400&fit=crop",
    caption: "Winners celebration",
  },
];

export const seedResults: TournamentResult[] = [
  {
    id: "r1",
    tournamentId: "t-past-1",
    tournamentName: "Winter Classic 2025",
    date: "2025-12-15",
    winners: [
      { place: "1st", names: "Ahmed Hassan & Sara Ali" },
      { place: "2nd", names: "Omar Khan & Fatima Noor" },
      { place: "3rd", names: "Yusuf Malik & Layla Ahmed" },
      { place: "4th", names: "Khalid Rashid & Nadia Farouk" },
      { place: "5th", names: "Tariq Salem & Hana Ibrahim" },
      { place: "6th", names: "Faisal Qureshi & Mona El-Sayed" },
    ],
  },
  {
    id: "r2",
    tournamentId: "t-past-2",
    tournamentName: "Autumn Open 2025",
    date: "2025-10-20",
    winners: [
      { place: "1st", names: "Omar Khan & Layla Ahmed" },
      { place: "2nd", names: "Ahmed Hassan & Nadia Farouk" },
      { place: "3rd", names: "Yusuf Malik & Sara Ali" },
      { place: "4th", names: "Khalid Rashid & Hana Ibrahim" },
    ],
  },
];

export const seedPlayerProfiles: PlayerProfile[] = [
  {
    id: "pp1",
    nameKey: "ahmed hassan",
    displayName: "Ahmed Hassan",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
  },
  {
    id: "pp2",
    nameKey: "omar khan",
    displayName: "Omar Khan",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop",
  },
  {
    id: "pp3",
    nameKey: "sara ali",
    displayName: "Sara Ali",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
  },
];

export function getSeedSponsorsByTier(tier: SponsorTier) {
  return seedSponsors.filter((s) => s.tier === tier);
}
