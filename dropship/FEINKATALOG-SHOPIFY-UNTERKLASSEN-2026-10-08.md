# Feinkatalog: 8'279 Produkte in Shopifys Unterklassen (08.10.2026, 14:40–16:00 UTC)

Betreiber 08.10.: «weiter feinkategorie verbessern».

## GEMESSEN (Export 51'683 aktive, Blatt-Prüfung gegen beide Taxonomien)
- **Google:** 45'239 stehen auf einem Blatt, 6'444 auf einer Klasse mit Unterklassen. Die grössten Reste sind Storage 473,
  Tools 387 und Pet Supplies 351; daran arbeiten die bestehenden Wächter (Umzug, Oberklassen-Lernen, KI).
- **Shopify:** **27'897** stehen auf einer Klasse MIT Unterklassen. Die grössten: Clothing Tops 4'671 · Backpacks 1'651 ·
  Costumes 1'589 · Handbags 880 · Pants 772 · Power Adapters & Chargers 742 · Pet Collars & Harnesses 733 · Pet Leashes 727 ·
  Coats & Jackets 715 · Shoes 708 (Rest von heute Morgen) · Pet Bowls 544 · Rings 495 · Pillows 250.
- **Warum das liegen blieb:** Google hat unter «Shirts & Tops», «Pants», «Outerwear», «Pet Leashes» und ähnlichen Klassen kein
  feineres Blatt. `kategorie_fein` verfeinert nur über den Google-Weg und kommt dort deshalb nie weiter. Gleiche Lage wie bei den
  Schuhen heute Morgen. Der Shop-Filter «Kategorie» konnte so Hoodies nicht von Blusen trennen und Powerbanks nicht von
  Autoladegeräten.
- **Bewusst NICHT angefasst:** Ringe (Unterklassen sind nur Ehe-/Verlobungsringe; ein Modering steht richtig auf «Rings»).
  Rucksäcke (Schule/Wandern/Laptop/Militär; ein Mode-Rucksack steht richtig auf «Backpacks»). Kostüme (nicht im Google-Kanal).
  Kunstnägel (Unterklassen Tips/Wraps passen nicht zu Press-on-Sets).

## GETAN
- **EIN Werkzeug + EINE Regeldatei:** `automation/shopify_fein.py` + `automation/data/shopify_fein.json`. Je Elternklasse
  gibt es einen Ausschluss («nicht» → bleibt grob), Titelregeln (die erste gewinnt) und Kanarien aus echten Titeln. Angefasst
  wird nur, was GENAU auf der Elternklasse steht; Google bleibt unverändert. Eine neue Klasse ist ein JSON-Block, kein neues Skript.
- **Gefangene Fallen** (alle als Kanarie hinterlegt, **164/164**): «Saug**napf**» ≠ Napf · «**Tote**nkopf» ≠ Tote Bag ·
  «Sweater**kleid**» rutscht an `\bkleid` vorbei · «Jacke mit Kapuze» ≠ Hoodie · «Body Chain» = Schmuck ·
  «Crewneck T-Shirt» ≠ Sweatshirt · «Jeans-Top»/«Jeans-Schürze» ≠ Jeans · Rollleine «mit Automatikbremse» (Shopify hat dafür
  keine Klasse → bleibt) · PS5-Controller-Station, Akku- und E-Fahrzeug-Ladegeräte, Solar-Lader, Starthilfe-Powerbank sind
  keine Handy-Ladegeräte · Shopifys «Sport Jackets» ist ein Sakko, keine Outdoorjacke → nie als Ziel.
- **Stichproben vor dem Schreiben:** 200 Zufallstitel aus 5 Klassen + 100 aus 4. Fehler fanden sich nur bei den Ladegeräten
  (6/40); sie sind nachgeschärft.
- **Geschrieben: 8'279 gesetzt / 0 Fehler.** Die Klassen: Oberteile 4'171 (Hemden, T-Shirts, Pullover, Hoodies, Blusen, Strickjacken,
  Polos, Tops …), Hosen 718, Handtaschen 683, Halsbänder/Geschirre 667, Leinen 606, Ladegeräte 498, Näpfe 460, Jacken/Mäntel 367,
  Kissen 109. **Rücklesen 30/30 + 12/12** (Kategorie gesetzt, Google unverändert). Die Live-Zählung je Elternklasse
  (`productsCount category_id:…`) stimmt mit dem Rest des Laufs überein.
- **Schreibweg Bulk:** Einzeln liefen nur **20 Produkte/min**, weil ein Lese-Scan (`textbild_fix`) den Eimer bei ~120/2000 hielt;
  für 8'279 Produkte wären das ~7 h bei stündlichem Container-Neustart. `shopify_fein.py` nimmt deshalb ab 200 Produkten eine
  Bulk-Mutation (`productUpdate(category)` per JSONL), die keinen Eimer kostet: 8'090 in einem Lauf. Der Lauf wird über die
  EIGENE ID verfolgt (`node(id:)`, Lehre 07.10.), jede Ergebniszeile wird geprüft.
- **Wächter:** täglich in der Kategorie-Kette des Aufsehers (nach `spielzeug_trennung`), erfasst damit auch Neuimporte.

## Nachher
| Messgrösse | vorher | nachher |
|---|---:|---:|
| Shopify auf Klasse mit Unterklassen (aktiv) | 27'897 | **~19'618** |
| Clothing Tops grob | 4'671 | **500** |
| Pants grob | 772 | **54** |
| Pet Collars & Harnesses grob | 733 | **66** |
| Pet Bowls grob | 544 | **84** |
| Pet Leashes grob | 727 | **121** |
| Handbags grob | 880 | **204** (davon 7 Neuimporte seit dem Export) |
| Power Adapters & Chargers grob | 742 | **244** |
| Coats & Jackets grob | 715 | **348** (Biker-, Leder-, Outdoor-, Fleecejacken: keine passende Shopify-Klasse) |
| Pillows grob | 250 | **141** (Kopfkissen ohne Sonderform: bleibt richtig grob) |

## OFFEN
- Nächste Kandidaten: Activewear 260 (Sport-BH, Sporthosen, Sport-Tops), Pet Supplies 407 (oberste Haustierklasse),
  Storage & Organization 484, Hardware > Tools 387, Arts & Entertainment 251 (Sticker; Printful setzt sie zurück, siehe
  `rueckfall-grob`).
- Kein Betreiber-Klick nötig.
