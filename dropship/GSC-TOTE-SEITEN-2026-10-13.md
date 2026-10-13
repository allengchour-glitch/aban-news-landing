# Tote Google-Seiten über die Search Console abfangen (13.10.2026, Messrunde Richter Platz 1)

## Befund (GEMESSEN, Messrunde + Skeptiker)
- Shopify zählt Landungen auf einer 404-Seite **nicht** als Sitzung. `tote_landeseiten.py` las nur ShopifyQL und sah
  deshalb genau die Seiten nie, die schon tot waren, als Google-Besucher kamen.
- Search Console (Daten erst seit 04.10., also 7 Tage): 912 Seiten, davon 893 Produktseiten. Mit Signal (≥ 1 Klick oder ≥ 3 Impr./Woche): 208.
- Davon nicht mehr aktiv und ohne ShopifyQL-Sitzung: **44**. 11 hatten schon eine 301, **33 nicht**.
- Ehrliche Erwartung: Hygiene am einzigen Kanal mit Käufen, ≈ 0 Käufe in 6 Wochen (**VERMUTUNG**).

## Gebaut
- `automation/tote_landeseiten.py`:
  - `GSC=1` liest `dropship/_gsc_seiten.json`. Ist der Schnappschuss älter als 3 Tage, wird der Teil übersprungen und laut gemeldet.
  - Erfasst werden `/products/` und `/fr/products/`, Handles werden decodiert.
  - Die Status werden in Paketen zu 40 Handles abgefragt.
- **Strengere Zielwahl für GSC-Funde** (`zielwahl_gsc`):
  - Zwilling nur über das bestehende `ersatz()` (≥ 0,70, kein neues langes Wort).
  - Klingen nie.
  - Kategorie nur über ein Warenwort aus `TITEL_ZIEL`, und der erste Treffer entscheidet. Die Zielkollektion darf höchstens 3'000 aktive Produkte haben (`sub-haustier` 3'704, `damen-mode` 10'344 → offen).
  - Höchstens `GSC_MAX` 50 neue 301 je Lauf.
- **Feinere Ziele in `TITEL_ZIEL`** (gelten für beide Quellen):
  - Futterspender, Futterautomat und Trinkbrunnen → `haustier-napf-futter` (540).
  - Heizdecke → `kuschel-heizdecken`.
  - Pilzsammel… → `outdoor-garten`. Vorher führte der Tag «haushalt» auf Haushaltsgeräte.
  - Powerbank → `handy-powerbanks`. Das alte Ziel `ladegeraete-powerbanks` **gibt es nicht**, der Eintrag lief ins Leere.
- **Eimer-Etikette** im gql-Helfer des Skripts. Sie fehlte bisher.
- **Kanarien** `--kanarien`, 9/9, live gegen die Zielwahl:
  - Futterspender → Napf-Kollektion, nie Trinkbrunnen.
  - Mini Heizlüfter → offen, nie Luftbefeuchter.
  - Anti-Bell-Halsband → offen.
  - Damast-Küchenmesser → offen (Klinge).
  - Smaragd-Anhänger → Halsketten, nie der Leopard-Anhänger.
  - Titan-Wok → offen.
  - Aroma-Diffusor mit Lautsprecher → Diffusor-Kategorie, nie der Uhr-Lautsprecher.
  - Planeten-Schaukelstuhl → offen.
  - USB-Heizdecke → Heizdecken.
- **Werkzeug `tools/gsc_schnappschuss.py`**: wandelt die OpenSEO-Antwort in den Schnappschuss um. Es bricht ab bei `hasMore`, damit kein unvollständiger Stand entsteht.
- **Aufseher:** täglicher Aufruf jetzt `GSC=1 FIX=1`.
- **Ampel `gsc_tot()`:** meldet, wenn der Schnappschuss älter als 3 Tage ist.
- **Runbook:** feste Zeile «einmal täglich GSC-Schnappschuss» (`dropship/AUTONOMER-MODUS.md`).

## Lauf 13.10.
- Einzeltest: `/products/usb-heizdecke-12v` (1 Klick/Woche) → `/collections/kuschel-heizdecken`.
  - WebFetch: deutsche Adresse und `/fr/`-Adresse landen beide auf der Kollektion. Shopify wendet die 301 auch auf den Sprachpfad an, eine eigene `/fr/`-301 ist nicht nötig.
- Scharf: **9 GSC-Weiterleitungen**:
  - Heizdecke
  - 3D-Hologramm-Ventilator (Zwilling 0,82)
  - Akupressur-Matte (Zwilling 1,00)
  - 2 Katzen-Futterspender → Napf/Futter (23 + 37 Impr./Woche)
  - 2 Tastaturen → Gaming
  - Solar-Powerbank → Powerbanks
  - Sternenhimmel-Projektor → Leuchten
  
  Dazu kommt 1 ShopifyQL-Fall (Pilzsammel-Set → Outdoor & Garten).
- **Offen 24** (148 Impr./Woche, 3 Klicks): ohne strenges Ziel, Liste in `dropship/TOTE-LANDESEITEN.md`, ein Mensch entscheidet.

## Nachmessen
- +7 T: neuer Schnappschuss. Ziel: keine tote Seite mit Signal ohne 301, ausser denen auf der Offen-Liste.
- +14–28 T: `inspect_urls` auf die Futterspender und den Ventilator → «Page with redirect».
- Erfolg nur an GSC messen, denn ShopifyQL zählt 404-Landungen nicht.
