-- Cloudflare D1 Schema für die eigenen Inserate.
-- Neu anlegen:  wrangler d1 execute inserate --file=db/inserate-schema.sql
CREATE TABLE IF NOT EXISTS inserate (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kat          TEXT,
  ort          TEXT,
  plz          TEXT,
  titel        TEXT,
  beschreibung TEXT,
  preis        TEXT,
  kontakt      TEXT,
  typ          TEXT DEFAULT 'Angebot',   -- Angebot | Gesuch
  zustand      TEXT,                      -- Neu | Wie neu | Gebraucht | Defekt (optional)
  bild         TEXT,                      -- optionale Bild-URL (https)
  featured     INTEGER DEFAULT 0,         -- 1 = Top-Inserat (hervorgehoben)
  status       TEXT DEFAULT 'pending',
  created      INTEGER,
  expires      INTEGER,
  ip           TEXT
);
CREATE INDEX IF NOT EXISTS idx_status_created ON inserate(status, created);
CREATE INDEX IF NOT EXISTS idx_status_featured ON inserate(status, featured, created);

-- Bei bereits bestehender Tabelle einmalig (Fehler "duplicate column" ignorieren):
-- ALTER TABLE inserate ADD COLUMN typ TEXT DEFAULT 'Angebot';
-- ALTER TABLE inserate ADD COLUMN zustand TEXT;
-- ALTER TABLE inserate ADD COLUMN bild TEXT;
-- ALTER TABLE inserate ADD COLUMN featured INTEGER DEFAULT 0;
