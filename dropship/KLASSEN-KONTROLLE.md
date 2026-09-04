# Klassen-Kontrolle (VOLLSCAN, 52826 aktive Produkte)

> Gemessen AM OBJEKT mit tag-toleranten Mustern, nicht ueber die Shopify-Suche.
> Eine Klassenzahl gilt nur fuer die Form, mit der man gesucht hat — deshalb dieser Lauf.

> ⚠️ **NACHGEZAEHLT am 04.09. um 17:35, nach dem Lauf** — waehrend eines Vollscans
> reparieren die Waechter weiter, die Zahl von vorhin ist nicht der Stand von jetzt:
>
> | Klasse | im Lauf gezaehlt | jetzt offen |
> |---|---:|---:|
> | USA-Lieferzusage | 987 | **0** |
> | EU-Lieferzusage | 987 | **0** |
> | Sie-Anrede im Produkttext | 1330 | 1170 |
> | Auswahl-Versprechen bei EINER Variante | 2260 | 2243 |
> | «Produktdetails» doppelt | 150 | 150 |
> | Floskel «hochwertiges Material» | 124 | 124 |
> | «Geprüfte Qualität» | 25167 | nicht nachgeprueft (Liste > 3000) |
>
> Die Arbeitslisten in `dropship/_klassen/` sind auf diesen Stand gekuerzt.

## USA-Lieferzusage im Text — 987

Der Shop liefert NUR in die Schweiz — eine USA-Zusage ist unerfuellbar (Lehre 14.08.).

Reparatur: `automation/versandaussagen_wahrheit.py  (QUELLE=live IGNORIERE_LEDGER=1)`

Vollstaendige Liste: `dropship/_klassen/usa-lieferzusage-im-text.txt`

- `15396249502081` Slim Wallet Echtleder · RFID-Schutz, Vollnarbenleder
- `15396249960833` Klassische Herrenuhr Edelstahl · Saphirglas, 50m wasserdicht
- `15396250321281` Retro Sonnenbrille Polarisiert UV400 · Unisex Vintage
- `15396404789633` LED Schreibtischlampe Dimmbar · Augenschutz, USB-C
- `15396404855169` Resistance Bands Set 5-teilig · Fitnessbänder Heim-Training
- `15397218320769` Silikon Baby-Lätzchen 5er-Set · BPA-frei, Spülmaschinenfest
- `15397247385985` Jade Roller & Gua Sha Premium Set · echter Jade, Doppelkopf-Roller
- `15397247484289` Sternenhimmel Projektor · Baby Nachtlicht mit Musik
- `15406765801857` Tech Hero Geschenkbox – Smartwatch Pro + ANC-Kopfhörer + 3-in-1 Wirele
- `15408457744769` Premium Bambus Aroma Diffuser 300ml
- `15408457941377` Rosenquarz Gua Sha Set
- `15408457974145` Jade Roller Premium Doppelseitig
- `15408458006913` Kristall-Set 3-teilig
- `15408458072449` Cellulite Massage Roller
- `15408458170753` Bambus Aufbewahrungssystem Modular
- `15408458236289` Bambus Kosmetik-Organizer Premium
- `15408458563969` Premium Home Wellness Bundle · Diffuser + 6 ätherische Öle + Salzlampe
- `15411554320769` Aroma Diffuser Holzoptik 400ml – Ultraschall Luftbefeuchter mit 7 LED-
- `15411554910593` Aromadiffusor Holzmaserung
- `15411555533185` Smartwatch Pro 1.78″ AMOLED – Herzfrequenz, Fitness-Tracker & Bluetoot
- `15411556614529` Rugged Smartwatch X5 – 5 ATM Wasserdicht, GPS, Bluetooth-Calling
- `15411563823489` Outdoor Bluetooth Speaker Solar – RGB-Licht, Wasserdicht & Tragbar
- `15411564446081` Mini Bluetooth Speaker Wasserdicht – Dusche, Outdoor & Reise mit Saugn
- `15411565035905` LED Schreibtischlampe Akku – 3 Helligkeitsstufen, Augenschutz & Sunset
- `15411565429121` Elektrischer Gemüseschneider Multifunktional – Schneiden, Reiben & Hob
- … und 962 weitere

## EU-Lieferzusage im Text — 987

Gleiche Klasse wie USA: es gibt genau EINEN aktiven Markt (Schweiz).

Reparatur: `automation/versandaussagen_wahrheit.py`

Vollstaendige Liste: `dropship/_klassen/eu-lieferzusage-im-text.txt`

- `15396249502081` Slim Wallet Echtleder · RFID-Schutz, Vollnarbenleder
- `15396249960833` Klassische Herrenuhr Edelstahl · Saphirglas, 50m wasserdicht
- `15396250321281` Retro Sonnenbrille Polarisiert UV400 · Unisex Vintage
- `15396404789633` LED Schreibtischlampe Dimmbar · Augenschutz, USB-C
- `15396404855169` Resistance Bands Set 5-teilig · Fitnessbänder Heim-Training
- `15397218320769` Silikon Baby-Lätzchen 5er-Set · BPA-frei, Spülmaschinenfest
- `15397247385985` Jade Roller & Gua Sha Premium Set · echter Jade, Doppelkopf-Roller
- `15397247484289` Sternenhimmel Projektor · Baby Nachtlicht mit Musik
- `15406765801857` Tech Hero Geschenkbox – Smartwatch Pro + ANC-Kopfhörer + 3-in-1 Wirele
- `15408457744769` Premium Bambus Aroma Diffuser 300ml
- `15408457941377` Rosenquarz Gua Sha Set
- `15408457974145` Jade Roller Premium Doppelseitig
- `15408458006913` Kristall-Set 3-teilig
- `15408458072449` Cellulite Massage Roller
- `15408458170753` Bambus Aufbewahrungssystem Modular
- `15408458236289` Bambus Kosmetik-Organizer Premium
- `15408458563969` Premium Home Wellness Bundle · Diffuser + 6 ätherische Öle + Salzlampe
- `15411554320769` Aroma Diffuser Holzoptik 400ml – Ultraschall Luftbefeuchter mit 7 LED-
- `15411554910593` Aromadiffusor Holzmaserung
- `15411555533185` Smartwatch Pro 1.78″ AMOLED – Herzfrequenz, Fitness-Tracker & Bluetoot
- `15411556614529` Rugged Smartwatch X5 – 5 ATM Wasserdicht, GPS, Bluetooth-Calling
- `15411563823489` Outdoor Bluetooth Speaker Solar – RGB-Licht, Wasserdicht & Tragbar
- `15411564446081` Mini Bluetooth Speaker Wasserdicht – Dusche, Outdoor & Reise mit Saugn
- `15411565035905` LED Schreibtischlampe Akku – 3 Helligkeitsstufen, Augenschutz & Sunset
- `15411565429121` Elektrischer Gemüseschneider Multifunktional – Schneiden, Reiben & Hob
- … und 962 weitere

## «Geprüfte Qualität» (Überzusage) — 25167

Geprueft werden ANGABEN, nicht die Ware (Lehre 29.08.). Steht im JSON-LD und im Google-Feed.

Reparatur: `automation/trust_baustein_wahrheit.py`

Vollstaendige Liste: `dropship/_klassen/gepr-fte-qualit-t-berzusage.txt`

- `15492144005505` Reine Kupfer-Krokodilklemmen für Autobatterien
- `15492251550081` Mittelalterliches Sommerkleid
- `15492251582849` V-Ausschnitt Maxi-Kleid
- `15492252008833` Samt-Kleid mit Ruffles
- `15492252107137` Elegantes Color-Block Minikleid mit eckigem Ausschnitt
- `15492253778305` Retro Halterneck Zweiteiler Weinrot
- `15492253843841` Trägerloses Casual Maxikleid
- `15492253909377` Elegantes Neckholder Maxi-Kleid
- `15492254925185` Samt-Fischschwanzkleid mit Reissverschluss
- `15492255646081` Off-Shoulder Satin-Kleid mit Taillenschnürung
- `15492255711617` Bluse mit 3D-Blumen und Rüschen
- `15492255744385` Samt-Hoodie mit Laternenärmeln
- `15492255875457` Sweatshirt mit Pflanzen-Print und Reissverschluss
- `15492257677697` Herren Wildleder-Look Stehkragenjacke
- `15492258333057` Daunenweste für Herren
- `15492261609857` Bootcut Jeans im Retro-Stil für Herren
- `15492262822273` Vintage High-Street Jeans für Herren
- `15492262855041` Streetwear Straight-Leg Jeans für Herren
- `15492262920577` Herren Jeans mit Nieten, Schwarz
- `15492262953345` Bequeme Loose-Fit Jeans für Herren
- `15492263018881` Jacquard Denim Jeans im American Style
- `15492264034689` Herren Jeans im Used-Look
- `15492264788353` Loose-Fit Denim-Hose für Herren
- `15492264821121` Distressed Jeans für Herren
- `15492264853889` Herren American-Style Gradient Jeans
- … und 25142 weitere

## «Produktdetails» doppelt — 150

Zwei Faktenbloecke mit widersprechendem Inhalt (Lehre 12.08.).

Reparatur: `automation/produktdetails_vereinen.py`

Vollstaendige Liste: `dropship/_klassen/produktdetails-doppelt.txt`

- `15412751499649` Elegantes Sommerkleid A-Linie – Hemdkragen, fliessend (Damen, 3 Farben
- `15412751860097` Strand-Rock A-Linie mit Rüschen – doppellagig, fliessend (Damen, 4 Far
- `15412752155009` Herren Business-Poloshirt – gestrickte Ice-Silk, kühlend (M–3XL, 2 Far
- `15412825063809` Bikini-Set Damen – einteilig, schmeichelhaft (S–3XL, mehrere Farben)
- `15412825194881` Neckholder-Sommerkleid mit Blumen-Print – V-Ausschnitt (Damen)
- `15412828733825` 2-teiliges Sommer-Set – Zip-Top & Rüschen-Shorts (Damen)
- `15412830634369` Strand-Cardigan «Riviera» – Leichter UV-Schutz-Überwurf
- `15412830896513` Relaxed-Fit Hoodie «Cosy» – mit Fell-Panel & Kordelzug
- `15412902953345` 2-teilige Mesh-Bluse «Résille» – Langarm mit Hollow-out
- `15412911964545` 2-teiliges Leinen-Set «Provence» – Hemd & Wide-Leg-Hose
- `15412915110273` Abendkleid «Sirène» – High-Slit Meerjungfrau mit Schleppe
- `15412915339649` Strand-Maxikleid «Bali» – luftiges Stufenkleid
- `15412915470721` Polka-Dot Retro-Kleid «Daisy» – Vintage mit Schleife
- `15412916060545` Sommerkleid «Savanna» – Western-Style Midi
- `15412918190465` Blumen-Maxikleid «Fleurette» – Neckholder mit Fishtail
- `15412919402881` Etuikleid «Lumea» – Cut-Out Sheath
- `15412919533953` Midikleid «Bluette» – Fake-2-Teiler mit V-Ausschnitt
- `15412919566721` Schnürkleid «Noir» – Schleifen-Detail
- `15412919763329` Off-Shoulder-Kleid «Brise» – locker & ärmellos
- `15412969144705` Sommerkleid «Dos Nu» – locker mit Rücken-Cut-out
- `15412969406849` T-Shirt-Kleid «Casa» – locker mit Print
- `15413023015297` Herren-Sommershirt «Breeze» – leicht & atmungsaktiv
- `15413023113601` Herren-Strickshirt «Riviera» – Cord-Kurzarm
- `15413024915841` Slip-Kleid «Nuit» – V-Ausschnitt, Langarm, elegant
- `15413025014145` Strandkleid «Playa» – Halter mit Schnür-Detail
- … und 125 weitere

## Floskel «hochwertiges Material» — 124

Werbewort in einem Faktenfeld — ein leeres Feld ist besser (Lehre 23.08.).

Reparatur: `automation/produktdetails_wahrheit.py  (IGNORIERE_LEDGER=1)`

Vollstaendige Liste: `dropship/_klassen/floskel-hochwertiges-material.txt`

- `15412751499649` Elegantes Sommerkleid A-Linie – Hemdkragen, fliessend (Damen, 3 Farben
- `15412751860097` Strand-Rock A-Linie mit Rüschen – doppellagig, fliessend (Damen, 4 Far
- `15412825063809` Bikini-Set Damen – einteilig, schmeichelhaft (S–3XL, mehrere Farben)
- `15412825194881` Neckholder-Sommerkleid mit Blumen-Print – V-Ausschnitt (Damen)
- `15412828733825` 2-teiliges Sommer-Set – Zip-Top & Rüschen-Shorts (Damen)
- `15412830634369` Strand-Cardigan «Riviera» – Leichter UV-Schutz-Überwurf
- `15412830896513` Relaxed-Fit Hoodie «Cosy» – mit Fell-Panel & Kordelzug
- `15412902953345` 2-teilige Mesh-Bluse «Résille» – Langarm mit Hollow-out
- `15412915110273` Abendkleid «Sirène» – High-Slit Meerjungfrau mit Schleppe
- `15412915339649` Strand-Maxikleid «Bali» – luftiges Stufenkleid
- `15412915470721` Polka-Dot Retro-Kleid «Daisy» – Vintage mit Schleife
- `15412916060545` Sommerkleid «Savanna» – Western-Style Midi
- `15412918190465` Blumen-Maxikleid «Fleurette» – Neckholder mit Fishtail
- `15412919402881` Etuikleid «Lumea» – Cut-Out Sheath
- `15412919533953` Midikleid «Bluette» – Fake-2-Teiler mit V-Ausschnitt
- `15412919566721` Schnürkleid «Noir» – Schleifen-Detail
- `15412919763329` Off-Shoulder-Kleid «Brise» – locker & ärmellos
- `15412969144705` Sommerkleid «Dos Nu» – locker mit Rücken-Cut-out
- `15412969406849` T-Shirt-Kleid «Casa» – locker mit Print
- `15413023015297` Herren-Sommershirt «Breeze» – leicht & atmungsaktiv
- `15413024915841` Slip-Kleid «Nuit» – V-Ausschnitt, Langarm, elegant
- `15413025014145` Strandkleid «Playa» – Halter mit Schnür-Detail
- `15413074985345` Sommer-Top «Sole» – V-Neck mit Knopfleiste
- `15413083242881` Boho Resort-Set · 2-teilig (Top & Hose)
- `15413083832705` Plateau-Sandalen · Damen, Retro-Style mit Komfort-Sohle
- … und 99 weitere

## Sie-Anrede im Produkttext — 1330

Der ganze Shop duzt. Offene Klasse (03.09.), Massenlauf ist eine eigene Entscheidung.

Reparatur: `offen — chargenweise, Diffs lesen`

Vollstaendige Liste: `dropship/_klassen/sie-anrede-im-produkttext.txt`

- `15396404855169` Resistance Bands Set 5-teilig · Fitnessbänder Heim-Training
- `15433460416897` Kabellose Gaming Maus, 3 Modi, 4800DPI, Pink
- `15445276197249` 3-Farben Ice Jelly Nude Gel Nagellack-Set
- `15445299364225` Gel Nagellack Stifte Set
- `15445799862657` Farbiger Tricolor Lidschatten-Stick
- `15445833744769` Peel-Off Lipliner Matt
- `15445834465665` Glitzer Make-up Stick
- `15445834629505` Peel-off Lip Gloss Kakao 3ml
- `15446018654593` Handgeschmiedeter Wok für authentisches Braten
- `15446023635329` Zitruspresse aus Metall
- `15446023995777` Geruchsneutrale Fliegenfalle für Innen & Aussen
- `15446267101569` Kabelloser Elite Gaming Controller
- `15446267494785` Tastatur-Maus-Konverter für Mobile Gaming
- `15446268412289` Handheld Game TV Spielkonsole
- `15446272639361` LED Laser Offroad-Scheinwerfer
- `15446273917313` Rechteckiger Pool für Outdoor & Wildnis
- `15446275457409` Koreanischer Grill für 3-5 Personen
- `15446277489025` Schmetterling Badewannenkissen mit Saugnäpfen
- `15446277816705` Violinsaiten-Set, Nickel Silber umsponnen
- `15447560978817` 3-in-1 Magnetische Ladestation
- `15447568744833` RC Fernsteuerung für Modellautos & Boote
- `15447569891713` Dual Gyroskop
- `15447618453889` Sofa Kissenbezug «Quiet Years»
- `15447627497857` Profi-Haartrockner mit Ionen-Funktion, faltbar
- `15447629955457` 5-in-1 Warmluftstyler & Lockenstab
- … und 1305 weitere

## Wirkversprechen im TITEL — 1

Wachstums- und Gegen-Befund-Zusagen sind Heilaussagen (Lehre 29.08./03.09.).

Reparatur: `von Hand: Titel · Handle+301 · SEO · Text · Alt-Text`

Vollstaendige Liste: `dropship/_klassen/wirkversprechen-im-titel.txt`

- `15525189648769` Wimpernwachstums- und Augenstift-Set

## Auswahl-Versprechen bei EINER Variante — 2260

Der Text beschreibt das CJ-Listing, nicht was wir verkaufen (Lehre 27.08.).

Reparatur: `automation/wahlversprechen.py  (meldet; FIX=1 nur fuer eindeutige Faelle)`

Vollstaendige Liste: `dropship/_klassen/auswahl-versprechen-bei-einer-variante.txt`

- `15433460973953` 3D-gedruckter Game-Joystick und Tastenkappen
- `15433462219137` Gepolsterter Velo-Sattelbezug aus Silikon und Memory Foam
- `15447577264513` Mikrojet-Reispapier für Kunstreproduktionen
- `15447579525505` Magnetarmband aus gebürsteter Bronze
- `15447589028225` Elegante Quarzuhr mit Silikonarmband
- `15447625630081` Samt-Kissenbezug mit Rüschenmuster
- `15447885087105` Quadratisches Tuch in Seiden-Optik mit Cashew-Muster, 70x70cm
- `15447910678913` Retro Sonnenbrille für Damen und Herren
- `15447915561345` Anti-Blaulicht-Brille mit UV-Schutz
- `15448801509761` Matter Lipliner
- `15448802328961` QIBEST Diamond Liquid Lidschatten
- `15448837030273` Pizza- und Teigrädchen aus Kunststoff
- `15448846074241` Swedwood Taschenmesser aus Stahl
- `15448903713153` SKMEI Sportuhr für Herren
- `15448905220481` Mechanische Armbanduhr mit Mondphase
- `15448905548161` Multifunktionale Herren Business Automatikuhr
- `15448905908609` Mechanische Armbanduhr mit Skelett-Design
- `15448906662273` Wasserdichte Automatikuhr für Herren
- `15448907055489` Herren Quarzuhr, 30M wasserdicht, leuchtend
- `15448909775233` Digitale Armbanduhr im futuristischen Design
- `15448910233985` Multifunktionale digitale Sportuhr
- `15448910299521` Wasserdichte Multifunktions-Digitaluhr für Studierende
- `15448910659969` Multifunktionale Sportuhr im Tonneau-Design
- `15448911020417` Bluetooth MP3-Player mit Touchscreen
- `15448911184257` Qinglu Outdoor Sportuhr
- … und 2235 weitere

