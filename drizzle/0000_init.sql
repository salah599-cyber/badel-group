CREATE TYPE "public"."tournament_status" AS ENUM('upcoming', 'completed');
CREATE TYPE "public"."tournament_format" AS ENUM('singles', 'doubles');
CREATE TYPE "public"."entry_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "public"."sponsor_tier" AS ENUM('platinum', 'gold', 'silver', 'bronze');

CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "date" text NOT NULL,
  "location" text NOT NULL,
  "format" "tournament_format" DEFAULT 'doubles' NOT NULL,
  "status" "tournament_status" DEFAULT 'upcoming' NOT NULL,
  "description" text NOT NULL,
  "max_players" integer DEFAULT 32 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "partner_name" text,
  "skill_level" text DEFAULT 'intermediate' NOT NULL,
  "notes" text,
  "status" "entry_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "tier" "sponsor_tier" NOT NULL,
  "logo_url" text NOT NULL,
  "website" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gallery_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid REFERENCES "tournaments"("id") ON DELETE set null,
  "tournament_name" text NOT NULL,
  "image_url" text NOT NULL,
  "caption" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
  "tournament_name" text NOT NULL,
  "date" text NOT NULL,
  "winners" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
