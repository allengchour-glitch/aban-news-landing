# Bewegter Kategoriekopf (Testvorlage, nicht für Kundinnen umgeschaltet)

Stand 16.11.2026 04:4x UTC. Auftrag des Besitzers 15.11.: «unterkategorien auch verbessern mit hintergründe?».

- **Testlink:** jede Kategorieseite mit `?view=lxbewegt`, z. B. `https://luxestyle.ch/collections/geschirr-tisch?view=lxbewegt` (Clip), `https://luxestyle.ch/collections/damen-mode?view=lxbewegt` (Fotostreifen). Die normale Kategorieseite ist unverändert.
- **Live im MAIN-Theme `213991391623` nur diese zwei eigenen Dateien:** `snippets/lx-kopf-bewegt.liquid` (md5 `0f2c7d9df8afd59bcbec338062a73c30`, Stand 16.11. nach Runde 1611b) und `templates/collection.lxbewegt.json` (md5 `bdb35745ee7d5c0722f9ad5f15cf4793`). Fremde Dateien werden vor und nach jedem Schreiben verglichen.
- **Runde 1611b (16.11. nachts):** Pause-Knopf bleibt nach einem Fehler und Wechsel unter 1100 px sichtbar (`b.hidden=breit`), Clip s01 mit Ausschnitt `50% 53%` und Breite höchstens 360 px, Schimmer endet wieder durchsichtig (`@keyframes lxkb-schein{50%{opacity:1}to{opacity:0}}`). Nachbau-Test `test/nachbau_test.cjs` 130 bestanden, 0 fehlgeschlagen; unabhängiger Prüfer: «ok».
- **Vorgeschichte:** `BERICHT.md` (Bau 15.11.), `BERICHT-KORREKTUR.md` (Funde W1 bis W4, K1 bis K7, 16.11. 02:39 UTC). Pfade in den Berichten nennen den Scratch-Ordner der Sitzung; die Skripte rechnen relativ zu ihrem eigenen Ordner.

## Befehle (aus diesem Ordner, Node 22)

- `node apply_bewegt.mjs` Trockenlauf. `LIVE=1` schreibt die zwei eigenen Dateien, liest zurück, vergleicht die fremden.
- `node umschalten.mjs` Trockenlauf: zeigt die eine Änderung in `templates/collection.json`. **`LIVE=1 node umschalten.mjs` nur auf ausdrückliches Ja des Besitzers.** Rücknahme danach `ZURUECK=1 LIVE=1 node umschalten.mjs` (schreibt die Sicherung aus `sicherung/` zurück).
- Runde 1611b zurücknehmen: `theme_alt/snippets/lx-kopf-bewegt.vor-1611b.liquid` nach `theme/snippets/lx-kopf-bewegt.liquid` kopieren, Trockenlauf, `LIVE=1 node apply_bewegt.mjs`.
- Testvorlage ganz entfernen: `ZURUECK=1 LIVE=1 node apply_bewegt.mjs`.
- Test: zuerst die Seiten holen, `bash holen.sh html/live "" schmuck damen-mode` (höchstens ein Abruf je 7 s), dann `node test/nachbau_test.cjs` (Playwright, Chromium; `live/` enthält die Theme-Dateien vom 16.11. als Grundlage des Nachbaus). Gespeicherte Seiten bleiben ausserhalb des Repos (`.gitignore`).
- Zugang: `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`. Der Token liegt in `os.tmpdir()` (`LX_TOKEN_CACHE` übersteuert), nie in diesem Ordner.

## Nicht im Repo

Clips und Poster (liegen in Shopify Files), Bildschirmfotos, Messprotokolle, Kopien fremder Theme-Dateien, Zwischenstände. **Ungemessen:** Safari, Firefox, echtes Handy, Wirkung auf Käufe.
