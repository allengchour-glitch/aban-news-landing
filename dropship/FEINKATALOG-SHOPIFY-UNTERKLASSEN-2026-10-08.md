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

## Runde 2 (08.10.2026, 16:20–17:30 UTC, Betreiber «weiter»)

**GEMESSEN** (frischer Export 51'701 aktive): Auf einer Shopify-Klasse mit Unterklassen stehen noch 20'561 Produkte. Darin
924 Hemden, die richtig auf «Shirts» stehen; darunter gibt es nur Henley und Dress Shirts.

**GETAN:** 15 weitere Klassen in derselben Regeldatei. Vier Helfer entwarfen je Klasse die Regeln aus den echten Titeln, mit
Kanarien, Stichproben über mehrere Seeds und Gleichlauf py = js mit 0 Abweichungen. Danach habe ich jede Klasse an
Zufallsstichproben selbst geprüft. Nachgeschärft: Bügelfreie **Kurzarm**hemden sind keine Dress Shirts. Der Schreibweg setzt jetzt
NUR die Shopify-Kategorie; die Kostüme haben bewusst keinen Google-Wert, die alte Fassung übersprang deshalb 1'557 von ihnen.
**Kanarien gesamt 510/510.**

**Geschrieben: 1'839 gesetzt / 0 Fehler (Bulk), Rücklesen 30/30.**

| Klasse | grob vorher | eingeordnet | bleibt grob |
|---|---:|---:|---:|
| Rucksäcke | 1'651 | 400 (Laptop 221, Wandern 78, Schule 69, Militär 32) | 1'251 Mode-Rucksäcke (richtig) |
| Sportbekleidung | 260 | 232 (Hosen 195, Tops 18, Bodys 10, Jacken 6, BH 2, Hoodie 1) | 28 |
| Hundekleidung | 235 | 196 (Pullover 95, Jacken 32, Mäntel 31, Regen 8 …) | 39 |
| Kostüme | 1'589 | 168 (Tops 53, Overalls 40, Umhänge 39, Sets 25, Kleider 11) | 1'421 (kein Formwort im Titel) |
| Velozubehör | 175 | 167 (Licht 140, Taschen 26, Halter 1) | 8 |
| Lidschatten | 175 | 163 (Paletten 140, flüssig/Stift 22, Glitzer 1) | 12 |
| Portemonnaies | 163 | 151 (Geldbörsen 114, Kartenetuis 32, Münzbörsen 4, Reise 1) | 12 |
| Katzenspielzeug | 175 | 145 (interaktiv 56, Bälle 52, Federn 9, Katzenminze 9 …) | 30 |
| Hundebedarf | 160 | 47 (Spielzeug) | 113 (Fremdware: Autogurte, Gehhilfen, Schleckmatten) |
| Hemden | 924 | 43 (Business/Anzug) | 881 Freizeithemden (richtig) |
| Nageldeko | 185 | 40 (Folien 17, Strass 16, Pinsel 6, Sticker 1) | 145 |
| Aufbewahrung | 484 | 39 | 445 |
| Sporttaschen | 139 | 28 (Gym) | 111 Reisetaschen (richtig) |
| Fitnessgeräte | 212 | 9 | 203 (Fremdware: Helme, EMS-Gurte, Camping) |
| Ringe | 495 | 6 (Verlobung 4, Ehe 2) | 489 Modeschmuck (richtig) |

**Nachbefunde (andere Zweige — `shopify_fein` zieht nur Eltern → Kind, nie über Zweige):**
- ~95 **Dirndl/Lederhosen/Trachten** stehen unter «Kostüme»; richtig wäre «Traditional & Ceremonial Clothing».
- Die meisten **«Nagelsticker»** in «Nail Art» sind laut Beschreibung **Press-on-Nägel** (Grössen XS–L, «10 Nägel + Kleber»), also «False Nails».
- «Fitnessgeräte» und «Hundebedarf» enthalten Fremdware (Helme, EMS-Bauchgurte, Autogurte, Gehhilfen).
Das sind Kandidaten für einen Zweig-Umzug mit eigener Regel (wie `google_kategorie_umzug` auf der Google-Seite).

**Stand nach Runde 2:** Von den 20'561 groben Shopify-Klassen sind 1'839 verfeinert, also ~18'700. Davon ist ein grosser Teil
richtig grob (Mode-Rucksäcke, Modeschmuck-Ringe, Freizeithemden, Reisetaschen, Kostüme ohne Formwort).
