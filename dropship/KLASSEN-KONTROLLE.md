# Klassen-Kontrolle (VOLLSCAN, 51949 aktive Produkte)

> Gemessen AM OBJEKT mit tag-toleranten Mustern, nicht ueber die Shopify-Suche.
> Eine Klassenzahl gilt nur fuer die Form, mit der man gesucht hat — deshalb dieser Lauf.

## «Geprüfte Qualität» (Überzusage) — 29468

Geprueft werden ANGABEN, nicht die Ware (Lehre 29.08.). Steht im JSON-LD und im Google-Feed.

Reparatur: `automation/trust_baustein_wahrheit.py`

- `15476559151489` Schmale Sweaterjacke
- `15476559217025` Krokodilmuster-Tote
- `15476559479169` Schultertasche Business
- `15476673970561` Weisse Vorhang
- `15476674068865` Sonnenblenden-Vorhang
- `15476674134401` Stickerei Vorhang
- `15476915536257` Warmes V-Ausschnitt Unterhemd
- `15476989723009` Anmei 18-teiliges Make-up Pinselset aus Tierhaar
- … und 29460 weitere

## «Produktdetails» doppelt — 1542

Zwei Faktenbloecke mit widersprechendem Inhalt (Lehre 12.08.).

Reparatur: `automation/produktdetails_vereinen.py`

- `15447603937665` Herren Jacquard Polo-Shirt mit Reissverschluss
- `15447604658561` Polo-Shirt Kurzarm Slim-Fit Piqué-Baumwolle
- `15447604855169` Herren Windbreaker Laufjacke mit Stehkragen
- `15447606198657` Jacquard Polo-Shirt mit Reverskragen
- `15447606821249` Lederjacke mit abnehmbarem Futter
- `15447607148929` Outdoor Shell Jacke für Herren
- `15447607443841` Leichte Leinenjacke für Herren
- `15447607673217` Outdoor Sportshirt mit UV-Schutz
- … und 1534 weitere

## Floskel «hochwertiges Material» — 93

Werbewort in einem Faktenfeld — ein leeres Feld ist besser (Lehre 23.08.).

Reparatur: `automation/produktdetails_wahrheit.py  (IGNORIERE_LEDGER=1)`

- `15449105203585` Cardigan mit Lochmuster und Rüschen
- `15449105334657` Japanischer Retro Colorblock Herz Pullover
- `15449105957249` Herren Outdoor Kapuzenpullover
- `15449107661185` Sommerliches Kurzarm-T-Shirt mit Herz-Stickerei
- `15449107726721` Elegante Langarmbluse mit V-Ausschnitt und Rüschen
- `15449107988865` Damen Bluse mit Print
- `15449108021633` Pullover-Shirt mit Button-down-Kragen
- `15449108087169` Damen-Bluse mit Laternenärmeln und 3D-Druck
- … und 85 weitere

## Sie-Anrede im Produkttext — 1339

Der ganze Shop duzt. Offene Klasse (03.09.), Massenlauf ist eine eigene Entscheidung.

Reparatur: `offen — chargenweise, Diffs lesen`

- `15396404855169` Resistance Bands Set 5-teilig · Fitnessbänder Heim-Training
- `15431914783105` Armband «Thomas Sabo» Multicolor
- `15433457238401` 6-in-1 verstellbarer Hantelsatz Sixfit InnovaGoods · Eisen
- `15433460416897` Kabellose Gaming Maus, 3 Modi, 4800DPI, Pink
- `15434092806529` Wanddekoration DKD Home Decor Holz Rosa Flamingo Tropical
- `15438561476993` Fitnessstation & Klimmzugturm – Dein Home-Gym für Erfolg
- `15438841348481` Sporttasche mit Schuhfach – Alles dabei, sauber getrennt.
- `15439499854209` Muskel-Profi: Massagepistole mit Wärme & Kälte Power
- … und 1331 weitere

## Wirkversprechen im TITEL — 10

Wachstums- und Gegen-Befund-Zusagen sind Heilaussagen (Lehre 29.08./03.09.).

Reparatur: `von Hand: Titel · Handle+301 · SEO · Text · Alt-Text`

- `15452704571777` Firmen Serum gegen Falten
- `15453763731841` Kratzbrett gegen Schuppen
- `15496395293057` Halscreme gegen Falten
- `15496519090561` Pro-Xylane Augencreme gegen Falten
- `15496531116417` Lasertherapie-Kamm gegen Haarausfall
- `15502557151617` Aloe Vera Seidenmaske gegen Akne
- `15506240635265` Massagekamm mit Rotlicht gegen Haarausfall
- `15509395145089` Tranexamsäure Serum gegen Pigmentflecken (50ml)
- … und 2 weitere

## Mess-Versprechen an Wearables — 3

Kein optisches Armband misst Blutdruck, EKG oder Blutzucker (Lehre 11.08.).

Reparatur: `automation/wearable_messversprechen.py  (QUELLE=live)`

- `15448871797121` Smart Ring Gesundheits-Tracker mit Ladecase
- `15493864849793` Smartwatch Schutzhülle mit Displayschutz
- `15523115729281` Smartwatch-Gehäuse mit kabellosem Ladegerät

## Auswahl-Versprechen bei EINER Variante — 2704

Der Text beschreibt das CJ-Listing, nicht was wir verkaufen (Lehre 27.08.).

Reparatur: `automation/wahlversprechen.py  (meldet; FIX=1 nur fuer eindeutige Faelle)`

- `15433460973953` 3D-gedruckter Game-Joystick und Tastenkappen
- `15433462219137` Gepolsterter Velo-Sattelbezug aus Silikon und Memory Foam
- `15447577264513` Mikrojet-Reispapier für Kunstreproduktionen
- `15447579525505` Magnetarmband aus gebürsteter Bronze
- `15447589028225` Elegante Quarzuhr mit Silikonarmband
- `15447625630081` Samt-Kissenbezug mit Rüschenmuster
- `15447885087105` Quadratisches Tuch in Seiden-Optik mit Cashew-Muster, 70x70cm
- `15447910678913` Retro Sonnenbrille für Damen und Herren
- … und 2696 weitere

