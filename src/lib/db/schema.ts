import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tournamentStatusEnum = pgEnum("tournament_status", ["upcoming", "completed"]);
export const tournamentFormatEnum = pgEnum("tournament_format", ["singles", "doubles"]);
export const entryStatusEnum = pgEnum("entry_status", ["pending", "approved", "rejected"]);
export const sponsorTierEnum = pgEnum("sponsor_tier", [
  "platinum",
  "gold",
  "silver",
  "bronze",
]);

export const tournaments = pgTable("tournaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  format: tournamentFormatEnum("format").notNull().default("doubles"),
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
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  partnerName: text("partner_name"),
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
