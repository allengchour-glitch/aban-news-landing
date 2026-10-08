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

## Runde 2 (08.10.2026, 16:20–16:45 UTC, Betreiber «weiter»)

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
- Viele **«Nagelsticker»** in «Nail Art» sind laut Beschreibung **Press-on-Nägel** (Grössen XS–L, «10 Nägel + Kleber»), also «False Nails». *(Korrektur Runde 3: «die meisten» war geschätzt; gemessen sind es 51 von 145, über alle Nagelklassen 96.)*
- «Fitnessgeräte» und «Hundebedarf» enthalten Fremdware (Helme, EMS-Bauchgurte, Autogurte, Gehhilfen).
Das sind Kandidaten für einen Zweig-Umzug mit eigener Regel (wie `google_kategorie_umzug` auf der Google-Seite).

**Stand nach Runde 2:** Von den 20'561 groben Shopify-Klassen sind 1'839 verfeinert, also ~18'700. Davon ist ein grosser Teil
richtig grob (Mode-Rucksäcke, Modeschmuck-Ringe, Freizeithemden, Reisetaschen, Kostüme ohne Formwort).

## Runde 3 «ordne alles sauber ein» (08.10.2026, 16:55–17:50 UTC)

**GEMESSEN** (Export 16:21 + Ledger, dann frischer Export 17:03): 18'990 Produkte auf einer Shopify-Klasse mit Unterklassen, 6'457
bei Google auf einer Oberklasse, 76 Zweig-Widersprüche Google↔Shopify, 13 «keine Zuordnung», 3 ohne Shopify-Kategorie. Am 07.10.
waren die meisten Oberklassen schon einzeln beurteilt worden, aber **mit verbotenem Zweigwechsel**. Darum stand dort oft «bleibt»,
wo «falscher Zweig» die Antwort war: Fusspumpe für Autos unter Werkzeug, Feuerzeug unter Fitness, Haustierpullover unter
«Pet Supplies», Portemonnaie unter Handtaschen.

**Nebenbefund mit Folgen: der tägliche Kosmetik-Lauf hätte die Arbeit von heute zurückgesetzt.** `kosmetik_fein.lauf` (auch
`haar_fein`, `uhren_fein`, `rc_fein`) kannte nur «gleich». Eine feinere Shopify-Klasse, z. B. «Lidschatten-Paletten» unter
«Eye Shadow», galt als Abweichung und wäre am nächsten Morgen um 09:15 auf die Elternklasse zurückgesetzt worden. Dasselbe galt für
einen feineren Google-Wert. `shopify_fein` läuft in der Kette danach und hätte wegen seines Ledgers nicht nachgezogen. Betroffen
waren **262 Shopify- und 82 Google-Werte**. Behoben: Der Lauf vergröbert jetzt nie (`shopify-feiner`, `google-feiner`). Seine
Geräte-Wortfallen sind nachgeschärft: Porenreiniger-Gerät ≠ Reinigungsmittel, Gesichtsreinigungsgerät, Dampf, Wimpernkleber-
Entferner, Duschhauben-Set. Kanarien 98/98, **14 gesetzt / 0 Fehler**.

**GETAN**
| Schritt | Werkzeug | Ergebnis |
|---|---|---|
| Trachten aus «Kostüme» (Dirndl → Dirndls, Lederhose/Trachtenhemd/-bluse → Traditional Clothing, Kniestrümpfe, Ketten, Hüte, Tasche) | `shopify_fein` neuer Block «umzug» (Zweigwechsel nur ausdrücklich gelistet, wird beim Laden geprüft) | **91 / 0** |
| Press-on-Nägel, die CJ «Nagelsticker» nennt: Grössenoption XS–L oder starke Beschreibungsmerkmale (künstliche Nägel, Nagelstücke, Jelly-Kleber …); Feile/Alkoholtupfer zählen nicht | `nagel_fein.py` neu, Kanarien 12/12, Vorrang vor der Titelregel in `kosmetik_fein` | **96 → False Nails, 34 → Nail Stickers & Decals, 0 Fehler** |
| Einzelurteile über 6'054 Produkte (Google-Oberklasse + Widersprüche), **Zweigwechsel erlaubt**; 10 Prüfer, jeder Pfad gegen die Taxonomie geprüft | `kategorie_urteile_anwenden.py` (Runde 5) mit Schutzregeln und Regel-Vorrang; Midi-Röcke verworfen (Prüfer uneinig, Google kennt kein Midi), nichts gröber | 2'719 Urteile → **2'662 gesetzt / 0 Fehler, Rücklesen 30/30** (39 Regel-Vorrang, 18 inzwischen geändert) |
| Neu verschobene Produkte in die Shopify-Unterklassen | `shopify_fein` | **167 / 0** |
| 12 Google-Blätter ohne Shopify-Zuordnung, 2 Zweigpaare (Wassersport-Helm, Motorrad-Protektorenjacke), 3D-Drucker-Zubehör unter «3D Printers», Kinder-Pyjama/-Overall | `kategorie_fein` ZUSATZ / KREUZ / GLEICHWERTIG | **35 / 0** |
| Lerndaten der Oberklassen-Regeln um die neuen Urteile ergänzt (neues Urteil ersetzt altes zum selben Titel) | `data/oberklasse_training.jsonl` 16'351 → 18'045 | Gegenprobe **97,4 %** (≥ 95 % Pflicht), 221 Regeln |

Schreibweg: Die Urteile liefen zuerst einzeln mit ~25 Produkten pro Minute, weil ein Lese-Scan den Eimer belegte. Danach lief der
Rest als EINE Bulk-Mutation (`kosmetik_fein.bulk_schreiben`: Kategorie + Google-Metafeld in einem `productUpdate`). Die Probe
bestätigte, dass `productUpdate` das Metafeld per namespace/key überschreibt (gleiche ID). 2'587 Produkte in ~2 min.

**Nachher** (frischer Export 17:40 + Ledger)
| Messgrösse | vorher | nachher |
|---|---:|---:|
| Google auf Oberklasse | 6'457 | **4'194** |
| Shopify auf Klasse mit Unterklassen | 18'990 | **~17'630** |
| Zweig-Widerspruch Google↔Shopify | 76 | **49** |

**Was bewusst grob bleibt** (Taxonomie hat nichts Feineres oder Titel zu vage): Röcke ohne Längenangabe und Midi 274, Sportbekleidung
258 (Google kennt keine Sporthose), RC-Spielzeug 201 (gehört `rc_fein`), Velo-Lichter 145 (Google 2021 hat keine Klasse),
LED-/EMS-Hautgeräte 133, Tierspielzeug/-betten «für Hund und Katze» (keine tierübergreifende Klasse), Diffuser (gehören
`aroma_kategorie`), Kostüme ohne Formwort.

**Wächter (erfassen Neuimporte):** `nagel_fein` täglich in der Kategorie-Kette nach `kosmetik_fein`. `shopify_fein` mit «umzug»,
`kosmetik_fein` mit Nie-vergröbern-Schutz und Vorrang-Liste. `oberklasse_lernen` lernt aus den neuen Urteilen. `kategorie_fein`
läuft stündlich mit den neuen Zuordnungen.

**OFFEN** (kein Betreiber-Klick nötig)
- 49 Widersprüche sind Einzelfälle mit vagem Titel («Reparatur-Box», «Kaninchenbeutel»). 14 «keine Zuordnung» sind neue Google-Blätter
  (Fischernetze, Volleyballnetze, Kostüm-Umhänge) und lassen sich bei Bedarf als ZUSATZ nachtragen.
- Press-on-Sets heissen im Titel weiter «Nagelsticker». Die Kategorie stimmt jetzt, der Titel führt Käuferinnen aber in die Irre.
  Das ist ein Kandidat für eine eigene Runde (Titel ehrlich machen).

## Nachtrag «weiter» (08.10.2026, 18:05–18:40 UTC): Titel ehrlich, letzte Zuordnungen

**Press-on-Titel.** CJ nennt Press-on-Sets «Nagelsticker». Käuferinnen lesen dann «Aufkleber» und bekommen 10 Kunstnägel mit
Kleber. `nagel_fein.py` korrigiert jetzt auch den Titel, aber nur, wenn die BESCHREIBUNG Nägel belegt: künstliche Nägel,
Nagelstücke/-spitzen/-platten, Jelly-Kleber oder Mandelform. Die Grössenoption allein reicht für die Kategorie, nicht für einen
neuen Titel.
- **Falle beim Gegenlesen:** Mein erster Folien-Filter wertete «ultra-dünn, nahtlos» als Nagelfolie. Bei CJ ist das ein
  **Stilname der Press-on-Sets** («Ultra-Thin Seamless», 8 Beschreibungen mit künstlichen Nägeln UND diesem Wort). Zudem
  steckte «gelstick» in «Na**gelstick**er». Beide Regeln sind verworfen.
- **Regel:** «Nagelsticker/Nagelaufkleber/Sticker» → «Press-on-Nägel» (Begriff wie `google_titel_reparatur.py`). Ohne
  Nagel-Nomen wird « · Press-on-Nägel» angehängt. Titel, die die Nägel schon nennen («Nägel», «Nails», «Nagel-Tips»,
  «Kunstnagel»), bleiben unverändert. So wird «Cat-Eye Nagel-Tips mit Polka-Dot Sticker» nicht zu «… Press-on-Nägel».
  Verlängerungs-Sets bleiben ebenfalls. SEO-Titel, die mit dem alten Titel beginnen, ziehen mit. Ein neuer Titel, der schon
  bei einem anderen Produkt steht, wird übersprungen (1 Fall).
- **Geschrieben: 109 Titel / 0 Fehler, Rücklesen 12/12** (inkl. SEO-Titel). Kanarien 19 Titel + 12 Kategorie. Keine
  Kollektion hängt an den geänderten Wörtern; die Titelregeln der Nagel-Kollektionen («Nageldesign», «Nagelset», «Nagelpatch»)
  sind weiter erfüllt, weil nur ersetzt oder angehängt wird.
- Beispiele: «Nagelsticker Weiss» → «Press-on-Nägel Weiss» · «Sterntaler-Maniküre» → «Sterntaler-Maniküre · Press-on-Nägel» ·
  «Wassermelonen-Nagelaufkleber» → «Wassermelonen-Press-on-Nägel».
- Läuft täglich im Aufseher mit (nach `kosmetik_fein`), erfasst also Neuimporte. Zusätzlich 3 echte Sticker → «Nail Stickers».

**Letzte Zuordnungen:** 11 neue Google-Blätter aus Runde 5 als ZUSATZ (Kostüm-Umhänge/-Hüte/-Sets, Haar-Turban, Tarnnetz,
Kochmützen, Volleyballnetz, Velopumpe, Fischernetz/-falle, Bastelmaterial) und KREUZ Haar-Turban ≠ Bandana: **9/0**.
«Keine Zuordnung» 14 → **1** (Paintball & Airsoft, bewusst offen). 17 klare Widersprüche, bei denen Google recht hat
(Gua-Sha, Diffuser in «Health & Beauty», Auto-Lufterfrischer, Druckerpatronen, Aktenvernichter, Thermodrucker,
Monitorständer, Schmuckbox …): Shopify nachgezogen, **17/0**. Widersprüche 49 → **~32**, alle mit vagem Titel
(«Reparatur-Box», «Kaninchenbeutel», «Nano-Duscher»).
