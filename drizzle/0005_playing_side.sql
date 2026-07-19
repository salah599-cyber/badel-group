CREATE TYPE "playing_side" AS ENUM('right', 'left', 'any');

ALTER TABLE "entries"
  ADD COLUMN IF NOT EXISTS "playing_side" "playing_side" DEFAULT 'any' NOT NULL;

UPDATE "entries"
SET "playing_side" = 'any'
WHERE "playing_side" IS NULL;
