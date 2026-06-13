-- Cloudflare D1 Schema für die eigenen Inserate (Phase B).
-- Aktivieren:  wrangler d1 execute inserate --file=db/inserate-schema.sql
CREATE TABLE IF NOT EXISTS inserate (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kat          TEXT,
  ort          TEXT,
  plz          TEXT,
  titel        TEXT,
  beschreibung TEXT,
  preis        TEXT,
  kontakt      TEXT,
  status       TEXT DEFAULT 'pending',
  created      INTEGER,
  expires      INTEGER,
  ip           TEXT
);
CREATE INDEX IF NOT EXISTS idx_status_created ON inserate(status, created);
