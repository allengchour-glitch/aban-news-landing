# R302 – Flüssiger Startseitenfilm und klarere Einkaufskacheln – 21.11.2026

Shopify-Shop `94368563585`, `luxestyle.ch`, CHF und Theme «LuxeStyle – Startseite 21.11.2026» (`214565814663`, `MAIN`) vor dem Write geprüft. Dieselbe, zuvor zur Live-Schaltung freigegebene Theme-Kopie war beim neuen Lauf bereits öffentlich. Der in R300 dokumentierte damalige Publish-Fehler betrifft den früheren Versuch.

## Veröffentlichte Änderung

Die scrollgesteuerte Zeitleiste führte im Gegentest bei Desktop-Aufrufen zu einzelnen Suchzeiten bis 806 ms. Der vorhandene stumme 32-Sekunden-Film mit 18 Produkten spielt automatisch in einer Schleife, sobald er im Sichtfeld ist. Abseits des sichtbaren Bereichs hält er an. Bei reduzierter Bewegung zeigt der Browser das Standbild ohne Abruf der Videodatei. Die Pause bleibt per Tastatur erreichbar.

Verwendet werden die vorhandenen Shopify-Ausgaben derselben Filme. Desktop 1920 × 1080, 30 fps, 11’427’576 Byte (41 % kleiner). Mobil 404 × 720, 30 fps, 5’810’056 Byte (31 % kleiner). Beide Ausgaben wurden als MP4 technisch geprüft.

Der Startbereich ist auf Mobilgeräten kompakter. Kachelbilder erhalten einen leichteren Verlauf und behalten den Kontrast hinter dem Titel. Zwei Entdecken-Karten zeigen die Originalmotive für Schmuck und Wohnen. Die Karte «Haustiere» verwendet das bestehende Motiv und verlinkt die aktuelle Haustierwelt mit Hunde- und Katzenprodukten. In der Fusszeile öffnen sechs Symbole die zugehörigen Profile. Pinterest und YouTube sind neu hinzugekommen.

## Nachweise

Shopify speicherte Version `fcb7cecdee147c9aefe56b537da100d214279332` und bestätigte `published=true`. Die Admin-Gegenprobe nach der Veröffentlichung bestätigte genau sieben inhaltlich geänderte Dateien. Die vier zusätzlich in der Liste zur Veröffentlichung aufgeführten Dateien hatten bereits vorab dieselben Prüfsummen wie der aktuelle Live-Stand und blieben bytegleich.

| Datei | MD5 nach Veröffentlichung |
|---|---|
| `assets/luxe-scroll-hero.js` | `868a8bbeab1bcf50f5f7defbd7a4e8e2` |
| `locales/de.json` | `c4485bb46ede5ffcd1f6d137fe9219fd` |
| `locales/en.default.json` | `d326377b9503e1f46194b55f66277c8f` |
| `locales/fr.json` | `bcc4ea2fda7567eb261cab61747e6a98` |
| `sections/footer-group.json` | `2c9b6f84dc02dbc9a8faa37f78e093ff` |
| `sections/luxe-edit-home.liquid` | `d6729366bdc577ce193b25158b416bdc` |
| `templates/index.json` | `afe5f31489725fa7d9d20c35103c9b60` |

Chromium prüfte die öffentliche Startseite bei 1440 und 390 px. Beim Scrollen wurden jeweils 75 Bilder in rund 2,5 Sekunden wiedergegeben, ohne verworfenes Bild und ohne Wiedergabesprung. Tastaturpause, Ausblenden beim Weiterscrollen, Standbild bei reduzierter Bewegung sowie die Haustier-Karte und beide neuen Footer-Links wurden auf der öffentlichen Seite geprüft.

Lokale Prüfdaten: `/tmp/luxe-home-speed-20261121/public-player-proof.json` und `patch-files.json`. [Öffentliche Startseite](https://luxestyle.ch/) · [Haustierwelt](https://luxestyle.ch/collections/sub-haustier) · [Shopify-Theme](https://admin.shopify.com/store/au3j0y-hq/themes/214565814663/editor)
