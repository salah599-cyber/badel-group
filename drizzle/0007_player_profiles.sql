CREATE TABLE IF NOT EXISTS "player_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name_key" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "photo_url" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
