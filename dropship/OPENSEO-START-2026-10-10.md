# OpenSEO verbunden — erster Stand (10.10.2026, Betreiber «openseo verbunden»)

## Eingerichtet (ohne Credits)

- Konto: hosted, **500 Credits** zu Beginn, nach der Übersicht (14) und der Keyword-Liste (28) noch **458** (wenig später 430 — die Abrechnung der Keyword-Liste kam verzögert).
- Projekt **«LuxeStyle CH»** `443c940c-93c9-4feb-9d0c-1e4d1d88c6cf`, Domain luxestyle.ch, Markt **Schweiz / Deutsch** (Location 2756).
- Projekt-Gedächtnis gefüllt: Geschäft, Ziel, Positionierung und Schreibregeln (ss, du-Form, keine Verknappung, keine Fake-Bewertungen). Dazu 5 Schlüsselseiten.
- **Search Console und GA4 sind in OpenSEO NICHT verbunden** (`get_search_console_performance` → `not_connected`).

## Gemessen (DataForSEO über OpenSEO, Schätzwerte; Liste in `dropship/openseo/ranked_top100_2026-10-10.json`)

**Domain-Übersicht** (14 Credits): 542 Keywords, geschätzt ~292 organische Besuche pro Monat. Backlinks liefert diese Abfrage nicht.

**Top 100 Keywords nach Traffic** (Positionen):

| Position | Anzahl |
|---|---|
| 1–10 | 2 |
| 11–20 | 1 |
| 21–40 | 8 |
| 41–60 | 40 |
| 61–100 | 49 |

- **97 der 100 Treffer sind Produktseiten**, nur 3 sind Kollektionen.
- Die grossen Suchbegriffe landen auf einem einzelnen Produkt auf Seite 6–9, zum Beispiel:
  - «handstaubsauger» 5'400 Suchen/Mt, Position 72
  - «gps tracker» 3'600, Position 81
  - «spiegel für schminktisch» 2'900, Position 65
  - «schlafmaske» 2'400, Position 66
  - «fotodrucker» 1'900, Position 57
  - «kleiderständer holz» und Varianten ~3'000, Position 48–53
- Nahe dran (≤ 40, ≥ 200 Suchen):
  - schrank organizer (33)
  - swatch uhren herren (23)
  - bluetooth tastatur (34)
  - handtuchhalter ohne bohren (36)
  - neckholder-kleid (35)
  - edelweiss shirt (33/36)
- Nebenbefunde:
  - Eine Varianten-URL mit `?variant=…&country=CH&currency…` ist indexiert («hohe sneaker»).
  - Ein Handle ist zerbrochen: «…fur-alle-au-er-der-ersten-generat…» (ß).

## Nächste Schritte

1. **Betreiber-Klick (kostenlos):** In OpenSEO Search Console und GA4 verbinden: https://app.openseo.so/p/443c940c-93c9-4feb-9d0c-1e4d1d88c6cf/settings/integrations
   - Danach liefern `get_search_console_performance` und `get_search_opportunities` echte Daten ohne Credits: Positionen 4–20 mit GA4-Umsatz.
   - Das ist wertvoller als jede Schätzung.
2. **Klasse für die nächste Verbesserungsrunde:** Für die grossen, kaufnahen Begriffe gibt es keine passende Kollektion. Google zeigt dann ein einzelnes Produkt auf Seite 6+.
   - Aufgabe: Kollektionen mit Titel, H1 und Text auf den Begriff bauen (Handstaubsauger, GPS-Tracker, Schminkspiegel, Schlafmaske, Fotodrucker, Holz-Kleiderständer).
   - Danach in 4 Wochen nachmessen.
3. **Credits sparsam:**
   - Domain-Übersicht 14 Credits; die Keyword-Liste kostet pro Abruf.
   - Keyword-Recherche ~54 Credits je Startbegriff.
   - Ab 2'000 Credits je Paket fragt die Session vorher den Betreiber (OpenSEO-Regel).

## Nachtrag 10.10. ~08:55 UTC

- **Search Console ist in OpenSEO verbunden** (`get_search_console_performance` → ok, Property `https://luxestyle.ch/`).
- **Audit-Crawler-Zugang:** Shopify lässt Crawler nur mit Signatur durch (Onlineshop → Einstellungen → Crawler-Zugang). Die Signatur
  wurde per Admin-API erzeugt (`storefrontCrawlerSignatureGenerate`, Version `unstable`, Name «OpenSEO Audit», Domain luxestyle.ch).
  Die Gültigkeit ist **auf 90 Tage begrenzt** (1 Jahr wurde abgelehnt: «cannot exceed 90 days»), sie **läuft am 08.01.2027 ab**.
  Die Werte stehen NICHT im Repo; sie wurden dem Betreiber zum Einfügen in OpenSEO gegeben.
  Erneuern: dieselbe Mutation mit `timeToLive: 7776000`, Werte in OpenSEO → Settings → Crawler access einfügen.
- Idee: Mit einer eigenen Signatur könnten auch unsere Prüfwerkzeuge die echte Storefront sehen, statt der stundenalten
  Bot-Cache-Kopie (CLAUDE.md «von unserer IP aus nicht prüfbar»). Das ist noch nicht gebaut.

## Erster Audit 10.10. 08:59–09:11 UTC (0 Credits, Guthaben weiter 430)

- **Die Crawler-Signatur wirkt:** 35 Seiten mit HTTP 200, keine «blocked». Nach 35 Seiten kam ein 429 (Shopify-Drossel,
  `/collections/jeans-denim`), der Audit endete dort. Auch mit `curl` und denselben Kopfzeilen kommt die echte Seite.
- **Befunde, die zählen:**

| Befund | Ursache | Getan |
|---|---|---|
| Startseite (Google-Text) und Fusszeile jeder Seite: «Versand nur in der Schweiz» | Liechtenstein ist seit 09.10. Lieferland. Die Wache von gestern las Seiten + Richtlinien, **nicht das Theme** | 4 Stellen in `meta-tags.liquid` + `footer-group.json` → «in die Schweiz und nach Liechtenstein» (bei /collections/all: «in der Schweiz gratis ab CHF 50», LI hat keinen Gratisversand). Live per curl geprüft |
| `/pages/alle-kategorien`: Beschreibung 323 Zeichen mit «Kostüme &amp;amp; Fasnacht» (auch og:description) | Seite ohne SEO-Text → Shopify nimmt einen Auszug aus dem Inhalt, der kommt **zweifach** escaped. Die Formel vom 09.10. klappt nur einmal zurück | SEO-Text gesetzt (155 Z.); im Theme `LUX-META-DOPPEL` (meta + og) klappt «&amp;amp;» einmal ein |
| `/blogs/ratgeber` ohne Beschreibung | Blogs hatten nie `global.description_tag` | Ratgeber (152 Z.) + Magazin (142 Z.) gesetzt |
| — (beim Nachzählen) | `tiktok-callback` und `merkliste` öffentlich ohne Inhalt | `seo.hidden = 1` (noindex, aus der Sitemap) |

- **Nur Info, nicht angefasst:**
  - Überschriften springen (30 Seiten, H1 → H3): kommt aus dem Theme-Raster.
  - 5 Titel über 60 Zeichen: der Zusatz « – LuxeStyle» zählt mit.
  - Emoji-Adressen werden kanonisch klein geschrieben (`%f0` statt `%F0`): ist dieselbe Adresse.
  - Eine langsame Antwort (1,8 s).
- **Nebenfund:** Shopify `shop.description` verspricht weiter «Versand … nach Deutschland». Ändern kann das nur der Betreiber,
  `COWORK-BEFEHL.md` Punkt 5 hat den neuen Text (CH + LI, 147 Zeichen).

**Wächter:**
- `liefergebiet_text_wache.py` liest jetzt auch die 429 Theme-Dateien (Kanarien: die 4 alten Stellen werden gefunden; jetzt 0 Befunde).
- `meta_beschreibung_escape.py --pruefen` (Kanarien 4/4) meldet fehlendes `LUX-META-DOPPEL` und veröffentlichte Seiten oder Blogs ohne SEO-Text.
- Beide laufen täglich im Aufseher.
- **Offen:** 219 von 328 Ratgeber-Artikeln haben keinen eigenen SEO-Text. Google bekommt dann die ersten 320 Zeichen des
  Artikels, zum Beispiel «Der Sommer 2026 steht vor der Tür …» im Oktober. Das ist ein Kandidat für die nächste Runde.

**Lehre:** Eine Wache für «Text X überall» muss alle Orte kennen, an denen Text steht: Seiten, Richtlinien, **Theme**
(Fusszeile, Meta-Texte, Ersatztexte), Shop-Feld. Die Messung vom 10.10. hatte das Theme ausgelassen, ein externer Crawler fand
es in 12 Minuten.
