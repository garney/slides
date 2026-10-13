-- Mirrors db/migrations for `supabase db push` / hosted projects.

CREATE TABLE IF NOT EXISTS presentations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(512) NOT NULL,
  template_id VARCHAR(64) NOT NULL DEFAULT 'default',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'authenticated')),
  document JSONB NOT NULL,
  created_by_email VARCHAR(320),
  created_by_sub VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS presentations_visibility_idx ON presentations (visibility);
CREATE INDEX IF NOT EXISTS presentations_created_by_email_idx ON presentations (created_by_email);

CREATE OR REPLACE FUNCTION presentations_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS presentations_updated_at ON presentations;
CREATE TRIGGER presentations_updated_at
  BEFORE UPDATE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION presentations_set_updated_at();
