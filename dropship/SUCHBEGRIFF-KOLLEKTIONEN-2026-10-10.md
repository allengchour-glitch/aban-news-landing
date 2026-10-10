# Kollektionen für grosse Suchbegriffe (10.10.2026, «weiter» nach OpenSEO)

## Gemessen

- **OpenSEO** (DataForSEO, Schätzwerte, `dropship/OPENSEO-START-2026-10-10.md`): 97 der 100 Treffer mit dem meisten Verkehr sind Produktseiten auf Position 41–100.
- Zu grossen, kaufnahen Begriffen zeigt Google ein einzelnes Produkt auf Seite 6–9, weil es keine Kollektion zum Begriff gab:

| Begriff | Suchen/Mt | Position |
|---|---|---|
| «handstaubsauger» | 5'400 | 72 |
| «gps tracker» | 3'600 | 81 |
| «spiegel für schminktisch» | 2'900 | 65 |
| «schlafmaske» | 2'400 | 66 |
| «kleiderständer holz» und Varianten | ~3'000 | 48–53 |

- **Search Console** (28 T, über OpenSEO, kostenlos): Ein einzelnes GPS-Ortungsgerät hatte 30 Impressionen auf Position 85. Die Nachfrage ist echt.
- **Bestand** (Voll-Export 10.10. 09:22, 52'442 aktive), gezählt über den Titel mit Ja- und Nein-Muster:

| Begriff | Treffer |
|---|---|
| Handstaubsauger | 19 |
| Schminkspiegel | 32 |
| Schlafmasken | 19 |
| Kleiderständer | 10 |
| GPS-Tracker | ~45 (siehe unten) |
| Fotodrucker | 6 |

## Getan

- **Regel `automation/data/suchbegriff_kollektionen.json`:** Je Kollektion gibt es einen Tag `such-…`, ein Ja-Muster und ein Nein-Muster auf den Titel (Nein schlägt Ja), dazu SEO-Titel, SEO-Text und Seitentext.
  - **Nein-Fälle aus dem Trockenlauf:**
    - Staubsauger-Roboter, Beutel, Dyson-Ladegerät
    - Nagelstaubsauger, Bohrstaubsauger
    - Spiegeluhr/-wecker, Powerbank mit Spiegel
    - Domino-Augenmaske (Kostüm), Kapuzenpullover mit Augenmaske, Augen-Pads «60 Stück», Latex-Augenmaske
    - Kinder-Kleiderständer, Garderobenhaken
  - **59 Kanarien** im Skript vor jedem Lauf.
- **Werkzeug `automation/suchbegriff_kollektionen.py`:**
  - Tags über den Bestand: +80 gesetzt, 0 falsch.
  - Kollektionen angelegt, mit Regel Tag = `such-…` und Sortierung «Bestseller», publiziert in denselben 8 Kanälen wie «hype-jetzt».

| Kollektion | Produkte | SEO-Titel |
|---|---|---|
| `/collections/handstaubsauger` | 19 | Handstaubsauger kabellos & mit Akku kaufen |
| `/collections/schminkspiegel` | 32 | Schminkspiegel mit LED & Vergrösserung |
| `/collections/schlafmasken` | 20 | Schlafmaske kaufen: Seide, 3D & mit Wärme |
| `/collections/kleiderstaender` | 10 | Kleiderständer & Garderoben aus Holz und Metall |

- **Seitentext:** Kurze Einleitung plus «Worauf achten?» mit 4 Punkten. Keine Heilaussagen und keine erfundenen Zahlen; Laufzeit und Masse «wenn der Hersteller sie angibt».
- **Live geprüft** (WebFetch): `/collections/handstaubsauger` zeigt H1 «Handstaubsauger», 19 Artikel, CHF 15.90–72.90 und den Text.
- **Interner Link:** `kategorien_verzeichnis.py` hat «Alle Kategorien» neu gebaut (380 Kategorien), alle 4 sind verlinkt.
- **Wächter:** Der Aufseher läuft täglich nach 06 UTC.
  - Neuimporte der letzten 2 Tage bekommen den Tag oder verlieren ihn.
  - Danach werden die Kollektionen angeglichen (Titel, SEO, Regel, Kanäle).
  - Trockenlauf über 1'001 Neuimporte: 0 Änderungen.

## Bewusst nicht

- **Fotodrucker:** Im Sortiment stehen nur Mini-Thermodrucker in Schwarz-Weiss. Die Suche «fotodrucker» meint Farb-Fotodrucker, eine Kollektion würde enttäuschen.
- **GPS-Tracker:** Erst nach der 2G-Prüfung (`dropship/MOBILFUNK-2G-2026-10-10.md`). In der Schweiz ist 2G seit Januar 2023 abgeschaltet. Eine Kollektion, die 2G-Tracker bewirbt, würde nicht funktionierende Geräte nach oben bringen.

## Offen

- **In 4 Wochen (~07.11.) nachmessen:** Positionen der 5 Begriffe (OpenSEO `get_ranked_keywords` oder Search Console).
- **Die nächsten Kandidaten** aus der Liste: «schrank organizer» (33), «bluetooth tastatur» (34), «handtuchhalter ohne bohren» (36), «neckholder-kleid» (35).
