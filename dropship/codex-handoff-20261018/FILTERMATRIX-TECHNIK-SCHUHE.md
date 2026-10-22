# LuxeStyle: Filtermatrix für den Pilot

Stand: 22.10.2026, Entwurf zur Freigabe. Keine Shopify-Änderung ausgeführt.

## Ziel

Die Kategorien «Technik & Gadgets» und «Schuhe» sollen nicht mehr als lange gemischte Produktlisten erscheinen. Die Filterwerte werden aus verifizierten kundenrelevanten Produktattributen aufgebaut. Interne Automations-Tags bleiben unsichtbar.

## Pilot A: Technik & Gadgets

| Filtername im Shop | Interner Attributschlüssel | Erlaubte Werte |
|---|---|---|
| Produktart | product_type_public | Foto & Drucker, Handy-Zubehör, Audio, Smart Home, Gaming, Ladegerät |
| Verwendung | use_case | Drucken, Fotografieren, Laden, Hören, Beleuchten, Organisieren |
| Kompatibilität | compatible_device | Smartphone, Tablet, USB-Gerät, Bluetooth-Gerät, universell |
| Verbindung | connectivity | Bluetooth, USB, kabellos, Netzbetrieb |
| Stromversorgung | power_source | Akku, USB, Netzstecker, Batterie |
| Preis | price | unter CHF 25, CHF 25–50, über CHF 50 |
| Farbe | color_public | Schwarz, Weiss, Grau, Rosa, Grün, Mehrfarbig |
| Verfügbarkeit | availability | verfügbar, nicht verfügbar |

Für den Paperang-Artikel sind aus dem aktuellen Nachweis nur «Foto & Drucker», «Drucken», «Smartphone», «Bluetooth», «ohne Tinte» aus der Produktbeschreibung und die CHF-Preisstufe belastbar. «Ohne Tinte» wird erst als Filter verwendet, wenn dieses Attribut für die Kategorie einheitlich geprüft wurde.

## Pilot B: Schuhe

| Filtername im Shop | Interner Attributschlüssel | Erlaubte Werte |
|---|---|---|
| Schuhart | shoe_type | Sneaker, Hausschuhe, Sandalen, Boots, Pumps, Ballerinas, Sportschuhe, Wanderschuhe |
| Zielgruppe | audience | Damen, Herren, Kinder, Unisex |
| Grösse | shoe_size | nur Werte, die beim Produkt tatsächlich gepflegt sind |
| Saison | season | Frühling, Sommer, Herbst, Winter, ganzjährig |
| Einsatzbereich | use_case | Alltag, Büro, Sport, Outdoor, Zuhause, Reise |
| Verschluss | closure | Schnürung, Klettverschluss, Reissverschluss, Slip-on |
| Farbe | color_public | normalisierte Farbliste |
| Preis | price | unter CHF 50, CHF 50–100, über CHF 100 |
| Verfügbarkeit | availability | verfügbar, nicht verfügbar |

Material, Sohle, Absatzhöhe und Weite erscheinen nur, wenn die jeweilige Angabe bei der konkreten Produktgruppe vollständig und belegbar gepflegt ist. Fehlende Werte werden nicht durch Vermutungen ersetzt.

## Nicht sichtbare Werte

Folgende Werte dürfen niemals als Kundenfilter erscheinen:

- cj-real
- dropship
- rueckhol
- auswahl-offen
- video-hit
- viral
- marge-verlust
- nicht-versendbar

Der Tag rueckhol bleibt ein Ausspielungsschutz. Er wird weder entfernt noch in einen Kundenfilter übersetzt.

## Anzeige- und Sortierregeln

1. Filter nur anzeigen, wenn mindestens ein Produkt der aktuellen Unterkategorie einen gültigen Wert besitzt.
2. Leere Werte, reine Internwerte und Dubletten ausblenden.
3. Mehrfachauswahl innerhalb eines Filters erlauben, etwa «Bluetooth oder USB».
4. Filter verschiedener Gruppen kombinieren, etwa «Foto & Drucker + Smartphone + unter CHF 50».
5. Standard ist «Relevanz». «Bestseller» wird erst nach aktuellem Bestellnachweis verwendet.
6. Mobile Darstellung als Filter-Schublade mit aktiven Filter-Chips und «Alle zurücksetzen».
7. Nach einer Filterwahl die Trefferzahl anzeigen; unbekannte Daten nicht als null Treffer darstellen.

## Umsetzung als freigabefähiger Pilot

1. Bestehende Search-&-Discovery-Filter und Produktattribute für genau diese beiden Kategorien lesen.
2. Nur vorhandene, belegte Werte in die Matrix übernehmen.
3. Fehlende Attribute als Datenbereinigungsbedarf markieren, nicht automatisch ergänzen.
4. Die Produktgruppe «Technik & Gadgets» und die Schuh-Unterkategorie getrennt testen.
5. Vorher/Nachher mit drei Suchfällen prüfen:
   - «paperang» → Paperang-Produkt
   - «Bluetooth Drucker unter CHF 50» → nur passende Produkte
   - «Schuhe Damen Grösse 39» → nur Produkte mit belegter Grösse 39
6. Erst nach Freigabe Search-&-Discovery- oder Theme-Einstellungen ändern.

Dieser Entwurf aktiviert keinen Filter, ändert keine Tags, löscht keine Collection und schreibt nichts in Shopify.
