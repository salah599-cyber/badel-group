-- Solo signup + admin pairing for doubles formats
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pairing_mode') THEN
    CREATE TYPE "pairing_mode" AS ENUM('manual', 'random');
  END IF;
END $$;

ALTER TABLE "tournament_types"
  ADD COLUMN IF NOT EXISTS "pairing_mode" "pairing_mode" DEFAULT 'manual' NOT NULL;

UPDATE "tournament_types"
SET "requires_partner" = false,
    "pairing_mode" = 'manual'
WHERE "slug" IN ('doubles', 'mixed-doubles');

UPDATE "tournament_types"
SET "requires_partner" = false,
    "pairing_mode" = 'random'
WHERE "slug" = 'random-teams';

UPDATE "tournament_types"
SET "description" = 'Standard doubles — sign up solo, admin assigns partners'
WHERE "slug" = 'doubles';

UPDATE "tournament_types"
SET "description" = 'Mixed-gender doubles — sign up solo, admin assigns partners'
WHERE "slug" = 'mixed-doubles';

ALTER TABLE "entries"
  ADD COLUMN IF NOT EXISTS "partner_entry_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entries_partner_entry_id_entries_id_fk'
  ) THEN
    ALTER TABLE "entries"
      ADD CONSTRAINT "entries_partner_entry_id_entries_id_fk"
      FOREIGN KEY ("partner_entry_id") REFERENCES "entries"("id") ON DELETE SET NULL;
  END IF;
END $$;
