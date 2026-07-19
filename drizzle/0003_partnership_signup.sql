CREATE TYPE "signup_mode" AS ENUM('solo', 'with_partner');
CREATE TYPE "partnership_status" AS ENUM(
  'not_applicable',
  'pending_partner',
  'pending_admin',
  'approved',
  'rejected'
);

ALTER TABLE "entries"
  ADD COLUMN IF NOT EXISTS "user_id" text,
  ADD COLUMN IF NOT EXISTS "signup_mode" "signup_mode" DEFAULT 'solo' NOT NULL,
  ADD COLUMN IF NOT EXISTS "partner_email" text,
  ADD COLUMN IF NOT EXISTS "partner_user_id" text,
  ADD COLUMN IF NOT EXISTS "partnership_status" "partnership_status" DEFAULT 'not_applicable' NOT NULL;

UPDATE "entries"
SET "signup_mode" = 'solo',
    "partnership_status" = 'not_applicable'
WHERE "signup_mode" IS NULL OR "partnership_status" IS NULL;
