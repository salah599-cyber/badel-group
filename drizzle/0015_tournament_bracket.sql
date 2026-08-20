ALTER TYPE "tournament_status" ADD VALUE IF NOT EXISTS 'registration_closed';
ALTER TYPE "tournament_status" ADD VALUE IF NOT EXISTS 'group_stage';
ALTER TYPE "tournament_status" ADD VALUE IF NOT EXISTS 'knockout_stage';

CREATE TYPE "match_format" AS ENUM (
  'best_of_1',
  'best_of_3_full',
  'best_of_3_super_tiebreak'
);

CREATE TYPE "knockout_round" AS ENUM (
  'round_of_16',
  'quarterfinal',
  'semifinal',
  'final',
  'third_place'
);

CREATE TYPE "match_status" AS ENUM ('scheduled', 'completed');

CREATE TYPE "match_outcome" AS ENUM ('played', 'walkover');

ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "match_format" "match_format" NOT NULL DEFAULT 'best_of_1';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "super_tiebreak_points" integer NOT NULL DEFAULT 10;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "teams_per_group" integer NOT NULL DEFAULT 4;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "advance_per_group" integer;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "knockout_start_round" "knockout_round";
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "third_place_playoff" boolean NOT NULL DEFAULT false;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "points_win" integer NOT NULL DEFAULT 1;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "points_loss" integer NOT NULL DEFAULT 0;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "group_draw_seed" integer;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "champion_team_id" uuid;

CREATE TABLE IF NOT EXISTS "tournament_teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "entry_ids" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "team_ids" jsonb NOT NULL DEFAULT '[]',
  "manual_tiebreak_order" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "group_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "team_a_id" uuid NOT NULL REFERENCES "tournament_teams"("id") ON DELETE CASCADE,
  "team_b_id" uuid NOT NULL REFERENCES "tournament_teams"("id") ON DELETE CASCADE,
  "sets" jsonb NOT NULL DEFAULT '[]',
  "status" "match_status" NOT NULL DEFAULT 'scheduled',
  "winner_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "outcome" "match_outcome" NOT NULL DEFAULT 'played',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "knockout_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "round" "knockout_round" NOT NULL,
  "slot" integer NOT NULL,
  "team_a_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "team_b_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "source_a" jsonb,
  "source_b" jsonb,
  "sets" jsonb NOT NULL DEFAULT '[]',
  "status" "match_status" NOT NULL DEFAULT 'scheduled',
  "winner_id" uuid REFERENCES "tournament_teams"("id") ON DELETE SET NULL,
  "outcome" "match_outcome" NOT NULL DEFAULT 'played',
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_champion_team_id_fk"
  FOREIGN KEY ("champion_team_id") REFERENCES "tournament_teams"("id") ON DELETE SET NULL;
