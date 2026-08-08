ALTER TABLE entries ADD COLUMN is_guest boolean NOT NULL DEFAULT false;
ALTER TABLE entries ADD COLUMN added_by_admin_id text;
ALTER TABLE entries ADD COLUMN added_by_admin_name text;
