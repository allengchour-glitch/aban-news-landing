# Katalog: Taschen in zwei falschen Kategorien — 07.10.2026 21:30 UTC

Betreiber: «verbessere katalog und fein katalog?»

## GEMESSEN (Bulk-Export 15:09, 50'914 aktive)
`kategorie_fein.py` hatte nichts mehr zu verfeinern (36'135 «gleich»), aber **9'661 «anderer Zweig»**: Shopify- und
Google-Kategorie widersprechen sich. Aufgeschlüsselt: 2'755 einig (Shopify feiner), 2'351 gleiche Oberklasse,
**4'555 anderer Hauptzweig**. Grösstes Paar: **2'028 × Shopify «Luggage & Bags» ↔ Google «Handbags»**.
| Ware (Titelwort) | Anzahl | falsches Feld |
|---|---:|---|
| Rucksack | 575 | Google |
| Umhänge-/Schulter-/Crossbody-Tasche, Clutch | 504 | Shopify |
| Reise-/Sporttasche, Weekender | 176 | Google |
| Geldbörse, Kartenetui | 115 | beide (Google Handbags, Shopify Gepäck) |
| Laptop-/Aktentasche, Messenger | 75 | Google |
| Gürtel-/Bauch-/Hüfttasche | 65 | Google |
| Koffer | 15 | Google |
| ohne eindeutiges Wort | 497 | bleibt (nie raten) |

## GETAN
1. **Google** (`google_kategorie_umzug.py`, neuer Regelblock `HB`): Rucksack → Backpacks, Reise-/Sporttasche → Duffel
   Bags, Akten/Laptop → Briefcases, Messenger → Messenger Bags, Gürteltasche → Fanny Packs, Koffer → Suitcases,
   Kulturbeutel → Cosmetic & Toiletry Bags, Geldbörse/Kartenetui → Wallets & Money Clips. Ausschlüsse: Hunde-/Baby-
   Trage, Kleidung mit «Rucksack-Schnalle», Kofferraum-Organizer, Einkaufstrolley, «Umhängetasche … und Bauchtasche».
   Kanarien 84/84. **SCHARF: 1'051 umgezogen, 0 Fehler.** Läuft täglich im Aufseher (Neuimporte).
2. **Shopify** (`kategorie_fein.py`): verfeinert die Gepäck-Ware jetzt in die Unterklasse (Backpacks 582, Duffel 107,
   Fanny 68, Messenger 43, Briefcases 31, Suitcases 28). Neue Ausnahme `KREUZ`: Zweigwechsel «Luggage & Bags →
   Handbags/Wallets» NUR, wenn Google und ein Pflichtwort im Titel übereinstimmen (Umhänge…, Clutch, Geldbörse …;
   Fahrzeugtaschen ausgeschlossen nach Stichprobe «Motorrad-Satteltasche»). Tests 5/5, Selbsttest 24/24.
   Trockenlauf mit frischem Export: 1'641 verfeinerbar (652 über KREUZ). Ergebnis SCHARF: siehe Nachtrag.

## WIRKUNG
Der Filter «Kategorie» in der Suche und den Kollektionen, die Google-Gratis-Einträge (Backpacks statt Handbags) und
Shopifys KI-Katalog (ChatGPT/Copilot lesen die Shopify-Kategorie) zeigen Taschen jetzt dort, wo Kunden sie suchen.

## OFFEN
8'116 «anderer Zweig» bleiben. Nächste grosse Paare (Export 15:09): Elektronik ↔ Ferngesteuertes Spielzeug (300,
Drohnen), Elektronik ↔ Kameras (151), Elektronik ↔ Klimageräte (90, Ventilatoren). Gleiche Methode: Wortliste → beide Felder.
