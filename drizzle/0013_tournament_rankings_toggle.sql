ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS counts_toward_rankings boolean NOT NULL DEFAULT true;
