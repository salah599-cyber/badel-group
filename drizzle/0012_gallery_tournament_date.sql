ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS tournament_date text;

UPDATE gallery_photos gp
SET tournament_date = t.date
FROM tournaments t
WHERE gp.tournament_id = t.id
  AND gp.tournament_date IS NULL;
