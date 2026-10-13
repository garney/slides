ALTER TABLE presentations
  ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(320),
  ADD COLUMN IF NOT EXISTS created_by_sub VARCHAR(64);

CREATE INDEX IF NOT EXISTS presentations_created_by_email_idx ON presentations (created_by_email);
