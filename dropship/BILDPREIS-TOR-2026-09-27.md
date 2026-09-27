# Bildpreis-Tor — eingebrannter Preis gegen Caption (27.09.2026)

**Klasse:** Reels tragen den Preis doppelt — im Text (Caption) und eingebrannt ins Video. `post_guard.preisVeraltet`
prüft seit 24.09. nur die Caption gegen den Live-Preis. Das Bild prüfte niemand.

**Gemessen (tesseract, 3 Frames je Reel):**
- 14 zuletzt gepostete/wartende Reels aus dem Repo (`social/reels/`): Bildpreis = Caption-Preis 14/14.
- 3 wartende Reels vom Shopify-CDN (v1, Juli): **2 falsch** — «Magnetischer Anti-Schiel-Schutz» Bild **CHF 5.90**,
  Caption 15.90; zweites Reel Bild **CHF 7.90**, Caption 14.90 (Sichtprüfung Frame: Text im Bild eindeutig). Der
  Preisschutz vom 24.09. hob Preis + Caption, das Video blieb alt.
- 2 wartende Karussells: Slides = Caption = Live (4× 15.90, 47.90).

**Getan:** `meisterwerk_tor.py` hat die Prüfung PREIS: mit `PREIS_SOLL` (CHF-Preise der Caption) muss jeder im Bild
gelesene Betrag (mit Rappen, ≥ 5.00) in der Caption stehen, sonst Grund «BILDPREIS x ≠ Caption y» → Status
`meisterwerk-tor-skip`, nächstes Reel. Beide Reel-Poster (`meta_reel_post.mjs`, `metricool_tiktok_post.mjs`) geben
`PREIS_SOLL` aus der Caption mit. Ohne tesseract oder ohne Treffer: kein Urteil (Tor misst weiter die übrigen Punkte).
Die Kette ist damit geschlossen: **Bild = Caption** (Tor) und **Caption = Live** (`preisVeraltet`).

**Kanarienvogel:** gleiches Reel mit Soll 107.90 → ok; mit Soll 99.90 → «BILDPREIS 107.90 ≠ Caption 99.90». Fehlalarme
auf den 6 sauberen wartenden Reels: 0.

**Offen:** Bildposts (Fotos vom Lieferanten) tragen keine eigenen CHF-Preise; Lieferantentext im Bild prüft seit 25.09.
`bildtext_pruefen` (zehnte Schicht).
