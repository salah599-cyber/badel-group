CREATE TABLE IF NOT EXISTS ranking_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  ended_at timestamp,
  rankings jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ranking_seasons_one_current_idx
  ON ranking_seasons ((true))
  WHERE ended_at IS NULL;

ALTER TABLE results ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES ranking_seasons(id);

INSERT INTO ranking_seasons (name, started_at)
SELECT 'Current Season', now()
WHERE NOT EXISTS (SELECT 1 FROM ranking_seasons WHERE ended_at IS NULL);

UPDATE results
SET season_id = (SELECT id FROM ranking_seasons WHERE ended_at IS NULL LIMIT 1)
WHERE season_id IS NULL;
