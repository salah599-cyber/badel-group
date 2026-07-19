-- Tournament types (replaces singles/doubles format enum)
CREATE TABLE IF NOT EXISTS "tournament_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "requires_partner" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "tournament_types" ("name", "slug", "description", "requires_partner", "sort_order")
VALUES
  ('Doubles', 'doubles', 'Standard doubles — sign up solo, admin assigns partners', false, 1),
  ('Mixed Doubles', 'mixed-doubles', 'Mixed-gender doubles — sign up solo, admin assigns partners', false, 2),
  ('Random Team Selection', 'random-teams', 'Sign up solo — teams are assigned randomly on the day', false, 3)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "tournament_type_id" uuid;

UPDATE "tournaments"
SET "tournament_type_id" = (
  SELECT "id" FROM "tournament_types" WHERE "slug" = 'doubles' LIMIT 1
)
WHERE "tournament_type_id" IS NULL;

ALTER TABLE "tournaments"
  ALTER COLUMN "tournament_type_id" SET NOT NULL;

ALTER TABLE "tournaments"
  DROP CONSTRAINT IF EXISTS "tournaments_tournament_type_id_tournament_types_id_fk";

ALTER TABLE "tournaments"
  ADD CONSTRAINT "tournaments_tournament_type_id_tournament_types_id_fk"
  FOREIGN KEY ("tournament_type_id") REFERENCES "tournament_types"("id");

ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "format";

DROP TYPE IF EXISTS "tournament_format";
