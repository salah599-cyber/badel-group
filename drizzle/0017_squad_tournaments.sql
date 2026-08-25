DO $$ BEGIN
  CREATE TYPE "competition_format" AS ENUM('pairs', 'squads');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "tournament_types" ADD COLUMN IF NOT EXISTS "competition_format" "competition_format" DEFAULT 'pairs' NOT NULL;

ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "roster_size" integer DEFAULT 6 NOT NULL;

ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "is_woman" boolean DEFAULT false NOT NULL;
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "admin_skill_rank" text;

ALTER TABLE "tournament_teams" ADD COLUMN IF NOT EXISTS "captain_entry_id" uuid;

DO $$ BEGIN
  ALTER TABLE "tournament_teams"
    ADD CONSTRAINT "tournament_teams_captain_entry_id_entries_id_fk"
    FOREIGN KEY ("captain_entry_id") REFERENCES "entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "match_lineups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_match_id" uuid,
  "knockout_match_id" uuid,
  "team_id" uuid NOT NULL,
  "set1_entry_ids" jsonb,
  "set2_entry_ids" jsonb,
  "set3_entry_ids" jsonb,
  "submitted_by_user_id" text,
  "submitted_at" timestamp,
  "is_admin_override" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "match_lineups"
    ADD CONSTRAINT "match_lineups_group_match_id_group_matches_id_fk"
    FOREIGN KEY ("group_match_id") REFERENCES "group_matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "match_lineups"
    ADD CONSTRAINT "match_lineups_knockout_match_id_knockout_matches_id_fk"
    FOREIGN KEY ("knockout_match_id") REFERENCES "knockout_matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "match_lineups"
    ADD CONSTRAINT "match_lineups_team_id_tournament_teams_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "tournament_teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tournament_partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL,
  "name" text NOT NULL,
  "logo_url" text NOT NULL,
  "website" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "tournament_partners"
    ADD CONSTRAINT "tournament_partners_tournament_id_tournaments_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tournament_sponsors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL,
  "name" text NOT NULL,
  "tier" "sponsor_tier" NOT NULL,
  "logo_url" text NOT NULL,
  "website" text,
  "link_type" "sponsor_link_type" DEFAULT 'website' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_tournament_id_tournaments_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO "tournament_types" ("name", "slug", "description", "requires_partner", "pairing_mode", "competition_format", "sort_order")
VALUES (
  'Teams',
  'teams',
  '6-player squads — individual signup, admin ranks and balances teams',
  false,
  'manual',
  'squads',
  4
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "competition_format" = EXCLUDED."competition_format";
