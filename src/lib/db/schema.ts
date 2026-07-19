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

export const tournamentStatusEnum = pgEnum("tournament_status", ["upcoming", "completed"]);
export const entryStatusEnum = pgEnum("entry_status", ["pending", "approved", "rejected"]);
export const signupModeEnum = pgEnum("signup_mode", ["solo", "with_partner"]);
export const partnershipStatusEnum = pgEnum("partnership_status", [
  "not_applicable",
  "pending_partner",
  "pending_admin",
  "approved",
  "rejected",
]);
export const pairingModeEnum = pgEnum("pairing_mode", ["manual", "random"]);
export const sponsorTierEnum = pgEnum("sponsor_tier", [
  "platinum",
  "gold",
  "silver",
  "bronze",
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

export const tournaments = pgTable("tournaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  tournamentTypeId: uuid("tournament_type_id")
    .notNull()
    .references(() => tournamentTypes.id),
  status: tournamentStatusEnum("status").notNull().default("upcoming"),
  description: text("description").notNull(),
  maxPlayers: integer("max_players").notNull().default(32),
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
  partnershipStatus: partnershipStatusEnum("partnership_status")
    .notNull()
    .default("not_applicable"),
  skillLevel: text("skill_level").notNull().default("intermediate"),
  notes: text("notes"),
  status: entryStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tier: sponsorTierEnum("tier").notNull(),
  logoUrl: text("logo_url").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const galleryPhotos = pgTable("gallery_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id").references(() => tournaments.id, {
    onDelete: "set null",
  }),
  tournamentName: text("tournament_name").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const results = pgTable("results", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
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
