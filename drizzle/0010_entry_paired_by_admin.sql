ALTER TABLE "entries"
  ADD COLUMN IF NOT EXISTS "paired_by_admin_id" text,
  ADD COLUMN IF NOT EXISTS "paired_by_admin_name" text;
