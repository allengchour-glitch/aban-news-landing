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

## NACHTRAG 22:30 UTC — «das muss perfekt sein» / «super mache mehr»
**Taschen fertig (GEMESSEN):** Google-Umzug Runde 2 (Wickeltasche → Diaper Bags, Postman → Messenger, Tiertragen bleiben
draussen, Motiv-Rucksack bleibt Backpack; Kanarien 95/95) **9 gesetzt, 0 Fehler**; Shopify `kategorie_fein` mit frischem Export
(51'496): KREUZ Brusttasche/Brustbeutel/Kreuzbody → Handbags 118, Diaper Bags 4, Backpacks 2 → **124 gesetzt, 0 Fehler**
(vorher 1'634). Rücklese-Stichprobe 30 zufällige Produkte des Tages: **30/30 Google und Shopify im selben Zweig.**

**Die 8'000 «anderer Zweig» waren zu einem Drittel keine Widersprüche, sondern Sammelkörbe:**
| Paar (Shopify ‖ Google) | Anzahl | Befund |
|---|---:|---|
| Makeup / Nail Care / Skin Care ‖ «Cosmetics» | 2'662 | Google grob; Shopify-Feinklasse oft FALSCH (Pinselset = Makeup, Badeset = Makeup, Nagellack = Makeup, Organizer = Skin Care) |
| Cosmetic Tools ‖ «Hair Care» | 891 | Google-Sammelkorb: Glätteisen, aber auch Gesichtsdampfer, Rasierer, Munddusche, Luftreiniger |

Google aus Shopify ableiten hätte die Shopify-Fehler kopiert → **beide Felder aus dem Titel** (nie raten):
1. **`kosmetik_fein.py`** (82 Kanarien): ~90 geordnete Wortregeln im Zweig Cosmetics — Bad vor Make-up, Nägel vor Make-up,
   Werkzeug vor Ware («Lidschatten-Pinsel» = Pinsel), mehrere Make-up-Klassen = gemeinsame Oberklasse, über Gruppen hinweg
   mit «Set» = Cosmetic Sets. Fallen aus dem Trockenlauf: «Nä**gel**» enthält «gel», «Peel-off Lipgloss» ≠ Maske,
   «Haftcreme für Zahnprothesen»/«Haarcreme» ≠ Lotion, «Maniküre-Set «American Star»» = Kunstnägel, nicht Werkzeug,
   «Spiegelglanz» ≠ Spiegel, LED-/EMS-Masken = Gerät. Plan 2'293 (Kunstnägel 436, Pinsel 234, Lidschatten 162 …),
   ohne Treffer 548 bleiben.
2. **`haar_fein.py`** (51 Kanarien, nutzt denselben Lauf): Fremdes zuerst (Munddusche, Zahnbürste, Rasierer, Epilierer,
   Luftreiniger/-befeuchter, Ventilator, Gesichtsdampfer, Porenreiniger, Massage), dann Haar (Glätten+Locken in einem Gerät
   = Styling-Gerät allgemein, Glätteisen, Lockenstab inkl. maschinell übersetzter Titel «Kurzlocken-Stick», «Haarkräusler»,
   Föhn, Bürsten), Rest über die Kosmetik-Regeln. Plan 910 (580 verfeinert, 330 Zweigwechsel), ohne Treffer 56.
Beide: Google-Ziel gegen die Google-Taxonomie, Shopify-Ziel aus Shopifys offizieller Zuordnung, gegen die Shop-Taxonomie
geprüft; Rücklesen aus der Antwort; täglich im Aufseher (Block Google-Umzug) für Neuimporte.

**OFFEN:** Rest «anderer Zweig» ~4'400: Luggage ‖ Handbags ohne Titelwort (542: Kühlbeutel, Handytasche …), Drohnen 300,
Bettwäsche als Decor 203, Kameras 151, Ventilatoren 90; 56 Fremdkörper im Haar-Korb ohne Ziel (Socken, Teppich, Humidor).

## ERGEBNIS 23:20 UTC (GEMESSEN)
| Lauf | gesetzt | Fehler |
|---|---:|---:|
| `kosmetik_fein.py` | 2'301 | 0 |
| `haar_fein.py` | 910 | 0 |
| `rc_fein.py` (Drohnen → Shopify «Flying Toys > Drones», Akkus/Landeplätze eigene Klassen; 20 Kanarien) | 297 | 0 |
| `kategorie_fein` KREUZ Bettwaren Decor → Pillows/Blankets/Duvet Covers/Towels | 225 | 0 |
| `kategorie_fein` KREUZ «Electronics» → Ventilator/Wecker/Staubsauger/Massage/Kamera/Luftbefeuchter … (23 Ziele, je Pflichtwort; PS5-Lüfter, «Roboter mit Licht», Haar-«Diffuser», Kamera-Detektor ausgeschlossen) | 439 | 0 |
Frischer Export (51'5xx aktive): **«anderer Zweig» 9'661 (Morgen) → 4'070**, **«gleich» 36'135 → 41'732**.
Rücklesen live: 30/30 zufällige Produkte aus Kosmetik/Haar/RC tragen Google- UND Shopify-Wert wie geschrieben.
Aufseher (Block Google-Umzug, täglich): haar_fein → kosmetik_fein → rc_fein; kategorie_fein stündlich (KREUZ inklusive).

## RUNDE 3 (07.10. 21:15–23:xx UTC) — Betreiber «weiter genau das wollte ich, mach es alles perfekt, alles andere auch»
**Messfehler zuerst:** `kategorie_fein` zählte «Shopify feiner als die Google-Zuordnung» (Drohnen → Shopify «Drones»,
Diffuser) als Widerspruch → neue Klasse `shopify-feiner` (= einig). Echte Widersprüche danach: **3'480** (+ ~470 Kosmetik-Reste).
**«Alles andere» gemessen:** ohne Google-Kategorie 1'662 = 1'557 Kostüme + 40 Raucherwaren (absichtlich nicht im Google-Kanal,
bleibt); «keine Zuordnung» 3'472 = Shopifys Tabelle mehrdeutig, v. a. **Uhren 2'876** (1'001 nur «Electronics»), dazu 39 Google-
Werte als nackte NUMMER («1» = Tiere für eine UV-Gesichtsmaske, «567» Skin Care für Windmasken).
| Lauf | gesetzt | Fehler |
|---|---:|---:|
| `uhren_fein.py` (Uhr aa-6-11 / Smartwatch aa-6-12 / Armband für … Watch → Watch Bands aa-6-10-1 / Hülle, Ladegerät → Watch Accessories; 24 Kanarien) | 1'030 | 0 |
| `google_id_zu_name.py` (Nummer → Pfad, Titelwort zuerst; täglich) | 39 | 0 |
| Runde 1 Einzelurteile: 3'954 Widersprüche, je Produkt am Titel beurteilt (G 2'101 · S 738 · X 929 · ? 186), `kategorie_urteile_anwenden.py` mit Schutz (Drohnen, Kinderkleidung, 3D-Druck nie auf gröber) | 3'534 | 0 |
| Runde 2: 12'583 Produkte auf groben Google-OBERKLASSEN (Electronics, Hardware > Tools, Storage, Dog Supplies …) verfeinert — 8'477 Änderungen, 4'106 bleiben (vage / kein passendes Blatt / Klingen-Tabak-Kostüm-Erotik nie verschoben) | läuft | 0 |
Rücklesen live Runde 1: **30/30**. Stichprobe Runde 2 vor dem Schreiben: 70/70 plausibel (Velo-Kassette, Hundeweste, Rollo, Gamepad,
Fotofalle …). Fundstücke: Sticker unter «Kaffeemaschinen»/«Kleidung», Poster unter «Gepäck», Velosattel unter «Aufbewahrung»,
Gehhilfe unter «Basteln», Kindersitzerhöhung unter «Autoteile», Angelschnur unter «Haustiere».
**Lehren:** (1) Shopify-Drossel bei zwei Schreibern → `kategorie_urteile_anwenden` wartet jetzt (8 Versuche) statt abzubrechen
(Runde 2 brach nach 375 ab). (2) Ein «Bereichsschutz» (erste zwei ID-Stufen gleich → Shopify bleibt) wurde verworfen, bevor er
lief: er hätte Zahnbürste Skin Care → Oral Care blockiert. (3) Langer Schwanz ≠ Regel: ab ~80 Paaren lohnt Einzelurteil + Stichprobe.
