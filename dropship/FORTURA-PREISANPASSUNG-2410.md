# Fortura/Widmann: Preisanpassung der Artikel über 2× (24.10.2026)

Auftrag des Besitzers: nur die 12 Artikel mit Aufschlag über 2× anpassen, ohne Verlust.
Geändert: **9 Artikel**, alle Varianten, per frischer Lesung nachgeprüft. Alt/neu/Marge: `FORTURA-PREISANPASSUNG-2410.csv`.

**Regel:** neuer Preis = (Einkauf + CHF 0.30) / 0.971 + CHF 1.00 Puffer, aufgerundet auf x.90.
Der Einkauf ist das Shopify-Feld `unitCost`; 0.971 und 0.30 sind die geschätzte Zahlungsgebühr (2.9 % + 0.30).
Die Fracht von Fortura zur Kundin ist darin nicht enthalten (unbekannt). Die Marge pro Stück sank
von CHF 3.2–9.3 auf CHF 1.0–1.7.

**Nicht geändert (3):** `waggishose-kurz-gelb-fgss90123`, `waggishose-kinder-kurz-blau-fgss90128`,
`kinder-waggishose-kurz-gelb-fgss90124`. Die Galaxus-Treffer tragen fremde Titel (Astronautenhelm,
Strumpfhose); der Vergleich ist dort falsch zugeordnet.

**Grenze, wichtig:** Der Galaxus-Preis liegt bei allen 12 UNTER unserem Einkauf (z. B. Stulpen 8.50
gegen Einkauf 15.57). Ohne Verlust ist ein Gleichziehen nicht möglich; die neuen Preise liegen
weiter etwa 1.7–2.1× über Galaxus. Mehr Spielraum gibt nur ein günstigerer Einkauf.
Zurücksetzen: Spalte `alt` der CSV.
