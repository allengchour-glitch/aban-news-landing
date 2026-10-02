# Grow-Speicher nutzen — 02.10.2026 (Betreiber «nutze grow speicherplatz»)

## GEMESSEN
- Upload-Probe: ein 173-KB-Bild ins Shopify-CDN → READY (der Speicher nimmt wieder an).
- Liegengeblieben wegen vollem Speicher (bis 01.10.):
  - **56 wartende Reels** (`reels_seed.csv`, status ready) zeigten auf `raw.githubusercontent.com/…/social/reels/` (Repo 682 MB, 254 Dateien).
  - **1 Produkt** als Entwurf `bild-fehlt-speicher-voll` (Handy-Makeover-Set, 30.09. Bild gelöscht, Upload scheiterte).
  - **TikTok-Queue fürs CDN** meldete seit 01.09. «FILE_STORAGE_LIMIT_EXCEEDED» — auch nach dem Grow-Wechsel.
  - Aktive Produkte nach Bildzahl (Export 30.09.): 1 Bild 1'265 · 2 Bilder 1'441 · 3 Bilder 1'260 · ≥ 4 Bilder 45'416.
  - Lieferantenvideo-Nachtrag: letzter Lauf 01.10. 00:10; der Vorrang-Lauf (16:00 UTC) startet erst heute — vorher sind die
    CJ-Punkte leer (06:24 gemessen: «CJ-Tagesbudget erschöpft»; CJ setzt um 16:00 UTC = Mitternacht Peking zurück).

## GETAN
- `automation/reel_cdn_umzug.py` (neu, Standard trocken): je wartendem Reel Upload ins CDN, Prüfung HTTP 200 + video/* + Grösse,
  CSV neu gelesen und nur die noch-ready-Zeile mit alter URL umgeschrieben (atomar). **55 + 1 umgezogen, 0 Fehler**;
  331 Zeilen vorher/nachher, ready = 57 alle auf cdn.shopify.com. Dateiname bleibt → Doppelpost-Sperre unverändert.
  Repo-Dateien bleiben als Rückfall.
- Handy-Makeover-Set: Bild aus `dropship/_bild_backup/` hochgeladen → READY → ACTIVE, Tag entfernt (Reihenfolge: erst READY, dann aktiv).
- **Fehlalarm behoben:** `tiktok_cowork_auftrag.py` + `tiktok_jetzt.py` lasen `fileErrors` einer per `fileUpdate` ersetzten
  Datei — das ist eine HISTORIE; die September-Fehler blieben hängen, obwohl die Datei READY war und das CDN den heutigen
  Stand auslieferte. Jetzt entscheidet der ausgelieferte Inhalt (Queue = lokal / Befehls-ID stimmt). Nachlauf: «✅ Queue-CDN aktualisiert».

## OFFEN (läuft von selbst)
- Bilder für Produkte mit 1–2 Bildern (`cj_bild_backfill`) und Lieferantenvideos (`cj_video_backfill`, CAP 250, Grow-Deckel 1'000)
  brauchen CJ-Punkte → Aufseher startet beide im Vorrang-Fenster 16:00–17:30 UTC.
- Repo `social/reels/` (682 MB) aufräumen, sobald die CDN-Reels eine Woche ohne Rückfall gelaufen sind.
