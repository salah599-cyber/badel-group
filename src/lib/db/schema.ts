import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "upcoming",
  "registration_closed",
  "group_stage",
  "knockout_stage",
  "completed",
]);
export const matchFormatEnum = pgEnum("match_format", [
  "best_of_1",
  "best_of_3_full",
  "best_of_3_super_tiebreak",
]);
export const knockoutRoundEnum = pgEnum("knockout_round", [
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "final",
  "third_place",
]);
export const matchStatusEnum = pgEnum("match_status", ["scheduled", "completed"]);
export const matchOutcomeEnum = pgEnum("match_outcome", ["played", "walkover"]);
export const entryStatusEnum = pgEnum("entry_status", [
  "pending",
  "approved",
  "rejected",
  "waitlisted",
]);
export const signupModeEnum = pgEnum("signup_mode", ["solo", "with_partner"]);
export const partnershipStatusEnum = pgEnum("partnership_status", [
  "not_applicable",
  "pending_partner",
  "pending_admin",
  "approved",
  "rejected",
]);
export const playingSideEnum = pgEnum("playing_side", ["right", "left", "any"]);
export const pairingModeEnum = pgEnum("pairing_mode", ["manual", "random"]);
export const sponsorTierEnum = pgEnum("sponsor_tier", [
  "platinum",
  "gold",
  "silver",
  "bronze",
]);
export const sponsorLinkTypeEnum = pgEnum("sponsor_link_type", [
  "website",
  "instagram",
]);

export const tournamentTypes = pgTable("tournament_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  requiresPartner: boolean("requires_partner").notNull().default(false),
  pairingMode: pairingModeEnum("pairing_mode").notNull().default("manual"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MatchSet = {
  a: number;
  b: number;
  tiebreakA?: number;
  tiebreakB?: number;
  isSuperTiebreak?: boolean;
};

export type KnockoutSource =
  | { type: "group"; groupLabel: string; rank: number }
  | { type: "winner"; matchId: string }
  | { type: "loser"; matchId: string }
  | { type: "bye" };

export const tournaments = pgTable("tournaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time"),
  location: text("location").notNull(),
  tournamentTypeId: uuid("tournament_type_id")
    .notNull()
    .references(() => tournamentTypes.id),
  status: tournamentStatusEnum("status").notNull().default("upcoming"),
  description: text("description").notNull(),
  maxPlayers: integer("max_players").notNull().default(32),
  countsTowardRankings: boolean("counts_toward_rankings").notNull().default(true),
  matchFormat: matchFormatEnum("match_format").notNull().default("best_of_1"),
  superTiebreakPoints: integer("super_tiebreak_points").notNull().default(10),
  teamsPerGroup: integer("teams_per_group").notNull().default(4),
  advancePerGroup: integer("advance_per_group"),
  knockoutStartRound: knockoutRoundEnum("knockout_start_round"),
  thirdPlacePlayoff: boolean("third_place_playoff").notNull().default(false),
  pointsWin: integer("points_win").notNull().default(1),
  pointsLoss: integer("points_loss").notNull().default(0),
  groupDrawSeed: integer("group_draw_seed"),
  championTeamId: uuid("champion_team_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentTeams = pgTable("tournament_teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  entryIds: jsonb("entry_ids").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  teamIds: jsonb("team_ids").$type<string[]>().notNull().default([]),
  manualTiebreakOrder: jsonb("manual_tiebreak_order").$type<string[] | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMatches = pgTable("group_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  teamAId: uuid("team_a_id")
    .notNull()
    .references(() => tournamentTeams.id, { onDelete: "cascade" }),
  teamBId: uuid("team_b_id")
    .notNull()
    .references(() => tournamentTeams.id, { onDelete: "cascade" }),
  sets: jsonb("sets").$type<MatchSet[]>().notNull().default([]),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  winnerId: uuid("winner_id").references(() => tournamentTeams.id, { onDelete: "set null" }),
  outcome: matchOutcomeEnum("outcome").notNull().default("played"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knockoutMatches = pgTable("knockout_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  round: knockoutRoundEnum("round").notNull(),
  slot: integer("slot").notNull(),
  teamAId: uuid("team_a_id").references(() => tournamentTeams.id, { onDelete: "set null" }),
  teamBId: uuid("team_b_id").references(() => tournamentTeams.id, { onDelete: "set null" }),
  sourceA: jsonb("source_a").$type<KnockoutSource | null>(),
  sourceB: jsonb("source_b").$type<KnockoutSource | null>(),
  sets: jsonb("sets").$type<MatchSet[]>().notNull().default([]),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  winnerId: uuid("winner_id").references(() => tournamentTeams.id, { onDelete: "set null" }),
  outcome: matchOutcomeEnum("outcome").notNull().default("played"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  signupMode: signupModeEnum("signup_mode").notNull().default("solo"),
  partnerName: text("partner_name"),
  partnerEmail: text("partner_email"),
  partnerUserId: text("partner_user_id"),
  partnerEntryId: uuid("partner_entry_id").references((): AnyPgColumn => entries.id, {
    onDelete: "set null",
  }),
  pairedByAdminId: text("paired_by_admin_id"),
  pairedByAdminName: text("paired_by_admin_name"),
  partnershipStatus: partnershipStatusEnum("partnership_status")
    .notNull()
    .default("not_applicable"),
  playingSide: playingSideEnum("playing_side").notNull().default("any"),
  skillLevel: text("skill_level").notNull().default("intermediate"),
  notes: text("notes"),
  status: entryStatusEnum("status").notNull().default("pending"),
  isGuest: boolean("is_guest").notNull().default(false),
  addedByAdminId: text("added_by_admin_id"),
  addedByAdminName: text("added_by_admin_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tier: sponsorTierEnum("tier").notNull(),
  logoUrl: text("logo_url").notNull(),
  website: text("website"),
  linkType: sponsorLinkTypeEnum("link_type").notNull().default("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const galleryPhotos = pgTable("gallery_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id").references(() => tournaments.id, {
    onDelete: "set null",
  }),
  tournamentName: text("tournament_name").notNull(),
  tournamentDate: text("tournament_date"),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SeasonRankingSnapshot = {
  rank: number;
  name: string;
  points: number;
  placements: number;
};

export const rankingSeasons = pgTable("ranking_seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  rankings: jsonb("rankings").$type<SeasonRankingSnapshot[] | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const results = pgTable("results", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").references(() => rankingSeasons.id),
  tournamentName: text("tournament_name").notNull(),
  date: text("date").notNull(),
  winners: jsonb("winners").$type<{ place: string; names: string }[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerProfiles = pgTable("player_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  nameKey: text("name_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userMembershipNumbers = pgTable("user_membership_numbers", {
  userId: text("user_id").primaryKey(),
  membershipNumber: text("membership_number").notNull().unique(),
});
