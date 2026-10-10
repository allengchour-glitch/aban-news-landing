# OpenSEO verbunden — erster Stand (10.10.2026, Betreiber «openseo verbunden»)

## Eingerichtet (ohne Credits)

- Konto: hosted, **500 Credits** zu Beginn, nach der Übersicht (14) und der Keyword-Liste (28) noch **458**.
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
