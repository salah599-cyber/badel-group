DO $$ BEGIN
  CREATE TYPE "sponsor_link_type" AS ENUM('website', 'instagram');
EXCEPTION
  WHEN duplicate_object THEN NULL;
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

ALTER TABLE "tournament_sponsors"
  ADD COLUMN IF NOT EXISTS "link_type" "sponsor_link_type" NOT NULL DEFAULT 'website';

DO $$ BEGIN
  ALTER TABLE "tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_tournament_id_tournaments_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
