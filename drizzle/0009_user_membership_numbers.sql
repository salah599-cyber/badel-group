CREATE TABLE IF NOT EXISTS "user_membership_numbers" (
  "user_id" text PRIMARY KEY,
  "membership_number" text NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS "user_membership_numbers_number_idx"
  ON "user_membership_numbers" ("membership_number");
