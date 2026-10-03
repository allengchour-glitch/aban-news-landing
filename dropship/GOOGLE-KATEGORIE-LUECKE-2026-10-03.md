# Google-Produktkategorie: 32 Lücken geschlossen (03.10.2026, Betreiber schickte den Bulk-Editor-Link der Google-App)

## GEMESSEN (Bulk-Export, 50'486 aktive Produkte)
- 48'715 aktive Produkte sind im Kanal «Google & YouTube». **32** davon hatten kein `mm-google-shopping.google_product_category`.
- Ursache: Der Grind legt neue Produkttypen an, die der Kategorie-Setzer nicht kennt. 22 der 32 haben den Typ «Büro & Home Office»; sonst kamen Aufbewahrung 3, Spass-Elektronik 2, Trend-Produkt 1, Beauty 1 und Fortura-Partyware 3 vor, letztere unter dem falschen Typ «Kostüme».
- Ausserdem gemessen: 752 Google-Produkte haben nur 1 Bild (Scorecard-Punkt «Images per offer»), 0 Produkte haben gar kein Bild.

## GETAN
- Alle 32 von Hand gesetzt und zurückgelesen (32/32). Für jedes Produkt einzeln der passende Google-Pfad, zum Beispiel:

  | Produkt | Google-Pfad |
  |---|---|
  | Anatomiemodelle | Medical Teaching Equipment |
  | Aktenvernichter | Paper Shredders |
  | Tastenkappen | Input Devices |
  | 3D-Filament | 3D Printer Accessories |
  | Stifte und Marker | Writing & Drawing Instruments |
  | Wurfdose und Einlassbänder | Party Supplies, nicht Kostüme |

- Regel für den nächsten Neuimport: `NACH_TYP["Büro & Home Office"] = "Office Supplies"` in `google_kategorie.py` und `google_kategorie.mjs` (Importer und Nachtrag sagen dasselbe). Feinere Pfade setzt danach `google_fein_ki`.

## OFFEN
- 752 Produkte mit nur einem Bild: `cj_bild_backfill` arbeitet daran (Plan-Tag 6).
- Neue Grind-Typen tauchen in der Ampel als «unbekannte Typen 29» auf (Trend-Produkt, Büro & Home Office, Trend-Gadget). Für Trend-* gibt es bewusst keinen Typ-Pfad, weil das Sammelkörbe sind.
