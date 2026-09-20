---
name: werkzeugkasten
description: Bevor ein neues Skript, Messgerät oder Hilfsmittel gebaut wird - und immer wenn eine Zahl über den Shop, die Webseite, das Gedächtnis oder ein Video gebraucht wird. Sagt, welches Werkzeug es schon gibt, was es misst und wie es aufgerufen wird, damit nichts doppelt gebaut wird.
---

# Was es schon gibt — erst nachsehen, dann bauen

Node ist **`/opt/node22/bin/node`**. Jedes Werkzeug hier hat `--selbsttest` mit Gegenprobe;
**der Selbsttest läuft vor jedem Einsatz**, sonst ist die Zahl ein Verdacht.

## Shop messen (LuxeStyle)

| Werkzeug | misst | Aufruf |
|---|---|---|
| `tools/shop_conversion.mjs` | Conversion-Bausteine auf den **echten** Seiten: sticky-ATC, Sterne, Bewertungszahl, Versandversprechen samt Schwelle, Gratisversand-Balken, Lieferdatum, Grössenhilfe, Video, Zahlungslogos, Seitengewicht — dazu **wo das E-Mail-Feld steht** (in Prozent der Seite), ob ein **Anmeldefenster** geladen wird und ob ein **Rabattcode im Klartext** auf der Seite steht | `… tools/shop_conversion.mjs --standard` |
| `tools/shop_startseite.mjs` | Zuverlässigkeit und Gewicht der Startseite gegen eine Produktseite als Kontrolle | `… tools/shop_startseite.mjs` |
| `tools/produkt_qualitaet.mjs` | Produktdefekte aus einem GraphQL-Auszug: rohe Lieferantentexte, erfundene Grössen, fehlende Bilder/Alt-Texte/SEO | `… tools/produkt_qualitaet.mjs <dump.json>` |
| `tools/kanal_waechter.mjs` | heikle Produkte in Marketing-Kanälen (nach Collection, nicht nach Titel) | `… tools/kanal_waechter.mjs <dump.json>` |
| `tools/varianten_deutsch.mjs` | übersetzt rohe Variantentexte; **Grössen bleiben unangetastet**, Wächter prüft das | `… tools/varianten_deutsch.mjs "Red-FatherS"` |
| `automation/homepage_slim.mjs` | stellt die Startseite von 17 auf 4 Produktreihen um (nur in eine Theme-Kopie) | `… automation/homepage_slim.mjs` |

## Webseite messen (abannews.com)

| Werkzeug | misst |
|---|---|
| `tools/ki_look.py` | Bestandszählung „wie KI-generiert" (Verläufe, Floskeln, Radien) |
| `tools/kopfleiste.mjs` | Durchschlag der klebenden Kopfleiste, mit eingebauter Gegenprobe |
| `tools/produktdichte.mjs` | Spalten, Bildgrösse, Seitenhöhe des Produktrasters |
| `tools/seiten_blick.mjs` | Seiten in **Bildschirmhöhen** statt als 21 000-px-Bild |
| `tools/ecken.py`, `tools/flaechen.py`, `tools/textbausteine.py` | Radien, Farbflächen, Textbausteine (je mit `test_`-Datei) |

## Gedächtnis

| Werkzeug | tut |
|---|---|
| `tools/gedaechtnis.py` | **suchen statt lesen**: `"stichwort"`, `--sackgassen`, `--offen`, `--stand` |
| `tools/vault.py` | `bauen` (Index + Zeitleiste, prüft alle Wikilinks), `pruefen`, `selbsttest` |
| `tools/lehre.py` | neue Lehre idempotent in den Vault aufnehmen |
| `tools/skills_pruefen.py` | findet verrottete Pfade in Skills und Notizen |

## Recherche

| Werkzeug | tut |
|---|---|
| `tools/preis_marge.mjs` | Rohmarge des Katalogs aus Verkaufs- und Einkaufspreis (`inventoryItem.unitCost`): Verlustfälle, dünne Margen, Median je Preisklasse, Wirkung von WELCOME10. Daten in `dropship/preise-kosten-*.csv`. ⚠️ **Liest eine Zeile je Produkt = die billigste Variante** — für Produkte mit Grössen zu optimistisch, dann `varianten_preis.mjs` nehmen | `… tools/preis_marge.mjs` |
| `automation/local/ig-reel-lesen.mjs` | **Läuft auf dem PC, nicht in der Cloud.** Liest ein Instagram-Reel aus dem eingeloggten Brave (CDP, Port 9222) und schreibt Text, Urheber, Datum, Zahlen und Video-Adresse als JSON. Nötig, weil Instagram an den Container nur eine leere Hülle liefert (0 og-Tags, gegengeprüft an einem zweiten Beitrag). Liest nur — liked, folgt und postet nicht | `node automation/local/ig-reel-lesen.mjs "<url>"` · `--selbsttest` |
| `automation/preis_korrektur.mjs` | **Bepreist den ganzen Katalog in EINEM Lauf** nach der Zielmargen-Regel. Sechs Sicherheitsregeln je im Selbsttest: nie senken · kein Einkaufspreis = überspringen · Faktor-Deckel 3 (darüber melden statt setzen) · idempotent · ohne Zugangsdaten No-op · `DRY_RUN` ist Standard. 🟡 Braucht `SHOPIFY_SHOP`/`SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` | `DRY_RUN=1 node automation/preis_korrektur.mjs` |
| `tools/schutzausruestung.mjs` | Sucht auf den echten Produktseiten nach Normangaben für Schutzausrüstung (Helme, Westen, Schutzbrillen). Trennt **drei** Fälle: europäisch (EN 1078/1077/1385, CE) · chinesisch (3C/CCC/GB — **Befund**) · unbekannt (**kein Befund**, nur eine Lücke in der Beschreibung). Benutzt `sichtbarerText()` aus `shop_conversion.mjs` | `… tools/schutzausruestung.mjs --datei dropship/schutzausruestung-handles.txt` |
| `tools/varianten_preis.mjs` | Marge je Produkt über **alle** Varianten: rechnet `kosten_max` gegen `preis_min`, findet Verlustvarianten, die eine Messung je Produkt übersieht, und Preisspannen ohne Kostengrund. Enthält die Preisleiter-Regel (nach WELCOME10 ≥ 38 % Marge) als `zielpreis()`. Daten in `dropship/preise-varianten-*.csv` | `… tools/varianten_preis.mjs --selbsttest` |
| `tools/yt_lernen.mjs` | Titel, Kanal, Datum, Aufrufe, Dauer und Beschreibung samt **Kapitelmarken** einer YouTube-Seite. Transkripte gehen nicht — siehe Skill `recherchieren` |
| `tools/tiktok_analyze.py` | echte Leistungsdaten des eigenen TikTok-Kontos (`--insecure` im Sandkasten) |

## Umgebung

- **Playwright ist nicht vorinstalliert**: `npm i playwright --no-save`, Browser per
  `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. **Nie**
  `playwright install`.
- **ffmpeg fehlt zunächst.** `apt-get update && apt-get install -y --no-install-recommends
  ffmpeg` funktioniert (ohne vorheriges `update` schlägt es mit 404 auf einzelne Pakete fehl).
  Das mitgelieferte `/opt/pw-browsers/ffmpeg-*/ffmpeg-linux` kann normale MP4 **nicht** lesen.
- Messgeräte gehören nach `tools/`, Berichte nach `reports/` oder `dropship/`.

## Wenn doch etwas Neues gebaut wird

Skill `messgeraet-zuerst` gilt: Gegenprobe im selben Arbeitsgang, Selbsttest gegen eine **Kopie
an einem anderen Pfad**, und das Werkzeug wird hier eingetragen.
