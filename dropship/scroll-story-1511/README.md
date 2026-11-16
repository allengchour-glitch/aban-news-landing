# Scroll-Story Startseite (Testvorlage, nicht für Kundinnen umgeschaltet)

Stand 16.11.2026 04:4x UTC. Auftrag des Besitzers: «kannst du krassen 20k franken webseite machen? zb wen mann runterscrollt das der hintergrund bewegt».

- **Testlink:** `https://luxestyle.ch/?view=lxstory` (auch `/fr?view=lxstory`). Die Startseite `/` ist unverändert.
- **Live im MAIN-Theme `213991391623` nur eigene Dateien** (eingespielt 15.11. 23:45 UTC, Nachträge 16.11. 00:52 und 01:25 UTC, zurückgelesen gleich): `sections/lx-story.liquid` `de87f27c…`, `sections/lx-story-platz.liquid` `6b28ddee…`, `sections/lx-story-testseite.liquid` `a98b0867…`, `assets/lx-story.js` `efa7750a…`, `templates/index.lxstory.json` `5fdb956c…`. Clips und Poster: 32 Dateien in Shopify Files (`dateien_ids.json`, `medien.json`).
- **Kapitel:** sechs Produkte mit kaufbarer Ausführung (`kapitel.json`); ein Kapitel fällt von selbst weg, wenn Produkt oder Ausführung nicht mehr kaufbar ist. Tests: Nachbau `test/buehne_test.cjs` 126 von 126, Mutationsprobe 33 von 33.
- **Bekannt:** auf dem Desktop 7 110 px, auf dem Handy 6 203 px hoch (die Kategorien kommen später); Safari, Firefox, echtes Handy und Wirkung auf Käufe ungemessen. Alles Weitere in `BERICHT.md` (Pfade dort nennen den Scratch-Ordner der Sitzung).

## Befehle (aus diesem Ordner, Node 22)

- `node apply_story.mjs` Trockenlauf; `LIVE=1` schreibt die eigenen Dateien; `ZURUECK=1 LIVE=1` löscht sie, solange sie dem Stand in `eingespielt.json` entsprechen.
- `node umschalten.mjs` Trockenlauf (prüft `templates/index.json` gegen den erwarteten Stand, `ERWARTET_MD5=` bestätigt einen neuen). **`LIVE=1 node umschalten.mjs` nur auf ausdrückliches Ja des Besitzers**, vorher und nachher messen (`test/live_messen.cjs`, `mess2/lcp_ab.cjs`). Rücknahme `ZURUECK=1 LIVE=1 node umschalten.mjs`; Rücknahme-Kriterium in `BERICHT.md` «Umschalten».
- `bauen_stil.sh` baut `theme/sections/lx-story.liquid` aus `theme_src/`.
- Zugang: `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`. Der Token liegt in `os.tmpdir()` (`LX_TOKEN_CACHE` übersteuert), nie in diesem Ordner.

## Nicht im Repo

Kodierte Videos (`kodiert/`), Bildschirmfotos, Messprotokolle, Kopien fremder Theme-Dateien, Fassung 1, CJ-Datenblätter.
