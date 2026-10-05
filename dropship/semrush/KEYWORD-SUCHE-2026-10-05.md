# Shop-Suche mit den neuen Google-CH-Begriffen (05.10.2026, 09:30–10:25 UTC) — Bereich «suche-synonyme»

**Auftrag (Betreiber «keyword mehr machen»):** 60 Begriffe aus `keywords_erweiterung_ch_2026-10-05.csv` (zuerst die 17 mit
Semrush-Volumen ≥ 30/Mt, dann 43 `suggest-kandidat` in Dateireihenfolge; übersprungen: «geschenk für kinder verpacken» =
Info-Absicht, «gesichtsmaske kinder» = Kostüm/Kosmetik unklar) gegen die Storefront-Suche messen, wo passende Ware existiert
aber nicht oben steht → Suchwort-Tags; 40 Begriffe in den Positions-Tracker. **0 Semrush-Einheiten** (Konto ist leer).

## Wie gemessen
- Storefront `/search/suggest.json?q=…&resources[type]=product&resources[limit]=10` (Vorschlagsliste beim Tippen) über den
  Proxy, 3 parallel; **WebFetch-Gegenprobe** «blusenkleid damen» 09:57 UTC = dieselben 10 Titel in derselben Reihenfolge.
  Dazu Enter-Suche `/search?q=…&type=product` für die behandelten Begriffe. Rohdaten: `_suche_keywords_vorher_2026-10-05.json`
  (09:35), `_suche_keywords_nachher_2026-10-05.json` (10:18).
- «Top-3 passend» = so viele der ersten drei Vorschläge tragen den WARENbegriff im Titel (Regex je Begriff, z. B. «boots|stiefel»;
  Farb-/Zielgruppen-Zusatz zählt NICHT mit). Grob gewollt; Handkorrekturen unten in «Lesart».
- «Ware aktiv» = aktive Produkte, deren Titel den Warenbegriff tragen (Export 05.10. 08:36, 50'679 aktive).

## Ergebnis in einem Satz
**Treffer gibt es immer (60/60 mit Vorschlägen, 0 ohne) — bei 24 von 60 Begriffen ist aber keiner der ersten drei die gesuchte
Ware.** Ursache fast immer: der Begriff hat ZWEI Wörter, und die Vorschlagsliste reiht Produkte nach oben, die beide Wörter
irgendwo im TITEL tragen («ballerinas schwarz» → «Schwarzer Badeanzug», weil «Ballerinas» in dessen Text vorkommt; «blusenkleid
damen» → «Damenbluse»). Farbe/Zielgruppe stehen bei unserer Ware nur in Varianten oder Tags — die zählen dort fast nichts.

## Tabelle vorher (09:35 UTC) / nachher (10:18 UTC, 37 Min nach den Tags)
| # | Begriff | Vol/Mt | Quelle | Ware aktiv (Titel) | Top-3 passend vorher | nachher | Top-3 nachher |
|---|---|---|---|---|---|---|---|
| 1 | teppich wohnzimmer | 4400 | Semrush | 99 | 2/3 | 2/3 | Plüschiger Teppich für Schlaf- und · Plüsch-Teppich für Wohnzimmer und  · Tencel-Leinen Kissenbezug im Landh |
| 2 | baby bodys | 1600 | Semrush | 32 | 1/3 | 1/3 | Nahtloser Bodysuit mit eckigem Aus · Baby-Body mit Blütendruckknöpfen · Baby-Set mit Stickerei – Kurzarm-B |
| 3 | beamer leinwand | 1000 | Semrush | 0 | 0/3 | 0/3 | Beinwärmer mit Stern- und Knochen- · WLAN Mini Beamer für Zuhause · P330 Mini Beamer – Heimkino für un |
| 4 | bikini set damen | 1000 | Semrush | 39 | 3/3 | 3/3 | Bikini-Set · Damen · Damen-Bikini-Set · Damen Bikini-Set · Modell 2 |
| 5 | bilderrahmen holz | 720 | Semrush | 22 | 0/3 | 0/3 | Holz-Lesezähler «Leseheld» · Monte · Holzarmbanduhr · Glas · Holzarmbanduhr für Herren |
| 6 | bettwäsche beige | 480 | Semrush | 42 | 2/3 | 2/3 | Maillard Doppel-Schicht-Garn Bettw · Vintage Preppy Bettwäsche-Set mit  · Luftige Häkelmütze für Damen |
| 7 | aufbewahrungsbox garten | 260 | Semrush | 93 | 1/3 | 1/3 | Alu-Set-Top-Box-Aufbewahrung · Game Card Aufbewahrungsbox · Bambus Aufbewahrungssystem Modular |
| 8 | ballerinas schwarz | 260 | Semrush | 32 | 0/3 | 0/3 | Schwarzer Badeanzug mit Brustmetal · Schwarze Slim-Fit Leggings für Dam · Schnürkleid «Noir» – Schleifen-Det |
| 9 | bastelset mädchen | 260 | Semrush | 11 | 0/3 | 0/3 | Mädchen-Set: T-Shirt & Faltenrock · Baumwoll-Unterwäsche-Set für Mädch · Mädchen Martin Boots mit Schnürsen |
| 10 | arbeitsschuhe mit stahlkappe | 210 | Semrush | 61 | 2/3 | 2/3 | Arbeitsschuhe mit Stahlkappe, Anti · Sicherheitsschuhe mit Stahlkappe f · Männer Arbeitsschuhe, robust & iso |
| 11 | aroma diffuser kabellos | 210 | Semrush | 114 | 3/3 | 3/3 | Bambus-Aroma-Diffuser · Aroma-Diffuser «Mist» – Ultraschal · Premium Bambus Aroma Diffuser 300m |
| 12 | blusenkleid damen | 210 | Semrush | 52 | 0/3 | 0/3 | Lose Damenbluse mit Lapel · Elegante Damenbluse mit Rüschen un · Damen Bluse mit Rüschen und Puffär |
| 13 | babykleidung junge | 170 | Semrush | 439 | 3/3 | 3/3 | Baby Hoodie-Set mit Bären-Print · Baby Cordhose mit Spitzenbesatz · Baby-Jumpsuit mit Herzprint und Sp |
| 14 | boots damen schwarz | 170 | Semrush | 691 | 0/3 | 0/3 | High-Waist Straight-Leg Jeans für  · Schwarze Slim-Fit Leggings für Dam · Sommerkleid ärmellos · Damen, tail |
| 15 | babydecke merinowolle | 140 | Semrush | 8 | 0/3 | 0/3 | Strickpullover aus Merinowolle · Merino Twist-Top & Seiden-Midi-Jup · Boho-Kleid «Ibiza» – Baumwoll-Lein |
| 16 | akkuschrauber set | 90 | Semrush | 7 | 0/3 | 0/3 | E88-E99 Ersatzakku 3er-Set · Drohnen-Akku-Ladegerät mit USB-Ada · Li-ion Akku & USB-Ladegerät Set 30 |
| 17 | armbanduhr mit wecker | 30 | Semrush | 14 | 0/3 | 0/3 | Männer Armbanduhr mit Nachtlicht · Männer Armbanduhr mit Leuchtfunkti · Automatik Armbanduhr |
| 18 | bluetooth lautsprecher für auto | – | Suggest | 11 | 0/3 | 0/3 | Mini Bluetooth Speaker Wasserdicht · Kabellose Kopfhörer «EchoBuds» · B · Smarte Audio-Brille mit Wechsellin |
| 19 | bürostuhl ergonomisch | – | Suggest | 10 | 0/3 | 0/3 | Ergonomisches Lendenkissen für Bür · Grosse Schreibtischunterlage für M · Komfort-Fahrradsattel XXL – extrab |
| 20 | chelsea boots mädchen | – | Suggest | 14 | 0/3 | 0/3 | Mädchen Martin Boots mit Schnürsen · Baby Mädchen Lauflernschuhe mit we · Rote Punkte Schuhe für Mädchen |
| 21 | deckenlampe wohnzimmer | – | Suggest | 19 | 0/3 | 0/3 | 3D-Druck Nachttischlampe – warmes  · Dimmbare USB Tischleuchte, Akkubet · RGB-Wandlampe «Halo» · kabellos, F |
| 22 | diamond painting kinder | – | Suggest | 203 | 1/3 | 1/3 | Diamond Painting Set für Kinder mi · Kinder Schwimmbrille · Kinder Schwimmbrille mit grossem R |
| 23 | dirndl damen grün | – | Suggest | 41 | 0/3 | 0/3 | Armygruene Damenkleid · Colorblock Strickpullover mit Rund · Damen-Sneaker mit atmungsaktivem M |
| 24 | duschvorhang beige | – | Suggest | 18 | 1/3 | 0/3 | Mittelalterlicher Zierkissenbezug · Plateau-Sandalen · Damen, Retro-St · Boho-Kleid «Ibiza» – Baumwoll-Lein |
| 25 | elektrische zahnbürste kinder | – | Suggest | 34 | 3/3 | 3/3 | Elektrische U-förmige Zahnbürste · MINI Blue – Elektrische Zahnbürste · Elektrische Kinder-Zahnbürste mit  |
| 26 | etagere holz | – | Suggest | 14 | 3/3 | 3/3 | Holz-Etagere für Tee und Snacks · Holz-Etagere für Kuchen und Desser · Retro Holz-Etagere für Snacks & De |
| 27 | ferngesteuertes auto kinder | – | Suggest | 39 | 1/3 | 1/3 | Ferngesteuertes Fluggerät mit Hind · RC Fernsteuerung für Modellautos & · F1 Spray Racing-Auto mit Gestenste |
| 28 | fitness tracker ohne display | – | Suggest | 14 | 2/3 | 2/3 | Fitness-Tracker «StepGo» · Herzfre · Fitness-Tracker «ActiveBand» · Her · Smart Ring mit Gesundheits- und Fi |
| 29 | fitnessgeräte für zuhause | – | Suggest | 298 | 1/3 | 1/3 | Mini Stepper Office Bicycle für Re · Hängende Beinheber-Trainingseinhei · Pilates Bar Set mit 6 Widerstandsb |
| 30 | futternapf mit chip | – | Suggest | 315 | 2/3 | 2/3 | Erhöhte Futternäpfe für Hund und K · Keramik Futternapf für Haustiere m · Erhöhter Futternapf für Katzen mit |
| 31 | gadgets fürs auto | – | Suggest | 972 | 3/3 | 3/3 | Auto-Schnellladegerät PD – auszieh · Akku-Handsauger für Auto & Heim –  · Smart Auto-Lufterfrischer · nachfü |
| 32 | gaming stuhl mit massage | – | Suggest | 0 | 0/3 | 0/3 | Faltbarer Outdoor-Stuhl mit Netzrü · S4 Bluetooth Gamepad mit Symmetric · X3 Game Controller mit Kühlfunktio |
| 33 | gartendeko winterfest | – | Suggest | 6 | 0/3 | 0/3 | Gefütterte Winterjacke mit Umlegek · Gefütterter Wintermantel für Damen · Gefütterter Patchwork-Wintermantel |
| 34 | gel nägel set | – | Suggest | 1634 | 3/3 | 3/3 | 3-Farben Ice Jelly Nude Gel Nagell · Gel Nagellack Stifte Set · Nagelverlängerungs-Set mit Lichthä |
| 35 | geldbörse klein | – | Suggest | 110 | 2/3 | 2/3 | Retro Canvas Rucksack (Gross/Klein · Herren-Geldbörse aus Rindsleder · Handtasche für Herren – Leder-Geld |
| 36 | geschenk für frauen | – | Suggest | 108 | 0/3 | 0/3 | Lustiges Dinosaurier Baseball Cap  · 6-teiliges Parfüm-Set für Damen · Intim-Pflegeserum für Frauen |
| 37 | geschenkset männer | – | Suggest | 108 | 0/3 | 0/3 | Männertasche mit CP-Design · Herrenuhr-Set «Magnate» – Quarz +  · Männer Armbanduhr mit Leuchtfunkti |
| 38 | glätteisen mit dampf | – | Suggest | 163 | 3/3 | 3/3 | Glätteisen & Lockenstab 2-in-1 · 3-in-1 Lockenstab & Glätteisen · Kabelloser Glätteisen & Lockenstab |
| 39 | gummistiefel gefüttert kinder | – | Suggest | 18 | 1/3 | 1/3 | Fleece-gefütterte Kinder-Handschuh · Gefütterte PVC-Regenstiefel für Ki · Gelbe Leder-Winterstiefel für Kind |
| 40 | gürtel damen leder | – | Suggest | 260 | 3/3 | 3/3 | Damen Ledergürtel für Jeans und Ho · Vielseitiger Damen-Gürtel aus Rind · Schmaler Echtleder-Gürtel für Dame |
| 41 | halloween deko xxl | – | Suggest | 115 | 0/3 | 0/3 | Halloween-Sweatshirt mit Digital-D · Halloween Kapuzenpullover mit Tote · Halloween Langarm-Pulli Herbst/Win |
| 42 | halskette damen gold | – | Suggest | 577 | 3/3 | 3/3 | Vergoldete Halskette «Blatt» · 18k · Kreuz-Halskette Gold · Edelstahl-A · Halskette mit Ring-Halter-Anhänger |
| 43 | handschuhe damen elegant | – | Suggest | 94 | 3/3 | 3/3 | Elegante Damen-Handschuhe aus Lamm · Damen-Handschuhe aus echtem Leder · Damen-Handschuhe aus Schafsleder,  |
| 44 | handstaubsauger auto | – | Suggest | 11 | 2/3 | 2/3 | Akku-Handsauger für Auto & Heim –  · Kabelloser Handstaubsauger für Aut · Nagelstaubsauger 80W |
| 45 | hanteln set | – | Suggest | 20 | 1/3 | 3/3 | Wasser-Hantel 2er-Set · füllbare R · Verstellbares Hantel-Set für das H · Hantel-Set aus galvanisiertem Eise |
| 46 | hausschuhe kinder junge | – | Suggest | 55 | 2/3 | 2/3 | Kinder Plüsch-Hausschuhe · Kinder- und Erwachsenen-Hausschuhe · Kinder-Laufschuhe aus Baumwolle |
| 47 | heizdecke camping | – | Suggest | 10 | 0/3 | 0/3 | Hängematte mit Moskitonetz für Out · Antihaft-Camping-Kochset mit Pfann · Picknick-Matte XXL · faltbar, wass |
| 48 | hemdbluse damen | – | Suggest | 369 | 2/3 | 2/3 | Damen Sommerhemd mit Geometermuste · Damen Langarm-Hemdbluse mit Krawat · Damen Bluse mit Rüschen und Puffär |
| 49 | high heels schwarz | – | Suggest | 320 | 2/3 | 2/3 | Schwarze Canvas Sneaker mit Höhe-B · Weisse High Heels mit Spitze · Slingback-Pumps · Damen, mit Absat |
| 50 | hoodie mit reißverschluss | – | Suggest | 682 | 3/3 | 3/3 | Retro Hoodie mit Ausweis-Print und · Strick-Hoodie mit Reissverschluss · Warmer Hoodie mit geometrischem Mu |
| 51 | hosenrock damen | – | Suggest | 6 | 0/3 | 0/3 | Damen Jeansrock mit Knopfleiste · Damen Caprihose mit tiefem Bund un · Langer, vielseitiger Damenrock mit |
| 52 | hundebett auto | – | Suggest | 73 | 1/3 | 1/3 | Hundepfote-Knochenteller Holz/Bamb · Langlebiges Beissspielzeug für Hun · Wasserquelle für Katzen & Futterau |
| 53 | hundemantel wasserdicht mit bauchschutz | – | Suggest | 25 | 0/3 | 0/3 | Tierklettergerüst faltbar 72x180 c · Wasserquelle für Katzen & Futterau · Keramik-Schüssel für Hunde mit Nac |
| 54 | hundezubehör auto | – | Suggest | 102 | 1/3 | 1/3 | Wasserquelle für Katzen & Futterau · Smart Interaktiver Ball für Hunde · Hundepfote-Knochenteller Holz/Bamb |
| 55 | hängematte mit gestell | – | Suggest | 19 | 1/3 | 1/3 | Hängematte mit Moskitonetz für Out · Hochausgestellte, mittellange, gef · Perlenkette mit tropfenförmigem Na |
| 56 | jacke damen übergang | – | Suggest | 609 | 3/3 | 3/3 | Herren Retro Übergangsjacke mit Re · Herren Übergangsjacke mit Revers u · Damen-Steppjacke mit Rautenmuster |
| 57 | jeanskleid damen | – | Suggest | 35 | 0/3 | 0/3 | High-Waist Straight-Leg Jeans für  · Damen Bootcut Jeans mit geradem Be · High-Elasticity Slim-Fit Jeans für |
| 58 | jumpsuit damen sommer | – | Suggest | 331 | 3/3 | 3/3 | Damen Jumpsuit mit weitem Bein · Eleganter Damen Jumpsuit mit Reiss · Sommerlicher Jumpsuit mit Taillent |
| 59 | kamera für kinder | – | Suggest | 362 | 3/3 | 3/3 | Babyphone mit HD-Kamera und App-Zu · Sport- & Fahrradkamera mit WLAN · Smartwatch mit Kamera und GPS für  |
| 60 | katzenbett wand | – | Suggest | 28 | 0/3 | 0/3 | Wurm-Spielzeug-Set für Katzen · Kratzbaum und Bett für Katzen aus  · Kratzbrett für Katzen · schont Möb |

**Summe:** Top-3 0/3 passend: 24 vorher → 25 nachher · ≥ 2/3: 25 → 26 · 0 Treffer: 0 → 0. Verändert: «hanteln set» 1/3 → **3/3**
(Tag `hanteln`), «duschvorhang beige» 1/3 → 0/3 (nicht angefasst = Rangrauschen der Vorschlagsliste).

### Lesart (Handkorrekturen der Regex-Wertung)
- **Ohne passende Ware (keine Massnahme möglich, Sortiment):** beamer leinwand (0 Leinwände), gaming stuhl mit massage (0),
  bürostuhl ergonomisch (nur Kissen/Bezüge), babydecke merinowolle (keine Merino-Babydecke), chelsea boots mädchen (14 Chelsea, alle
  Herren), heizdecke camping (Heizkissen ≠ Heizdecke), hängematte mit gestell (keine mit Gestell), futternapf mit chip (kein Chip-Napf),
  aufbewahrungsbox garten (1), armbanduhr mit wecker (5 Uhren mit Alarm — Tag `wecker` hätte die Wecker-Suche, 9'900/Mt, mit Uhren
  gefüllt → bewusst nicht).
- **Nicht als Ziel (Hausregel):** dirndl damen grün — alle 41 Dirndl haben Produkttyp «Kostüme & Verkleidung».
- **Regex zu gnädig:** «babykleidung junge» 3/3 = Babykleidung, aber Mädchen-Ware (Spitze, Herzprint); «fitnessgeräte für zuhause»
  1/3 ist in Wahrheit 3/3 (Stepper, Beinheber, Pilates-Bar).
- **Modifikator-Fälle (Farbe/«xxl»/«winterfest»/«mit dampf»):** Farbe steht nur in Varianten → siehe Pilot «schwarz»; «xxl» trifft
  Kleider-Grössen (Variante XXL) → «halloween deko xxl» zeigt Pullover; «winterfest», «mit dampf», «kabellos» kommen im Sortiment nicht vor.

## Was geändert wurde (alles im Ledger `dropship/_suchwort_synonyme.tsv`, Rückweg = `tagsRemove` je Zeile)
1. **Synonym-Tabelle in `automation/suchwort_tags.py`** (statt eines neuen Werkzeugs; läuft täglich über `fixer_keepalive.sh` mit):
   `SYNONYME` = Tag → (Titel trifft, Titel-Ausschluss, Produkttyp muss). 10 Tags: blusenkleid ← Hemdblusenkleid/Hemdkleid ·
   jeanskleid ← Denim-Kleid/Jeans-…kleid · hosenrock ← Culotte/Rockhose · gummistiefel ← Regenstiefel · deckenlampe ←
   Deckenleuchte/Pendelleuchte/Kronleuchter/Hängelampe · hanteln ← Hantel (nur Sport) · akkuschrauber ← Akku-…schrauber ·
   gartendeko ← Gartenstecker/-figur/-fee · katzenbett ← Katzenhängematte/Katzenplattform (nur Haustier/Spielzeug) · bodys ←
   Baby-Body (nur Baby-Typen). Nie: Kostüm-Typen, POD/Editor-Tags. Keine der 549 Kollektionsregeln nutzt diese Tags (geprüft).
   **Kanarienvögel (trocken, 9/9 abgewiesen, 8/8 getroffen):** «Hantel-Armband» (Schmuck), «Deko-Set Glitzer-Kronleuchter»
   (Partydeko), «Jeans-Look Top mit Tupfenkleid», «Nachttisch-Pendelleuchte», «Strampler für Haustiere», «Nahtloser Bodysuit»
   (Shapewear), «Wandteppich mit Weltraum-Katze», «Catnip Spielzeug Hantel», «Dirndl» (Kostüm-Typ).
2. **Scharf 09:41 UTC: 127 Produkte** (blusenkleid 47, gummistiefel 17, jeanskleid 16, deckenlampe 13, hanteln 13, hosenrock 5,
   katzenbett 5, bodys 4, gartendeko 4, akkuschrauber 3); live vorher gelesen (alle ACTIVE, Tag fehlte), 1 übersprungen, weil der
   Handle im Ledger des Parallel-Workflows steht (`wasserdichte-regenstiefel-fur-kinder-607400`), Sperrliste direkt vor jedem
   10er-Bündel neu gelesen. Zurückgelesen: 127/127 tragen den Tag. Admin `tag:<x> status:active` 09:45: exakt die Sollzahlen.
3. **Pilot Farbe 09:56 UTC: Tag `schwarz` auf 18 Ballerinas** mit LIEFERBARER Variante Schwarz/Black (`availableForSale`,
   `selectedOptions`). Bisher trägt kein Produkt im Shop einen Farb-Tag, keine Regel nutzt `schwarz`.
4. **Ledger-Fehler in `suchwort_tags.py` behoben:** die Sperre galt der ganzen Produkt-ID (`gid in done`) — ein Produkt mit
   «uhr» im Ledger hätte nie ein später ergänztes Grundwort bekommen. Jetzt Paar (ID, Tag). Trockenlauf: heute 54 → 54 Paare (keine
   Mengenänderung). Dabei gefunden und ausgeschlossen: «Aschenbecher» → `becher` (Raucherzubehör), `ring` aus «Contouring»,
   «Gesundheitsmonitoring», «Layering», «Mirroring», «Wearing», «String», «Mountaineering», «Augenringe»
   (Kanarienvögel «Silberring», «Edelstahlring» weiter getroffen). Täglicher Lauf jetzt 53 statt 67 Kandidaten.
   ⚠️ **KORREKTUR (Prüferbefund, 10:45–11:00 UTC):** «keine Mengenänderung» war die falsche Abnahme. Die 54 Paare waren
   nie von Hand gelesen — der nächste scharfe Keepalive-Lauf (fällig ~16:13 UTC) hätte u. a. geschrieben: `messer` auf
   «Tischuhr … 12 cm Durch**messer**», «Drehwinkelmesser», «Höhenmesser», «Windgeschwindigkeitsmesser», «Haarmesser»;
   `uhr` auf «Draht**zufuhr**»; `matte` auf «Hänge**matte**»; `bohrer` auf zwei Diamond-Painting-«Punktbohrer»; `kamm` auf
   einen Lamellenkamm für Klimaanlagen; `kabel` auf eine Crimpzange und einen Schlangen-Fanghaken. Ausserdem entschied das
   Werkzeug am **Export-Titel** (21:10 UTC vom Vortag), nicht am Live-Titel: 9 der 52 Produkte heissen live längst anders
   («Reisetasche» = «Rucksack weiss», «Spitzenbluse» = «Jeansjacke», «Motorradsattelanzug» = «Motorradjacke»).
   **5. Nachbesserung `suchwort_tags.py`:** (a) `messer` ganz gestrichen — Klingen sind seit 16.09. nicht im Verkauf, übrig
   sind nur Messgeräte, und der Tag `messer` ist ein **Klingen-Sperrtag** anderer Wächter (`google_kanal_luecke` TAG_RISIKO,
   `cj_versand_ch_revive` KLINGE_TAG) — ein Pulsmesser mit diesem Tag kommt nie in den Google-Kanal zurück. (b) Ausnahmen
   `uhr` +zufuhr/abfuhr/ausfuhr/einfuhr, `matte` +Hängematte, `bohrer` +Punktbohrer; `KONTEXT_OHNE` für `kamm`
   (Reinigung/Lamelle/Klima) und `kabel` (Klemme/Tester/Crimp/Einholer). (c) **Kopfwort-Regel:** ein Grundwort nach
   «mit/für/zur/zum/ohne/inkl.» oder vor einem Bindestrich (ausser -Set/-Kit/-Paar/-Schmuck/-Modell) ist nicht das Produkt
   («Smartwatch mit Pulsmesser», «Lederarmband mit USB-C-Ladekabel», «Netzwerkkabel-Klemme»). Gegen alle 50'760 aktiven
   Produkte verglichen: die neue Regel weist 768 Paare ab, die die alte nahm; von Hand gelesen, fast alle zu Recht
   (Quarzuhr mit Edelstahl**armband** 165×, Kleid mit Taillen**gürtel** 67×); bewusst in Kauf genommen ~5 echte Verluste
   («Baumwollmantel» nach «mit Kapuze,», «Mini-Suppentopf» nach «für Herd –»). (d) Entscheidung am **Live-Titel**.
   (e) **25 Kanarienvögel** laufen vor jedem Lauf; einer daneben = Abbruch, bevor etwas geschrieben wird.
   Trockenlauf danach (10:57 UTC): **33 statt 52 Produkte**, alle 33 von Hand gegen den Live-Titel gelesen, 0 Fehltreffer
   (Drainagematte, Picknickmatte, Keramikbecher, Studentenrucksack, Gummihammer, Holzbohrer, Tischuhr aus Buchenholz …).
   Nicht scharf gefahren — das macht der Keepalive-Lauf (~16:13 UTC) mit genau dieser Regel.
   **6. Rückbau bereits geschriebener Fehltreffer (10:54 UTC):** nur Paare aus `dropship/_suchwort_tags.txt` (= dieses Werkzeug
   hat sie gesetzt). `messer` von **46 Messgeräten** entfernt (Puls-/Herzfrequenz-/Höhen-/Entfernungs-/Winkel-/Reifendruck-
   messer, «Durchmesser»; nur wenn `ist_klinge` UND `ist_handklinge` nein), `matte` von **19 Hängematten** (61 ACTIVE + 4 DRAFT insgesamt; inkl. «Katzenbett mit
   Hängematte»); zusammen 65 Produkte, 3 übersprungen (Handle im Sperr-Ledger des Parallel-Workflows). Ledger mit Altwert
   `dropship/_suchwort_tags_rueckbau_2026-10-05.tsv` (Rückweg `tagsAdd`). Zurückgelesen: 65/65 ohne den Tag. Admin
   `tag:messer status:active` danach 11 (3 gesperrte Messgeräte + 8 Klingen/Klingennahe, Tag dort absichtlich belassen).

## Wirkung gemessen (10:18–10:25 UTC)
- **Ein-Wort-Suche — wirkt:** «gummistiefel» Vorschläge 10/10 Regen-/Gummistiefel (09:45, Index noch alt: 2/10, Platz 2–5 Schnee-/
  Wanderstiefel, Herrenstiefel); «hosenrock» 6 Hosenröcke/Culottes auf Platz 1–6 (09:39: 2 auf Platz 1–2, dann Röcke/Jogginghose);
  «akkuschrauber» die 3 Akku-Schrauber auf Platz 4/5/7 (09:55: 0 von 10, nur Akkus); «hanteln» 10/10 Hanteln (vorher nicht einzeln gemessen).
- **Zwei-Wort-Suche in der Vorschlagsliste — wirkt kaum:** von 10 behandelten Begriffen nur «hanteln set» besser (1/3 → 3/3).
  «blusenkleid damen», «jeanskleid damen», «hosenrock damen», «katzenbett wand», «deckenlampe wohnzimmer» unverändert 0/3.
  Der Vorschlagsdienst gewichtet Titeltreffer beider Wörter weit über Tags.
- **Enter-Suche (Ergebnisseite) — trägt die Tags:** «blusenkleid damen» Platz 1–2 Hemdblusenkleider · «baby bodys» Platz 1–2
  Baby-Bodys (Vorschlagsliste: Shapewear-Body auf 1) · «hanteln set» 3/3 · «gummistiefel gefüttert kinder» Platz 1 gefütterte
  Regenstiefel (44 Ergebnisse) · **«ballerinas schwarz» Platz 1–3 = drei der 18 schwarz-getaggten Ballerinas** (Vorschlagsliste
  weiter «Schwarzer Badeanzug»). ⚠️ Für die Enter-Suche gibt es KEINE Vorher-Messung — der Vergleich ist nur gegen die
  ungetaggten Nachbarn möglich: «boots damen schwarz» Enter Top-3 = Mädchen-Boots, Sommerkleid, Halbschuhe (gemischt).
  Ungelöst auch in der Enter-Suche: «jeanskleid damen» (Platz 2–3 Jeans), «hosenrock damen», «deckenlampe wohnzimmer» (Tischlampen),
  «katzenbett wand», «akkuschrauber set» (Akkus); «gartendeko winterfest» 0 Ergebnisse (UND-Suche, «winterfest» kommt nicht vor).
- Index: Admin sofort, Storefront-Vorschläge erst nach 20–35 Min (09:55: noch kein Effekt bei «akkuschrauber»/«gummistiefel»).

## Lehren
- **Vorschlagsliste und Enter-Suche ranken verschieden:** Tags heben die Ergebnisseite und Ein-Wort-Vorschläge, aber nicht die
  Zwei-Wort-Vorschläge. Messgerät für Mehrwort-Begriffe = BEIDE Listen.
- **Long-Tail-Begriffe (Ware + Farbe/Zielgruppe) scheitern am Titel**, nicht am fehlenden Wort — dieselbe Klasse wie «schuhe» →
  Schulrucksäcke. Hebel: Search & Discovery oder Titel (Farbe im Titel nur bei Einfarb-Produkten ehrlich).
- **Ein Ledger, das die ganze ID sperrt, friert ein Werkzeug ein**, sobald man seine Tabelle erweitert — Sperre je (ID, Wert).

## Betreiber-Klicks (Search & Discovery → Suche → Synonyme; keine API)
Synonymgruppen (wirken auf Vorschlagsliste UND Enter-Suche, auch für Mehrwort-Anfragen):
`blusenkleid, hemdblusenkleid, hemdkleid` · `jeanskleid, denimkleid, denim-kleid` · `hosenrock, culotte, rockhose` ·
`gummistiefel, regenstiefel` · `deckenlampe, deckenleuchte, pendelleuchte, hängelampe` · `boots, stiefel, stiefeletten` ·
`akkuschrauber, akku-schrauber, schrauber` · `katzenbett, katzenhängematte` · `hanteln, hantel, kurzhantel`.
Dazu Produkt-Boosts: «baby bodys» → Baby-Body mit Blütendruckknöpfen / Baby Body aus Bambusfaser (Vorschlagsliste zeigt sonst
Shapewear-Bodys); «ballerinas schwarz» → zwei schwarze Ballerinas.

## Tracker
40 Begriffe an `position_tracking_ziele.tsv` + `POSITION-TRACKING-KEYWORDS.txt` angehängt (dedupliziert, 0 Dubletten, jetzt 290):
12 mit Semrush-Volumen (teppich wohnzimmer 4'400 → /collections/teppiche, baby bodys 1'600 → babykleidung, bikini set damen 1'000 →
sub-bademode, bettwäsche beige → bettwaesche, ballerinas schwarz → sub-ballerinas, bastelset mädchen → spielzeug-basteln,
arbeitsschuhe mit stahlkappe → das schon getrackte Stahlkappen-Produkt (keine zweite Seite = keine Kannibalisierung), aroma diffuser
kabellos, blusenkleid damen → sub-kleider, babykleidung junge, boots damen schwarz → sub-stiefel-boots, akkuschrauber set →
elektrowerkzeug) + 28 suggest-kandidat (Ziel je Begriff die passende Menü-Kollektion). Alle 40 Ziel-URLs 09:43 UTC HTTP 200 ohne
Umleitung. Nicht aufgenommen (keine Ware/Hausregel): beamer leinwand, bilderrahmen holz (2 Holzrahmen), aufbewahrungsbox garten,
babydecke merinowolle, armbanduhr mit wecker, bürostuhl, chelsea boots mädchen, dirndl, gaming stuhl, futternapf mit chip, …

## Offen
- Zwei-Wort-Vorschläge für blusenkleid/jeanskleid/hosenrock/deckenlampe/katzenbett + Farbe: nur Search & Discovery (oben).
- Farb-Tags als Klasse (aus lieferbaren Varianten, wie Pilot `schwarz`) erst nach Nachmessung Enter-Suche «ballerinas schwarz»
  gegen eine ungetaggte Kontrolle (z. B. «boots damen schwarz») — nicht ausgerollt.
- Sortimentslücken für den CJ-Lauf (nach 16:00 UTC): Beamer-Leinwand (1'000/Mt), Gaming-Stuhl, ergonomischer Bürostuhl,
  Holz-Bilderrahmen (720/Mt), Chelsea Boots Kinder.
- `suchwort_tags.py` Grundwort `ring` trifft weiter Beissring/Schwimmring/Turnringe (kein Schmuck) — nicht angefasst.
- **Klingen im Verkauf (Befund für die Klingen-Wache, nicht angefasst):** ACTIVE mit Tag `messer`: «Küchenmesser mit Strass»
  (`ist_handklinge` = ja!), «Garten-Veredelungsmesser aus geschmiedetem Stahl» und «Titanlegierung Faltmesser Mini
  Schlüsselanhänger» (Regel sagt beide Male NEIN — Regel-Loch), «Vintage Rasiermesser», «Hobelmesser für Elektrohobel».
- 3 Messgeräte tragen `messer` noch (Handle im Sperr-Ledger): smartes-fitness-armband-mit-pulsmesser-344832,
  smartes-sport-armband-mit-herzfrequenzmesser-625800, v76-gps-uhr-mit-kompass-und-hohenmesser-625300.
- Tag `uhr` speist die Kollektion `herrenuhren-schmuck` (Regel TAG = uhr, einzige Regel auf einem Grundwort-Tag): 52 aktive
  Wand-/Tisch-/Spiel-/Stoppuhren und Wecker stehen dadurch bei den Herrenuhren; der nächste Lauf fügt «Tischuhr aus
  Buchenholz» hinzu. Lösung gehört in die Kollektionsregel, nicht in den Suchwort-Tag.
- Bestandstags, die die neue Kopfwort-Regel heute abweisen würde (z. B. `armband` auf 165 Uhren, `guertel` auf 67 Kleidern),
  bleiben stehen — nur `messer`/`matte` zurückgebaut.
- Nichts committet (Workflow-Vorgabe).
