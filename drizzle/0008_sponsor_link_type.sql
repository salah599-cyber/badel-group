DO $$ BEGIN
  CREATE TYPE "sponsor_link_type" AS ENUM('website', 'instagram');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "sponsors"
  ADD COLUMN IF NOT EXISTS "link_type" "sponsor_link_type" NOT NULL DEFAULT 'website';
