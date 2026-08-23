# Katalog-Audit LuxeStyle CH — Abschlussbericht

**Stand 2026-08-23** · Prüfgrundlage: lokale Vollexporte (46'752 aktive Produkte) plus Live-Gegenproben gegen die Admin-API. Jeder Befund wurde von einem zweiten Durchgang gezielt zu widerlegen versucht; das Urteil steht bei jedem dabei.

---

> **Wie dieser Bericht entstanden ist:** 108 Agenten in zwei Stufen — 20 Finder-Dimensionen
> auf lokalen Vollexporten, danach zu JEDEM Befund ein Skeptiker mit dem Auftrag, ihn gegen
> die Live-Daten zu WIDERLEGEN. Im Zweifel galt ein Befund als nicht gehalten.
> **87 Befunde geprüft, 41 haben standgehalten.** Die widerlegten stehen in Abschnitt 3 —
> dieser Abschnitt ist so wertvoll wie die Befunde selbst, weil er verhindert, dass die
> nächste Session dieselbe Sackgasse läuft.


## 0. Vorbemerkung — was «kostet Geld» hier heisst

Der Shop hat insgesamt rund **fünfzehn Bestellungen**. **Kein einziger Befund dieses Audits hat einen belegten Verlust verursacht.** Wo unten «kostet Geld» steht, heisst das ausschliesslich eines von zwei Dingen:

- **verhindert einen Verkauf**, der sonst zustande gekommen wäre (unlesbarer oder unauffindbarer Titel im Google-Kanal, dem einzigen Kanal mit belegten Verkäufen), oder
- **kostet beim nächsten Mal** (Markenrisiko im Merchant-Konto, Vertrauensverlust im Kaufmoment).

Keine dieser Zahlen ist ein gemessener Frankenbetrag. Wer sie so weitergibt, gibt sie falsch weiter.

Ein zweiter Vorbehalt: Mehrere Zahlen des Finders haben der Nachzählung nicht standgehalten — in beide Richtungen. Abschnitt 5 listet jede Abweichung.

---

## 2. Gehaltene Befunde

### 🔴 KRITISCH — 24 Klemmbaustein-Sets mit fremden Automarken im Titel, alle im Google-Kanal

**Gezählt:** 25 aktive Bausteine-Produkte mit Fremdmarke im Titel, minus 1 belegter Fehltreffer = **24**. (Finder sagte 15; der Skeptiker hat den Befund formal gekippt, weil die Zahl falsch war und ein Fall danebenlag — die Sache selbst hat er **nach oben** korrigiert. Deshalb steht sie hier und nicht in Abschnitt 3.)

**Beleg, live ACTIVE und `isPublished=true` für «Google & YouTube»:**
- `15504155640193` «Bausteine Ferrari 288 GTO Modell»
- `15504156852609` «Legendärer BMW M1 Bausteine – Speed Serie»
- `15510325264769` «Baustein-Modell Porsche 911 RWB Blau»
- `15501002736001` «Modellbausatz Audi R8 (350 Teile)» — Beschreibung: «Dieser Modellbausatz des Audi R8 bietet stundenlangen Spass für Jugendliche zwischen 7 und 14 Jahren», kein Lizenzhinweis
- Vom Skeptiker nachgetragen, ebenfalls live ACTIVE + Google: `15504006873473` «Rolls-Royce Baustein-Auto auf Rädern», `15504013132161` «Subaru Bausteine zum Zusammenbauen», `15510325428609` «AMG G63 6X6 Offroad-Modellbausatz», `15501917127041` «Dodge Challenger Baukasten», `15510325985665` «Bausteine AC Cobra Automodell`, `15504155443585` «Bausatz De Tomaso Pantera GT5 Sportwagen»
- Grenzfälle mit chinesischer Transkription: `15503165948289` «Baoma E30 M3 M10340», `15503233974657` «Baoma M4 GT4 G82» (Baoma = BMW; die BMW-Modellcodes stehen daneben)

**Warum es kostet:** Google Merchant sperrt Konten wegen Markenrechtsverletzung ohne Vorwarnung. Google ist der einzige Kanal mit belegten Verkäufen. Der Markenname steht im Titel — dem Feld, das Google zuerst liest.

**Reparatur:** Markenwort aus dem Titel streichen, Produkt behalten (Muster vom 12.08., «im Chanel-Stil»): «Klemmbausteine Sportwagen-Coupé, 1:14». Bis dahin aus dem Google-Kanal nehmen, **nicht draften** — die Ware ist verkäuflich, nur nicht unter diesem Namen. ⚠️ Bei `15503165948289` steht der Markencode **auch im Optionswert** («Farbe: Baoma E30 M3 M10340») — dieselbe Lehre wie beim Handle am 21.08.: eine Aussage aus einem Feld zu entfernen heilt die anderen Felder nicht.

**Wer schreibt das Feld beim nächsten Produkt:** Der CJ-Importer, ungeprüft. Es gibt keine Marken-Titelwache. Die jüngsten Treffer stammen aus dem laufenden Grind — **die Klasse wächst täglich weiter.** Quellenfix: Automarken-/Figurenliste beim Anlegen gegen den Titel prüfen, aber **nur wenn kein Kompatibilitätswort** (für/kompatibel/passend/geeignet) im Titel steht — sonst fällt zulässiges Autozubehör mit.

**Nicht mitgezählt (geprüft):** `15452719546753` «Herren Sweater … Adidas» und `15453466329473` «Unisex-Sonnenbrille Converse» — echte Markenware aus dem BigBuy-Bestand mit Herstellerreferenz in der Beschreibung.

---

### 🟠 HOCH — 484 aktive Produkte tragen einen Titel, den ein anderes aktives Produkt ebenfalls trägt

**Gezählt:** 234 Gruppen / **484 Produkte**, davon **352 im Google-Kanal** — vom Skeptiker Wert für Wert reproduziert (auch 28 Gruppen mit >2× Preisunterschied, 5 mit >3×, 20 mit exakt gleichem Preis, 331 CJ / 153 Fortura). ⚠️ Die Zahl gilt **normalisiert** (Kleinschreibung, Umlaut-Transkription, Satzzeichen). Bei exaktem Titelvergleich sind es 75 Gruppen / **164 Produkte** — das ist zugleich die korrigierte Zahl des separaten Kurztitel-Befunds, der damit in diesem hier aufgeht.

**Beleg, live gegengeprüft:**
- `15445799666049` «Make-up Pinselset, 10-teilig» und `15495143555457` «Make-up Pinselset (10-teilig)» — beide ACTIVE, beide CHF 15.90, verschiedene SKUs, **beide in allen sechs Kanälen inkl. Google**
- `15448880480641` / `15478470017409` / `15479513514369` / `15504228221313` «Smart Armband mit Herzfrequenzmessung» — vier aktive Produkte, ein Name, CHF 94.90 / 26.90 / 46.90 / 27.90
- `15450039222657` / `15496147501441` «Herren Business Schuhe aus Leder» — CHF 14.90 gegen CHF 63.90

**Es sind keine Dubletten:** 0 Gruppen mit SKU-Überschneidung, 0 mit gleichem Hauptbild. Nach der Futternapf-Regel vom 20.08. ist die Reparatur ein **unterscheidbarer Titel, kein Draft**.

**Reparatur:** Je Gruppe das Merkmal in den Titel ziehen, das die Artikel tatsächlich trennt (Marke, Mass, Ausstattung) — bei den drei «Plüsch Elefant» steht es in der Beschreibung: Laurana 45 cm / Laurana 70 cm / Unitoys 30 cm grau. Reihenfolge: erst die 28 Gruppen mit >2× Preisunterschied, dann die 352 im Google-Kanal. Danach ein täglicher **Melde**-Wächter auf normalisierte Titelgleichheit — sein `FERTIG` darf **nicht** an die Zahl der Meldungen hängen (Lehre `fremdzeichen_guard`, 21.08.).

**Wer schreibt das Feld beim nächsten Produkt:** Die Dubletten-Wache in `cj_category_fill.mjs` erkennt Handles nur in der Form `^slug-<Ziffern>$`. Das zweite Pinselset trägt `make-up-pinselset-10-teilig-c71e9b` — **Hex-Suffix statt Ziffern**, die Wache konnte es nicht sehen. Bei 84 von 232 datierbaren Gruppen sind alle Mitglieder seit dem 01.08. entstanden: **die Klasse wächst täglich.**

⚠️ Ein Nebenbefund für die Reparatur: Die Kollision «Smart-Armband» (`15450857603457` gegen `15481067405697`) ist **selbst erzeugt** — `wearable_messversprechen.py` hat am 21.08. einen Titel beschnitten und dabei einen bestehenden getroffen. Ein Titel-Beschneider braucht eine Kollisionswache. (Derselbe Handle trägt weiter «…mit-blutdruckmessung…»; `handle_messversprechen.py` hat ihn nicht erwischt.)

---

### 🟠 HOCH — 95 Produkttitel sind vollständig englisch, 90 davon im Google-Kanal

**Gezählt:** Finder 35, Skeptiker nach unabhängiger Prüfung mit zwei echten Wortlisten (370k EN / 686k DE) **95** im harten Kern (128 inkl. Grenzfällen). Die Abweichung geht **zulasten des Finders** — er war zu vorsichtig.

**Beleg, live ACTIVE:** `15450854752641` «Small blanket nap blanket» · `15448820384129` «Tyrant Rotten Face Mask» · `15466042065281` «Indoor Spotlight Floor Corner Small Spotlight» · `15500975079809` «Original New Dog Collar» · `15479436935553` «Brogue Dress Shoes» · nachgetragen: `15448801214849` «Natural Color Concealer», `15490937815425` «Lip Glaze», `15453744431489` «Aerial Photography Drone 8K HD», `15496604582273` «Gear Gun Black Mechanical Pocket Watch». Schwerpunkt: Nagel-/Make-up-Ware und Diamond Painting.

**Warum es kostet:** Es gibt genau **einen** aktiven Markt (Switzerland, `['CH']`) — niemand ausserhalb kann auschecken. Ein englischer Titel matcht keine deutschsprachige Suchanfrage; das Produkt ist im einzigen verkaufenden Kanal faktisch unsichtbar, belegt dort aber Platz. «Tyrant Rotten Face Mask» ist selbst auf Englisch bedeutungslos.

**Reparatur:** Übersetzen, Quelle ist die bereits deutsche Beschreibung. ⚠️ Jeder generierte Titel muss gegen das **Hauptbild** plausibilisiert werden (Frischematte→«Mauspad»-Falle, CLAUDE.md Regel 9).

**Wer schreibt das Feld beim nächsten Produkt:** Die CJ-Importer publizieren ACTIVE ohne jede Sprachprüfung. Der Bild-Guard verlangt ≥1 READY-Bild — eine Titel-Sprachwache fehlt. Quellenfix: kein deutsches Wort im Titel → **DRAFT statt ACTIVE**.

**Nicht mitgezählt (bewusst):** branchenübliches Tech-Deutsch («3-in-1 Wireless Charger», «M18 True Wireless In-Ear Headset») — 33 Fälle herausgerechnet.

---

### 🟠 HOCH — Der Produktdetails-Block gibt den rohen englischen CJ-Variantenschlüssel als «Farbe» aus

**Gezählt:** **1'055** aktive Produkte (Finder 1'017). ⚠️ Die Zahl hängt an der Wortliste; **belegte Untergrenze mit maximal strengem Wortsatz: 938**. Wer die Zahl weitergibt, nennt 938 als harte Untergrenze. Basis: 4'925 aktive Produkte haben überhaupt eine «Farbe:»-Zeile in diesem Block.

**Beleg, live ACTIVE:**
- `15450538115457` «Gefütterte British Style Plattform-Boots» → «Farbe: Black-38-With velvet, Black-38-Without velvet, … Dark Brown-44-Without velvet» — **28 Einträge für 2 Farben**
- `15447958192513` → «Farbe: Beige-2XL-Men's, Beige-2XL-Women's, Beige-3XL-Men's, …»
- `15447966515585` → «Farbe: JJF106230color-Dad 2XL, JJF106230color-Kid 2Y» — Lieferanten-Artikelnummer im Farbwert
- Unterklasse «voller Variantenschlüssel»: Finder 98, nachgezählt **371**

**Der entscheidende Beleg dafür, dass es eine eigene, unberührte Stelle ist:** Von 1'044 Treffern haben **579 im frischen Optionsexport bereits saubere deutsche Optionswerte**, während der Beschreibungstext englisch bleibt. `15412976746881`: Optionen `['Marineblau','Grau','Schwarz','Khaki','Bordeaux','Pink']` — Beschreibung «Navy, Gray, Black, Khaki, Burgundy, Pink». Die Farbwert-Übersetzung und die heutigen Grössen-/Mass-Reparaturen haben die **Optionen** geheilt, den **Beschreibungstext** nie angefasst.

**Reparatur:** Der Block ist ein eingefrorener Abzug der CJ-Rohdaten zum Importzeitpunkt (Gegenbeleg: bei `15450538115457` nennt er «Grösse: XS, S, M, L, XL», die echten Werte sind Schuhgrössen 38–44). Wirksamster Schnitt: Die Zeile «Farbe:» im Produktdetails-Block **streichen**, wo der redaktionelle Text ohnehin eine deutsche Farbliste nennt. ⚠️ Vorher zählen, wie viele Produkte **nur** diese Liste haben — dort darf sie nicht ersatzlos weg.

**Wer schreibt das Feld beim nächsten Produkt:** Der Beschreibungs-Generator der CJ-Importer. Er benutzt `automation/farben_de.json` (seit 21.08. die einzige Farbquelle) **nicht**. Ohne Quellenfix wächst die Klasse mit jedem Import.

---

### 🟡 MITTEL — Inhaltsleere Platzhalter: «Material: hochwertiges Material», «Farbe: verschiedene Farben»

**Gezählt und exakt reproduziert:** **2'573** aktive Produkte mit «Material: hochwertiges Material», 1'406 mit «Farbe: verschiedene Farben», 816 mit beidem. Harter Kern, bei dem der Platzhalter die **einzige** Materialangabe ist: 2'031 (bei Farben: 1'218).

**Beleg, live ACTIVE, wörtlich identisch:** `15397218320769` «Silikon Baby-Lätzchen 5er-Set» · `15411565035905` «LED Schreibtischlampe Akku» · `15412678328705` «Smart-Anzuchtset mit LED-Pflanzenlampe» → alle drei: «Produktdetails Farbe: verschiedene Farben **Grösse: XS, S, M, L, XL** Material: hochwertiges Material». Bei einer Schreibtischlampe und einem Anzuchtset ist die Grössenleiste keine Sprachschwäche mehr, sondern eine Falschangabe.

Das Repo wertet es selbst als Defekt: `automation/material_metafeld_korrigieren.py` nennt «hochwertiges Material» im eigenen Kopf «Extraktionsmüll» und «eine Werbeaussage in einem Faktenfeld» — repariert wurde damals nur das **Metafeld**, nicht der sichtbare Text.

**Reparatur:** Ein Feld ohne Wert gehört **weggelassen**, nicht mit einem Füllwort belegt. Eine fehlende Zeile ist ehrlich, eine erfundene ist eine Aussage.

**Wer schreibt das Feld beim nächsten Produkt: niemand mehr.** Über `createdAt` ausgezählt tragen den Defekt ausschliesslich Produkte vom 17.05. bis 13.07.2026; **ab dem 14.07. null Treffer unter über 28'000 seither angelegten aktiven Produkten.** Die Quelle ist längst dicht. Das ist reiner Altbestand — anders als die drei Befunde darüber wächst diese Klasse **nicht**. Deshalb mittel und nicht hoch.

---

### 🟢 NIEDRIG — Unübersetzte Lieferanten-Feldnamen im Fliesstext

**Gezählt:** **58** (Finder 57; die Differenz ist `AL-ALLOY` in Grossschreibung, die seine fallunterscheidende Suche verpasste). Aufteilung: 53× «Alloy», 3× «Packing list», 1× «Feature:», 1× «Specification». Überschneidungsfrei.

**Beleg, live ACTIVE:** `15449463456129` «Zitronenbecher mit Strohhalm» → «ist aus hochwertigem **Alloy** gefertigt» · `15449592725889` → «aus einer Kupfer-legierten **Alloy** gefertigt» · `15500202836353` → «**Packing list**: Kurlock \* 1 Anleitung \* 1» (Sternchen-Schreibweise des chinesischen Feeds) · `15503902441857` → «Stil: Einfach und lässig **Feature**: Print».

**Vier Fälle sind gröber als «niedrig»** — dort ist der ganze Produktname englisch geblieben: `15496253866369` «Das **Alloy Outdoor A Folding Knife** ist ein…», `15499872600449` «Das **Navy Blue Plaid Gold Button Dog Collar Alloy Buckle** besteht aus Leinen», `15500514853249`, `15499872993665`.

**Reparatur:** Kleine Ersetzungsliste im Beschreibungs-Generator (Alloy→Legierung, Zinc Alloy→Zinklegierung, Packing list→Lieferumfang, Feature→Merkmal, Specification→Ausführung), **plus eine vierte Schreibweise**, die der Finder nicht kannte: `15454193418625` «**Packingliste**: Futterstation \*1». Vor dem Lauf alle Trefferzeilen einmal ausdrucken und lesen.

**Wer schreibt das Feld beim nächsten Produkt:** Der Textgenerator der CJ-Importer, laufend — `createdAt` der Treffer reicht bis **22.08.2026** (je 1–4 Fälle am 12., 14., 15., 17., 18., 22.08.). Kein Altbestand.

---

## 3. Widerlegt — bitte nicht nochmals aufwerfen

### ❌ «Die Code-im-Titel-Regex verlangt zwei Buchstaben, dadurch rutschen 159 Code-Titel in den Google-Kanal»

**Korrigierte Anzahl: 0.** Die Regex-Beobachtung stimmt (identisch in `gfeed_score.py:15`, `google_kanal_nachziehen.py:56`, `google_kanal_luecke_schliessen.py:45`), die **Kausalkette ist falsch**. Von den 10 zitierten IDs steht **keine einzige** in einem der drei Ledger (0 von 1'084 / 0 von 71 / 0 von 134). Publiziert hat sie der **Importer**, der gar keine Titel-Code-Prüfung hat — das `CODETOKEN` in `cj_category_fill.mjs:85` gilt ausschliesslich für **Varianten-Farbwerte**. Zwei der drei Wächter können ohnehin nur hinzufügen.

**Eine Verbreiterung wäre Schaden, keine Reparatur:** Der einzige entfernende Pfad ist `gfeed_apply.py:26` (`publishableUnpublish`) — sie würde aus dem einzigen Kanal mit belegten Verkäufen **entfernen**. Genau dieser Regelsatz wurde schon einmal zurückgenommen (4'330 Produkte zurückgeholt).

**Die Zwei-Buchstaben-Bedingung ist Absicht.** 124 der 381 Kandidaten sind nachweislich keine Lieferantencodes: 29× PlayStation (`15448851874177` «PS4 kabelgebundener Controller»), 9× Modestil «Y2K», 44× Silbernorm S925, DDR4/USB4/QC3.0, Gewindenormen M14/M22/MK8/M42/MC4, DIN-Formate A4/A5, Flugzeugmodelle F-22/F-35, Griffmaterial G10, Akkutypen V8/P108/M12 (Dyson/Ryobi/Milwaukee) — und `15450855899521` «GOT7 Baumwoll-Hoodie», eine K-Pop-Band.

### ❌ «80 Gruppen unterscheiden sich nur in der Wortreihenfolge — versteckte Dubletten»

**Korrigierte Anzahl: 0.** Die Mechanik ist reproduzierbar (78 Gruppen / 159 Produkte, nicht 80/165 — der Befund widerspricht sich selbst und nennt an anderer Stelle «78»). Aber es sind **keine Dubletten**: **0 von 78** Gruppen teilen sich eine Lieferanten-SKU, **0** teilen sich das Hauptbild, 74 von 78 haben klar verschiedene Beschreibungen, **0** eine wortgleiche.

Das Kronzeugen-Beispiel widerlegt sich selbst: `15447560978817` (CHF 196.90) ist eine Aluminium-Station **ausschliesslich für Apple-Geräte**, `15499700142465` (CHF 70.90) eine **Qi2-zertifizierte 15W-Station für Smartphones** — angelegt am 03.07. bzw. 14.08., also nicht einmal derselbe Importlauf. Der Preisunterschied kommt von der Ware. Der Befund kehrt die Lehre vom 20.08. um.

### ❌ «258 Produkte tragen einen Ein-Wort-Titel ohne jede Eigenschaft»

**Korrigierte Anzahl: 140** (grosszügig gerechnet; der harte Kern liegt darunter). Drei Gründe:

1. **«Ohne jede Eigenschaft» ist für 82 von 258 falsch** — und die eigenen Belege widerlegen es: «Keramiktopf» nennt das Material, «Leder-Tote» das Material, «Damenhemd» das Geschlecht, «Duschrollo» den Einsatzort, «Halsmassager» die Körperstelle, «Falttisch» die Funktion. Deutsche Komposita sind keine eigenschaftslosen Titel.
2. **39 von 258 sind Fasnachts-/Kostümartikel**, bei denen das eine Wort der Handelsname ist («Sombrero», «Hexenhut», «Wikingerhelm») — **alle 39 sind ausserhalb des Google-Kanals**, können den behaupteten Schaden also gar nicht anrichten. Und die drei auffälligsten Zitate des Befunds stammen genau daraus: `15469989822849` «Hupe», `15470023475585` «Bulle», `15469991330177` «Sense» sind alle `productType` «Kostüme & Verkleidung» (Tröte, Bullen-Kostüm, Sensenmann-Sense).
3. **Die Schwelle ist ein Artefakt:** kumulativ 162 (≤11 Zeichen) / 258 (≤12) / 388 (≤13) / 527 (≤14). Ein Zeichen mehr = +50 % Treffer. Und «ein Wort» misst Bindestriche, nicht Information: «Damen-High-Waist-Ripped-Stretch-Jeans» gilt nach derselben Regel als Ein-Wort-Titel.

Die Sachfrage bleibt berechtigt (dünne Titel schaden im Google-Kanal), die Klasse in dieser Form nicht.

### ❌ «347 Produkte mit chinesischen Fantasie-Farbnamen im redaktionellen Fliesstext»

**Korrigierte Anzahl: 241.** Die Belege stimmen alle wörtlich («Cultivating rubies», «Little Carrot Bunny», «Deep Space Gray»), aber:

- **Die Zahl ist nicht reproduzierbar** — breit 461, bereinigt 300, echte mehrwortige Fantasienamen 241. 347 entspricht keiner Lesart.
- **«Redaktionell geschrieben» stimmt nicht**: 173 von 461 (38 %) stehen in einem maschinellen Attribut-Dump (direkt gefolgt von «Material:», «Stil:», «Saison:»), nur 129 wirklich in Prosa.
- **154 Produkte hängen an normalem deutschem Modevokabular**: 120× allein «Apricot», 27× «Off-White», 5× «Navy Blue», 2× «Teal». Beleg: `15448020746625` → «Farben: Burgund, Khaki, Schwarz, Kaffeegrau, Gelb, Grau, Braun, Pink, **Teal**, Hellblau» — 9 von 10 Einträgen deutsch. Genau die Falle, die CLAUDE.md dokumentiert («Pink», «Khaki», «Beige» sahen wie 4'352 unübersetzte Werte aus).
- **«Space Gray» ist Apples offizielle Gerätefarbe** (`15481258148225`), «Tiffany Blue» und «Klein Blue» sind international etablierte Eigennamen. Eine Übersetzung würde die Seite verschlechtern.

⚠️ Der Lizenz-Nebenbefund bleibt gültig und gehört separat geprüft: `15447963271553` (Kinder-Unterwäsche) führt **«Hello Kitty»** als Farbnamen.

### ❌ «Dieselbe Farbliste zweimal — 223-mal mit widersprüchlichem Inhalt»

**Basiszahl hält: 1'321** aktive Produkte tragen «Farben:» **und** «Farbe:» im selben Text, exakt reproduziert, alle vier Belege live wörtlich korrekt. **Die Kernaussage des Titels hält nicht:**

- **«223 widersprüchlich» ist nicht reproduzierbar** — vier Parser-Varianten ergeben 206/207/208/216, nie 223. Und mindestens 64 davon sind **Parse-Artefakte**: Konjunktion statt Komma (`15447992074625` «Schwarz, Weiss, Hellgrün **und** Rosenrot» gegen «Schwarz, Weiss, Hellgrün, Rosarot» — identisch), Farb-×-Grössen-Kombinationen (`15447967433089` «Black-110cm, Black-120cm … Black-Mom S» = 64 Varianten, nicht 64 Farben), Platzhalter (`15447606198657` «Farbe: verschiedene Farben»). Belastbare Spanne: **86 bis 155**.
- **«122 einmal deutsch, einmal englisch»**: strenger Test ergibt 42, lockerer 729 — 122 ist mit keiner Methode nachvollziehbar.
- **Die Rahmung «oben deutsch/redaktionell, unten roh/englisch» stimmt nicht** — und ausgerechnet ein Beleg des Befunds dreht sie um: `15412899676545` «Hydro» hat die **englische** Liste im Verkaufstext («🎨 3 Farben: Orange, Black, White») und die **deutsche** in den Produktdetails.
- **Schwere hoch ist nicht gedeckt:** 853 der 1'321 (65 %) haben inhaltlich identische Listen — reine Dopplung, kein Widerspruch, kein Rechts-/Liefer-/Merchant-Risiko.
- **209 der 1'321 sind der bekannte Doppelblock** (CLAUDE.md 12.08., 1'444 Produkte), also keine neue Klasse.

Der Reparaturvorschlag bleibt trotzdem der richtige — er ist identisch mit dem des gehaltenen Befunds oben (Zeile «Farbe:» streichen, wo eine deutsche Liste existiert).

---

## 4. Geprüft und sauber

- **Keine echten Dubletten im Katalog.** In allen drei untersuchten Titelgleichheits-Klassen: 0 Gruppen mit SKU-Überschneidung, 0 mit identischem Hauptbild. Der Grind hat **keine Ware doppelt angelegt** — er hat sie nur gleich benannt. Das schliesst pauschales Draften aus.
- **Die Platzhalter-Quelle ist dicht.** Ab 14.07.2026 kein einziger neuer Fall von «hochwertiges Material» unter über 28'000 seither angelegten aktiven Produkten.
- **Titellängen sind unauffällig.** Längster Titel im ganzen Katalog: 88 Zeichen. Über 120 Zeichen: null. Keine gekappten, keine Keyword-Monster-Titel.
- **Die Zwei-Buchstaben-Bedingung der CODE-Regex ist kein Versehen**, sondern der Schutz für PS4/PS5, A4/A5, M14/M22/M42, S925, DDR4, USB4, G10, Y2K, GOT7 — 124 belegte Fälle.
- **«Alloy» ist keine Substring-Falle.** Alle 53 Fundstellen im Kontext gelesen: kein deutsches Wort, kein Markenname, keine Verneinung, kein Grössensystem. Der Katalog liefert die Übersetzung selbst mit (`15454056612225` «Material: Alloy (Legierung)»), es ist also Lieferantenjargon, kein Fachbegriff.
- **Echte Markenware ist korrekt gekennzeichnet** und **kein** Markenrechtsfall: `15452719546753` (Adidas-Sweater), `15453466329473` (Converse-Sonnenbrille) — beide mit Herstellerreferenz aus dem BigBuy-Bestand.
- **Kein Fehlgriff im Muster** bei zwei Befunden trotz gezielter Suche: englische Feldnamen (58) und Titel-Dubletten (484). Bei den Dubletten sind alle 160 abweichenden Rohtitel-Gruppen reine Bindestrich-/Komma-Differenzen, alle 7 Buchstabendifferenzen sind Umlaut-Transkriptionen desselben Worts (die in CLAUDE.md §9c dokumentierte Falle).
- **Designnamen in Anführungszeichen und Mischtitel mit deutschem Grundwort sind kein Fehler**: `15427281584513` «Tasse ‹Swiss Army Knife›», «Kabelloser Mini Bluetooth Lautsprecher» — normales Schweizer Handelsdeutsch, in keiner Zählung enthalten.

---

## 5. Wo Finder und Skeptiker sich widersprachen

| Befund | Finder | Skeptiker | **Gültig** |
|---|---:|---:|---:|
| Klemmbausteine mit Automarke | 15 | 25 − 1 Fehltreffer | **24** |
| Vollständig englische Titel | 35 | 95 (hart) / 128 (inkl. Grenzfälle) | **95** |
| Titel-Dubletten (normalisiert) | 484 | 484 reproduziert | **484** (exakt: 164) |
| Kurztitel-Dubletten <15 Zeichen | 43 | über alle Längen 164 | **164** — geht in der Zeile darüber auf |
| Produktdetails-Farbe englisch | 1'017 | Band 938–1'055 | **1'055** (Untergrenze **938**) |
| …davon voller Variantenschlüssel | 98 | 371 | **371** |
| Platzhalter «hochwertiges Material» | 2'573 | 2'573 exakt | **2'573** |
| …«Farbe: verschiedene Farben» | 1'407 | 1'406 | **1'406** |
| …«Grösse: XS,S,M,L,XL» zusätzlich | 448 | 314 (in den 816) / 1'052 (gesamt) | **314** |
| …«Color 1, Color 2, …» | 30 | 4 exakt / max. 12 | **4** |
| …davon keine Bekleidung | 33 | 15 − 1 eigener Fehltreffer | **14** |
| Englische Feldnamen (Alloy etc.) | 57 | 58 (+1 vierte Schreibweise) | **58** |
| Doppelte Farbliste — Basis | 1'321 | 1'321 exakt | **1'321** |
| …davon widersprüchlich | 223 | 206 max., 86 konservativ | **86–155** |
| …davon deutsch/englisch gemischt | 122 | 42 streng / 729 locker | **42** |
| Chinesische Fantasie-Farbnamen | 347 | 241 | **241** |
| Ein-Wort-Titel ohne Eigenschaft | 258 | 140 nach Abzug Kostüm/Komposita | **140** |
| Wortreihenfolge-«Dubletten» | 165 | 159 gezählt, 0 echte | **0** |
| Code-im-Titel durch Regex-Lücke | 159 | 0 durch die Lücke publiziert | **0** |

**Muster in den Abweichungen:** Der Finder war bei zwei Befunden zu **vorsichtig** (englische Titel, Automarken) und bei fünf zu **grosszügig** (Fantasienamen, Ein-Wort-Titel, Wortreihenfolge, Nebenzahlen der Platzhalter, Widersprüche in Farblisten). Die zu grosszügigen Zahlen entstanden fast alle auf dieselbe Weise: **eine willkürliche Schwelle** (12 Zeichen, 15 Zeichen) oder **eine zu weite Wortliste**, die deutsche Lehnwörter als englisch zählte. Beides sind bekannte Fallen dieses Projekts.