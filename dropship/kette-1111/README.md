# Kubanische Gliederkette: Titel, Text und Auswahl nach dem CJ-Datenblatt (11.11.2026)

Produkt `kubanische-gliederkette-mit-strass-45-cm-629400` (Bestellung #1039 am 08.11., Ausführung «Silber / 24inch»).

## Befund (GEMESSEN 11.11. ca. 11:30 UTC)

- Titel «Kubanische Gliederkette mit Strass, 45 cm», SEO «… 45 cm lang.», Text «Sie hat eine Länge von 45 cm», Stichpunkte «45 cm lang» und «In Gold erhältlich».
- Auswahl «Grösse» mit `8inch`, `18inch`, `20inch`, `24inch`, dazu «Farbe» Gold und Silber (8 Varianten, CHF 22.90 bis 27.90).
- CJ-Datenblatt (pid `2512250953081629400`): Gold und Silber je 8inch (20cm), 18inch (45cm), 20inch (50cm), 24inch (60cm). Die Seite nannte also eine von vier Längen und eine von zwei Farben.
- Bei #1039 wurde 24inch (60 cm) gewählt; CJ liefert nach SKU `CJSL269105308HS`, also 60 cm. Die Seite hatte daneben «45 cm» gesagt. Kommt eine Rückfrage, ist das der Grund.

## Geändert (LIVE 11.11. 11:35 UTC, zurückgelesen, Storefront HTTP 200 geprüft)

- Titel und SEO-Titel «Kubanische Gliederkette mit Strass, 20 bis 60 cm», SEO-Beschreibung mit Farben und Längen.
- Drei Textstellen: Länge wählbar 20, 45, 50 oder 60 cm (die kürzeste entspricht einer Armbandlänge), «Längen 20, 45, 50 und 60 cm», «In Gold und Silber erhältlich».
- Option «Grösse» heisst «Länge», Werte «20 cm», «45 cm», «50 cm», «60 cm».
- Unverändert: Handle, Varianten, SKUs, Preise, Bilder. Das Skript prüft vor dem Schreiben, dass jede SKU zu ihrer Länge passt.

Rücknahme: `ZURUECK=1 LIVE=1 node dropship/kette-1111/apply.mjs` (Sicherung `sicherung.json`).

## Offen

Dieselbe Fehlerart (Titel nennt ein Mass, die Auswahl bietet mehrere, Werte in Zoll) ist katalogweit nicht gemessen.
