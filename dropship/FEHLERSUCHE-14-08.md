# Fehlersuche 14.08.2026 — 30 Dimensionen, 108 Agenten
**56 bestätigt · 22 widerlegt.** Jeder Fund wurde von einemzweiten Agenten live gegengeprüft, dessen ausdrückliche Aufgabe war, ihn zu WIDERLEGEN.

## Bestätigt

### [mobil] Auf dem Handy verdeckt der Cookie-Banner den Kauf-Knopf der Sticky-Kaufleiste zu 100 % — die Reparatur vom 09.08. ist wirkungslos, weil der Banner seine Position als INLINE-Style trägt
**Betroffen:** 31398

**Kostet:** Der Erstbesucher — genau der Traffic aus Google-Gratis-Einträgen und TikTok — kann den einzigen dauerhaft sichtbaren Kauf-Knopf nicht antippen, solange er den Cookie-Banner nicht wegklickt. Der Tipp landet stattdessen auf «Alle akzeptieren»/«Nur notwendige». Das trifft jede der 31'398 aktiven Produktseiten und wirkt exakt an der Stelle, an der aus einem Besuch eine Bestellung wird (Stand: seit dem 4. Juli erreicht fast niemand mehr die Kasse).
- «Klassische Herrenuhr Edelstahl · Saphirglas, 50m wasserdicht», gid://shopify/Product/15396249960833 (/products/edelstahl-uhr-herren-klassisch): iPhone 390x844, nach unten gescrollt. Kaufleiste .sticky-add-to-cart__bar bei y=770..844, der Knopf «In den Warenkorb legen» 52x52 px bei x=327/y=781. document.elementFromPoint(353,807) liefert #lx-cookie-banner, nicht den Knopf. 25 von 25 Rasterpunkten des Knopfes verdeckt = 100 %.
- «Slim Wallet Echtleder · RFID-Schutz, Vollnarbenleder», gid://shopify/Product/15396249502081 (/products/premium-leder-geldborse-slim): identisch gemessen, 100 % verdeckt, Treffer ebenfalls #lx-cookie-banner.
- Gegenprobe: derselbe Lauf mit vorher weggetipptem Banner → 0 % verdeckt, Treffer ist der Knopf selbst (span.add-to-cart__added). Der Banner ist also die alleinige Ursache.

### [mobil] Die eigene Handy-Suchleiste steht weiterhin auf jeder Produktseite — die Ausblend-Regel greift nie, weil Horizon dem <body> gar keine template-Klasse gibt
**Betroffen:** 31398

**Kostet:** Auf jeder der 31'398 Produktseiten frisst ein doppeltes Suchfeld ein Fünftel des ersten Handy-Bildschirms, genau dort, wo Bild, Preis und Kaufknopf stehen müssten. Schwerer wiegt aber das Muster: eine im Gedächtnis als «behoben» verbuchte Reparatur ist seit dem 09.08. wirkungslos, und dieselbe tote Bedingung (body.template-*) würde jede künftige seitenspezifische Handy-Regel ebenso lautlos ins Leere laufen lassen.
- Live gemessen bei 390x844 auf /products/edelstahl-uhr-herren-klassisch (gid://shopify/Product/15396249960833): #luxsb-wrap ist display:block, position:sticky, z-index 4, Rechteck [16, 115, 358, 65] — 65 px direkt unter der Kopfzeile. Identisch auf /products/premium-leder-geldborse-slim (gid://shopify/Product/15396249502081).
- Ursache: curl mit iPhone-UA liefert auf BEIDEN Seiten dieselbe Zeile <body class="page-width-narrow card-hover-effect-lift"> — es gibt keine Klasse «template-product». Die Regel aus <style id="lux-fix-20260809">: @media (max-width:749px){ body.template-product #luxsb-wrap{display:none !important} } kann deshalb nie zutreffen. Auf der Startseite hat der <body> exakt dieselbe Klassenliste.
- Folge auf dem ersten Bildschirm eines iPhone (844 px hoch): Ankündigungsband 55 px + Kopfzeile 60 px + Suchleiste 65 px = 180 px reine Bedienleiste (21 %), bevor das Produktbild beginnt (main startet bei y=180). Die Leiste ist ein reines Handy-Element (@media(min-width:750px){#luxsb-wrap{display:none}}), der Schaden entsteht also nur auf dem Telefon — und das Lupensymbol in der Kopfzeile leistet dasselbe.

### [versandaussagen] Vier sich widersprechende Lieferzeit-Zusagen für dieselbe Ware: die Versandrichtlinie verspricht CH 5–12 Werktage, die Startseite 2–14 Tage — 28'103 aktive Produktseiten nennen 10–20 bzw. bis 10–18 Tage.
**Betroffen:** 28308

**Kostet:** Die Versandrichtlinie ist der rechtlich bindende Text; sie sagt max. 12 Werktage zu, während 27'099 Produktseiten bis 20 Tage nennen. Wer nach 13 Werktagen reklamiert, hat die Richtlinie auf seiner Seite — jede solche Bestellung ist ein Erstattungs- bzw. Rücktrittsfall. Umgekehrt liest die Kundin auf der Produktseite 10–20 Tage, auf der Startseite 2–14: Widersprüchliche Angaben zur Lieferfrist sind nach UWG Art. 3 Abs. 1 lit. b irreführend und der häufigste Grund für Beanstandungen beim Konsumentenschutz. Konversionsseitig ist «10–20 Tage» direkt neben «oft schon morgen da» der stärkste Abbruchgrund vor dem Warenkorb — und genau dort steht der Engpass des Shops (0,37 % Add-to-Cart). Bei den 320 EU-Lager-Produkten kostet der falsche Text bares Geld in die andere Richtung: ein echter Deutschland-Lager-Vorteil (2–7 Tage) wird als 10–20 Tage verkauft.
- 15411554910593 «Aromadiffusor Holzmaserung» — Produkttext live: «🚚 Lieferung ca. 10–20 Tage» (einer von 27'099 mit exakt diesem Baustein)
- 15433463169409 «Kabelloses Gaming-Tastatur- & Maus-Set, RGB-Beleuchtung» — live: «🚚 Lieferung ca. 10–20 Tage»
- 15396249502081 «Slim Wallet Echtleder · RFID-Schutz» — live: «🇨🇭 CH / 🇪🇺 EU: 10–18 Tage» (einer von 1'004 mit Kopf-Baustein; Verteilung 488× 7–14, 449× 10–18, 67× 8–16)

### [farbe-metafeld] 4'395 mehrfarbige Produkte melden Google für ALLE Farbvarianten eine einzige Farbe — die der ersten Variante; ein Farb-Metafeld auf Variantenebene existiert nirgends
**Betroffen:** 4131

**Kostet:** Bei 7'647 von 9'326 mehrfarbigen Produkten ist der Metafeldwert exakt der ERSTE Optionswert — der Importer schreibt blind die Farbe der ersten Variante und lässt es dabei. Weil das Metafeld auf Produktebene liegt (live bestätigt: Varianten haben null Metafelder), erbt im Google-Feed jede einzelne Variante diesen einen Wert. Allein in der eng gefassten Menge (nur Produkte, deren Farboptionen ausschliesslich saubere deutsche Farbnamen sind) sind das 16'430 Farbvarianten, von denen 11'922 mit der falschen Farbe gemeldet werden. Konkret: der rote Hoodie steht im Feed als «Schwarz». Wer im Shopping-Farbfilter «Rot» wählt, sieht ihn nie — bei einem Sortiment, dessen einziger verkaufender Kanal Google ist, ist das der teuerste Einzelposten dieser Dimension. Zusätzlich hebelt es Googles Variantengruppierung (item_group_id + color) aus, die genau dafür da ist, alle Farben eines Artikels zu zeigen.
- 15478315090305 «Loose-Fit Hoodie · Herren» hat live 16 wählbare Farben (Schwarz, Blau, Camel, Dunkelgrau, Dunkelgrün, Khaki, Hellgrau, Helllila, Marineblau, Orange, Pink, Rot, Himmelblau, Weiss, Weinrot, Gelb) — color-Metafeld: «Schwarz». Die vier live abgefragten Varianten haben metafields = [] (leer), es gibt also keinen zweiten Farbwert.
- 15448105386369 «Off-Shoulder Sweatshirt mit Blumenmuster», 15 Farben (Weiss, Kaffeebraun, Pink, Schwarz, Blau, Helllila, Rot, Weinrot, Aprikose, Gelb, Orange, Grasgrün, Dunkelgrau, Hellblau, Hellgrau) — color-Metafeld: «Weiss»
- 15448594907521 «Damen Pullover Rundhals Loose Fit», 15 Farben — color-Metafeld: «Grün»

### [bestand] Der Fortura-CH-Lagerbestand ist seit dem 23./24.07. eingefroren — der Importer schreibt die Menge nur beim Anlegen, danach nie wieder
**Betroffen:** 2593

**Kostet:** Fortura ist das CH-Lager, auf dem das Marken-Versprechen «Blitzversand ab CH-Lager in 1–2 Tagen» steht — ausgerechnet dort ist eine Übersell-Panne am teuersten (bezahlte Bestellung, Rückerstattung, verlorene Kundin; Fehlerklasse der Bestellungen #1006/#1008/#1009). Die Zahl sieht gepflegt aus (tracked=true + DENY), ist aber ein 21 Tage altes Foto: In der Stichprobe von 500 Produkten (848 Varianten) stehen 231 Varianten auf 1–3 Stück — genau die Randbestände, die ein Fasnachts-/Party-Grosshändler binnen Tagen leerräumt. DENY schützt nur davor, unter die eingefrorene Zahl zu verkaufen, nicht davor, dass die Zahl falsch ist. Ursache ist strukturell, nicht ein vergessener Lauf: automation/fortura_import_grouped.mjs schreibt inventoryQuantities ausschliesslich im productCreate (Zeilen 93/97), und Zeile 69 (`if(done.has('ftg:'+key)){skip++;continue;}`) überspringt jedes Produkt, das schon im Ledger dropship/_fortura_done.txt (16'672 Einträge) steht. Es gibt im ganzen Repo keinen Pfad, der den Bestand eines BESTEHENDEN Fortura-Produkts je aktualisiert — der 12h-Dauerläufer fortura_runner.sh zieht zwar täglich den frischen Feed, benutzt daraus aber nur die neuen Artikel.
- gid://shopify/Product/15470013448577 «Dämonen Dreizack 4-teilig» (fortura-BO71991, Shop meldet 19 Stück, inventoryLevel.updatedAt = 2026-07-23T21:50:30Z)
- gid://shopify/Product/15470022361473 «BRUDER MAN TGA Müll LKW» (fortura-02772, 30 Stück, updatedAt = 2026-07-23T21:53:55Z)
- gid://shopify/Product/15470013350273 «MACK Granite Müll-LKW» (fortura-02812, 6 Stück, updatedAt = 2026-07-23T21:50:30Z)

### [variantenwerte] 2'904 aktive Produkte mischen deutsche und englische Farbwerte im SELBEN Dropdown – der Übersetzungslauf hat je Produkt nur einen Teil der Werte erwischt
**Betroffen:** 1300

**Kostet:** Halb übersetzt wirkt schlimmer als gar nicht übersetzt: die Kundin sieht neben sauberem Deutsch plötzlich «Grey C Thin» und liest daraus, dass hier ein China-Weiterverkäufer sitzt – genau das Vertrauen, das ein Schweizer Premium-Shop verkauft. 2'874 dieser Produkte sind im Google-Kanal, wo der Wert im Varianten-Titel mitläuft. Die Ursache ist bekannt und reparierbar: farbwerte_uebersetzen.py überspringt einen Wert, sobald der deutsche Zielwert im selben Dropdown schon existiert («Option value already exists») – deshalb bleibt bei genau diesen Produkten der Rest englisch stehen. Der Fix ist nicht nochmal derselbe Lauf, sondern das Zusammenführen der Doppelwerte.
- Blumen-Maxikleid «Fleurette» — 15412918190465 — Farbe: «Schwarz-Weiss, Braun, Orange, Color, Gelb, Pink, Polka Dot, Hellgelb, Rosa» — «Color» ist gar keine Farbe, sondern der unübersetzte Sammelwert
- Kabellose Kopfhörer «AirBeat» — 15443496108417 — Farbe: «Schwarz, Pink, Violett, Skin Color»
- Herren Business-Anzughose — 15413245968769 — Farbe: «Hellgrau, Grey C Thin, Grey B Thin, Dunkelmarineblau, Schwarz, Grey A Thick» — dieselbe Farbe steht einmal deutsch und dreimal englisch da

### [versandaussagen] 1'004 aktive Produkte bewerben Lieferzeiten in die EU und die USA — die Versandrichtlinie schliesst Versand ausserhalb CH/Liechtenstein ausdrücklich aus.
**Betroffen:** 1004

**Kostet:** Der Shop wirbt auf 1'004 Produktseiten mit einer Leistung, die er nicht erbringt und laut eigener Richtlinie gar nicht erbringen kann. Eine Kundin in Deutschland oder den USA legt in den Warenkorb, sieht im Checkout keine Lieferadresse ihres Landes und bricht ab — nach der Anzeige einer konkreten Lieferfrist ist das ein Fall von irreführender Werbung (UWG Art. 3). Für die Google-Merchant-Prüfung ist das zusätzlich riskant: Der Kanal ist der einzige mit belegten Verkäufen (52 Klicks, +206 %), und «Angebotene Lieferung stimmt nicht mit dem Angebot überein» ist ein Standard-Ablehnungsgrund. Die 21 Produkte mit «Versand aus Belp» sind besonders heikel: sie behaupten Schweizer Versand für Ware, die die Seite zwei Absätze höher als Übersee-Produktion mit 8–16 Tagen ausweist — darunter ausgerechnet die Bewertungs-Sieger (Slim Wallet 5,0★, Jade Roller 5,0★, Herrenuhr 5,0★), also die meistbesuchten Seiten.
- 15396249502081 «Slim Wallet Echtleder · RFID-Schutz, Vollnarbenleder» — live auf luxestyle.ch/products/premium-leder-geldborse-slim: «📦 Lieferzeit (je nach Land): 🇨🇭 CH / 🇪🇺 EU: 10–18 Tage · 🇺🇸 USA: 12–22 Tage»
- 15396249960833 «Klassische Herrenuhr Edelstahl · Saphirglas, 50m wasserdicht» — live ACTIVE: «🇨🇭 CH / 🇪🇺 EU: 8–16 Tage · 🇺🇸 USA: 12–20 Tage»
- 15397247484289 «Sternenhimmel Projektor · Baby Nachtlicht mit Musik» — dieselbe Zeile, ACTIVE

### [gender-metafeld] 716 aktive Produkte tragen «Herren»/«Damen» im Titel, im Google-Feld gender steht aber unisex — alle 716 stehen im Google-Kanal
**Betroffen:** 713

**Kostet:** Google nutzt gender zur Zuordnung von Suchanfragen und Shopping-Filtern. Bei «unisex» fällt das Produkt aus den geschlechtsgefilterten Ergebnissen («Herrenschuhe», «Damen Sneaker») heraus — genau die Suchen mit Kaufabsicht. Der Google-Kanal ist laut Merchant-Screenshot der einzige mit belegten Klicks (52 Klicks, 3'170 Impressionen, praktisch alles organisch), also trifft es den einzigen funktionierenden Kanal. URSACHE (wichtiger als die Zahl): automation/cj_category_fill.mjs:375 leitet gender NUR aus den Tags ab (grp.tags.includes('damen')?'female':grp.tags.includes('herren')?'male':'unisex') und liest den Titel nie. Ware, die per cat_tags nur 'schuhe'/'sneaker'/'mode' bekommt, landet zwangsläufig auf 'unisex'. Die Nachfüller (automation/gfeed_fill.py:21, automation/google_feed/agegender_metafield.py:24) lesen zwar Titel+Tags, füllen aber nur LÜCKEN — ein bereits gesetztes falsches 'unisex' rühren sie nicht an. Jeder neue CJ-Import erzeugt den Fehler also weiter.
- Herren Combat Boots — gid://shopify/Product/15450064454017 (live gender=unisex)
- Atmungsaktive Wanderschuhe für Herren — gid://shopify/Product/15450057081217 (live gender=unisex)
- Luftpolster Mesh Sneaker Damen Frühling/Herbst — gid://shopify/Product/15452709650817 (live gender=unisex)

### [bilder-fehler] 258 aktive Produkte zeigen als Hauptbild eine Miniatur (50–499 px), obwohl im selben Produkt ein Grossbild ab 800 px liegt — es ist reine Reihenfolge, nicht fehlendes Material.
**Betroffen:** 294

**Kostet:** Das Hauptbild ist genau das Bild, das Google als image_link bekommt, das die Kollektionskachel füllt und das als og:image in Social-/WhatsApp-Vorschauen erscheint. 248 der 258 sind live im Google-Kanal publiziert — dem einzigen Kanal mit belegten Verkäufen (52 Klicks, +206 %). 31 davon liegen unter 250 px, 4 sogar unter 100 px; Google verlangt mindestens 250×250 für Bekleidung/Schmuck und 100×100 sonst, darunter wird das Angebot abgelehnt statt schwächer gerankt. Alle 258 sind zudem im Onlineshop publiziert: das Theme fordert per srcset Breiten bis 3840 px an, geliefert werden 50–499 px — die Karte wird um das 3- bis 16-fache hochskaliert und ist sichtbar verpixelt, ausgerechnet beim ersten Eindruck. Es fehlt kein Bildmaterial, das scharfe Bild liegt in jedem dieser Produkte schon auf Position 2 oder später; ein Umsortieren genügt. Und es entsteht weiter: 243 der 258 tragen eine CJ-SKU, 30 wurden im August angelegt, der jüngste am 12.08.2026 (Samt-Kissenhülle, ID 15495748452737). Ursache ist cj_category_fill.mjs Zeile 341 — es übernimmt CJs productImageSet unverändert in der Lieferanten-Reihenfolge, und deren erster Eintrag ist mitunter ein Thumbnail. Ein einmaliger Aufräumlauf allein hält das nicht.
- Adapter für Hochdruckreiniger-Schaumlanze — Hauptbild 50×50 px, Bild 2 ist 800×800 (ID 15479417700737, /products/adapter-fur-hochdruckreiniger-schaumlanze-611584)
- Premium Faux Mink MK-15 Wimpern — Hauptbild 80×80, im Produkt liegen fünf Bilder mit 1340×1785 (ID 15449133023617)
- Falsche Nerzwimpern 3D MK-06 (5 Paar) — Hauptbild 80×80, bestes Bild 1340 px (ID 15449133187457)

### [variantenwerte] Bei 276 aktiven Produkten steckt die Grösse im Farb-Dropdown – es gibt gar kein Grössenfeld, die Kundin muss ihre Grösse unter «Farbe» suchen
**Betroffen:** 265

**Kostet:** Beim Spitzentop gibt es nur EINE Farbe (schwarz) – trotzdem muss die Kundin fünfmal dieselbe Farbe durchgehen, um ihre Grösse zu finden; beim Yoga-Tanktop sind es 44 Einträge in einem einzigen Feld statt 4 Grössen × 11 Farben. Kleidung ohne erkennbares Grössenfeld wird nicht gekauft, und wer trotzdem klickt, greift daneben – Fehlgrössen sind bei Dropshipping aus China die teuerste Retourenart. Alle 276 stehen im Google-Kanal; dort fehlt dadurch auch das Attribut «size», was die Ausspielung in Shopping-Ergebnissen für Bekleidung beschneidet. 219 der 276 sind zudem NICHT im vorigen Fund enthalten, also ein eigenständiger Reparaturfall.
- Spitzentop mit tiefem V-Ausschnitt — 15448076484993 — einziges Dropdown «Farbe»: «L-Schwarz, M-Schwarz, S-Schwarz, XS-Schwarz, XL-Schwarz» (live im HTML von luxestyle.ch/products/spitzentop-mit-tiefem-v-ausschnitt-634100 belegt)
- Yoga Tanktop mit Kreuzträgern — 15447994794369 — einziges Dropdown «Farbe» mit 44 Werten: «S-Dunkelblau, S-Ball Pen Blue, S-Smoky Moss Green, S-Fig Purple, S-Advanced Black … XL-Pfirsichpink»
- Yoga Tanktop mit Shaping-Effekt — 15448078320001 — Farbe: «S-Weiss, M-Weiss, L-Weiss, XL-Weiss»

### [lieferanten-leak] 254 aktive Produkte bieten im Grössen-Feld nur «FREE SIZE» bzw. «ONE SIZE» an – die Lieferantenformulierung, unübersetzt
**Betroffen:** 254

**Kostet:** «Free Size» ist ein reiner Marktplatz-Begriff (AliExpress/CJ) und im Schweizer Handel unbekannt; im deutschsprachigen Kaufbereich liest es sich zudem wie «Grösse gratis». Richtig wäre «Einheitsgrösse». Bei einem Kleid mit «ONE SIZE» als einziger Angabe fehlt der Kundin jede Information, ob es ihr passt – das ist bei Bekleidung der häufigste Grund für Nichtkauf oder Retoure. Der Mangel steht direkt im Kaufbereich neben bereits sauber eingedeutschten Farbwerten, wodurch der Bruch besonders sichtbar ist.
- «Strick-Cape-Schal für Damen» (ID 15447942300033, /products/strick-cape-schal-fur-damen-634700): Grösse = «FREE SIZE» (Farben daneben sind sauber eingedeutscht: Schwarz, Weiss, Khaki …)
- «Damen Fischerhut mit breiter Krempe» (ID 15447947837825): Grösse = «FREE SIZE», Farbe = «Schwarz», «Black-Plus Size», «Marineblau», «Navy Blue-Plus Size» – deutsch und englisch gemischt in derselben Liste
- «Perlenbesetztes Neckholder-Minikleid» (ID 15447978115457): Grösse = «ONE SIZE»

### [blog] 244 von 282 Ratgeber-Artikeln haben weder Beitragsbild noch ein einziges Bild im Text — die Blog-Übersicht ist eine reine Textwand und die Artikel haben kein og:image für Social/Pinterest
**Betroffen:** 244

**Kostet:** Ohne og:image erzeugt jeder geteilte Blog-Link auf WhatsApp, Facebook und LinkedIn eine leere graue Vorschau — die Klickrate auf solche Previews bricht ein. Auf Pinterest, dem laut Strategie geplanten kaufabsichtsstarken Gratiskanal, lassen sich diese 244 Artikel überhaupt nicht pinnen: Pinterest braucht ein Bild. Und die Übersichtsseite /blogs/ratgeber zeigt der Besucherin 50 identisch aussehende Textkacheln ohne einen einzigen Blickfang — in einem Shop, der sich als "Premium-Style" positioniert. Der gesamte Ratgeber-Blog (86 % bildlos) ist damit als Traffic- und Vertrauensträger halb entwertet, obwohl der Text bereits geschrieben und bezahlt ist.
- «Sommerkleider-Trends 2026: Die schönsten Looks für die Schweiz» (Article/1001699541377, /blogs/ratgeber/sommerkleider-trends-2026-die-schonsten-looks-fur-die-schweiz): live 200, aber 0 <img> im <main> und kein og:image im <head> (nur og:title/description/url/type/site_name)
- «Edelstahl-Schmuck: hautfreundlich, wasserfest & langlebig – der Kaufratgeber» (Article/1001699639681): kein image-Feld, kein Bild im Body
- «Aroma-Diffuser kaufen: Der grosse Ratgeber 2026» (Article/1001699574145) und «Smartwatch kaufen 2026: Ratgeber, Funktionen & Vergleich» (Article/1001699672449): ebenfalls bildlos

### [strukturdaten] 244 von 312 Blogartikeln haben überhaupt kein Titelbild — dadurch fehlt im Article-JSON-LD das Feld image und der Seite das og:image; betroffen ist ausschliesslich der Ratgeber-Blog, der von der Startseite verlinkt ist.
**Betroffen:** 244

**Kostet:** Der Ratgeber ist der einzige Blog, der von der Startseite verlinkt und im Sitemap steht — er ist der Gratis-SEO-Kanal, mit dem der Shop Suchtraffic mit Kaufabsicht holen soll. Ohne image im Article-Markup fällt der Artikel aus jeder Artikel-Rich-Result-Darstellung heraus und erscheint in der Search Console als Fehler/Warnung. Ohne og:image zeigt jeder Link, der auf WhatsApp, Facebook, Pinterest oder Instagram geteilt wird, eine leere graue Vorschaukarte — das kostet direkt Klicks bei genau der Social-Verbreitung, auf die der Autopilot täglich setzt, und wirkt neben den 30 bebilderten Magazin-Artikeln unfertig.
- /blogs/ratgeber/chronograph-oder-automatik-uhrwerke-verstehen-die-richtige-uhr-wahlen (Article-ID 1001933537665): Admin-API liefert image: null; die Live-Seite hat einen validen Article-Block mit headline/description/datePublished/author/publisher, aber kein image und kein <meta property="og:image">.
- /blogs/ratgeber/caps-sommerhuete-2026-sonnenschutz-stil (Article-ID 1001795649921): image: null, JSON-LD ohne image, Seite ohne og:image.
- /blogs/ratgeber/damenmode-basics-2026-kleiderschrank (Article-ID 1001798205825): image: null, JSON-LD ohne image, Seite ohne og:image.

### [material-metafeld] 180 aktive Produkte tragen als material-Wert keinen Materialnamen, sondern Extraktions-Müll: HTML-Reste, abgeschnittene Satzfragmente, angehängte Attributlabel und den Platzhalter «hochwertiges Material» — 165 davon im Google-Kanal.
**Betroffen:** 175

**Kostet:** Das Projektgedächtnis hält fest, der Material-Extraktor sei am 11.08. repariert worden («jetzt nur noch das Materialwort») — der Altbestand wurde dabei aber nur teilweise geputzt: 180 kaputte Werte stehen weiterhin live, 165 davon im Feed. Google wertet material als Attribut für Suchfilter und Produktdarstellung; ein Wert wie «/li>», «Single Piece Dress Length» oder ein halber deutscher Satz ist entweder wertlos (Attribut wird verworfen, das Produkt fällt aus Material-Filtern) oder wird als Attributtext ausgespielt und wirkt wie ein defekter Shop. Der Grossteil sind Hoodies, Kleider und Nachtwäsche — Textilien, bei denen Material das Kaufkriterium ist. Dazu kommt die inhaltliche Falle bei den 18 Platzhaltern: «hochwertiges Material» ist eine Werbeaussage ohne Substanz in einem Feld, das eine Faktenangabe verlangt.
- "Premium Half-Zip Hoodie für Damen" (15447952425345) — material = "/li>" (reiner HTML-Tag-Rest). Live bestätigt, ACTIVE. Insgesamt 23 Produkte mit exakt diesem Wert.
- "Kapuzenpullover · Modell 2" (15448103846273) — material = "sorgt für ein angenehmes Tragegefühl und hält zuverlässig wa" (bei 60 Zeichen abgeschnittener Fliesstext). Live bestätigt. 52 Produkte mit solchen Satzfragmenten, z. B. auch "bietet er optimalen Tragekomfort für den Alltag. Das langä" (15448104141185).
- "Zuckersüß Mädchenstil Langarm-Einfarbiges Pajama-Nachthemd" (15453825073537) — material = "Single Piece Dress Length". Live bestätigt. 83 Produkte dieser Klasse, u. a. "Polyester Style" (11×), "Cotton Color" (3×), "PU leather Size" (3×), "Plastic Packing list" (2×), "Stainless steel Processing technology" (2×), "Plastic Compatible with Samsung", "nylon Brush type".

### [material-metafeld] 181 aktive Produkte melden im Google-Feed material="Leather"/"Leder", obwohl die eigene Produktbeschreibung PU-, Kunst- oder Mikrofaserleder nennt — alle 181 stehen im Google-Kanal.
**Betroffen:** 174

**Kostet:** Das ist keine Ungenauigkeit, sondern eine Falschangabe über die Materialbeschaffenheit direkt im strukturierten Feed-Feld, das Google auf der Produktseite ausspielt und für Filter «Material: Leder» nutzt. Genau dieser Widerspruch — Feed sagt Leder, Landingpage sagt Kunstleder — ist der klassische Merchant-Center-Misrepresentation-Fall (Feed stimmt nicht mit der Zielseite überein) und laut eigenem Projektgedächtnis der häufigste Grund für eine sofortige Kontosperre. Der Google-Kanal ist der einzige mit belegten Verkäufen (52 Klicks, +206 %), eine Sperre kostet also den einzigen funktionierenden Traffic-Kanal. Zusätzlich UWG-relevant: «Leder» ohne Zusatz ist in der Schweiz und EU ein geschützter Begriff für tierisches Leder; wer für Babyschuhe und Gürteltaschen Leder deklariert und PU liefert, hat einen Rückgabe- und Abmahngrund geliefert. Betroffen sind vor allem Kinder-/Babyschuhe und Taschen — genau die Kategorien, in denen Kundinnen auf «Leder» einen Aufpreis bezahlen.
- "PU-Leder Hüfttasche mit verstellbarem Schulterriemen" (15453948739969) — material="Leather", Beschreibung: «Die PU-Leder Hüfttasche …». Live per GraphQL bestätigt: metafield material = "Leather", status ACTIVE.
- "Weiche Anti-Rutsch-Baby-Schuhe aus Kunstleder" (15455661752705) — material="Leather", Kunstleder steht im Titel selbst. Live bestätigt.
- "Glänzendes Kunstleder-Sweatshirt mit Rundhals" (15449096814977) — material="Leder", Materialzeile der Beschreibung: «Glänzendes Kunstleder (Polyester)». Live bestätigt.

### [lieferanten-leak] Bei 216 aktiven Produkten steht in der Farbauswahl statt einer Farbe nur die Artikelnummer des chinesischen Lieferanten – und keine dieser Varianten hat ein eigenes Bild
**Betroffen:** 160

**Kostet:** Die Kundin muss im Kaufbereich blind zwischen «JM721» und «JM722» wählen – eine Stichprobe von 12 dieser Produkte (Admin-API, live) zeigte 220 Varianten, davon 220 OHNE eigenes Variantenbild. Es gibt also keinerlei Anhaltspunkt, welche Farbe sie bestellt. Das ist ein Kaufabbruch genau an der Stelle, an der die Kaufentscheidung fällt, und es sagt der Kundin zugleich, dass hier eine fremde Lieferantenliste unverändert weitergereicht wird (Vertrauensschaden). 214 der 216 stehen im Google-Kanal – dem einzigen Kanal mit belegten Verkäufen. Der Farbwert-Übersetzer (automation/farbwerte_uebersetzen.py) hat diese Klasse nicht erfasst, weil er englische Farbwörter suchte, nicht Codes.
- «Langarmbluse mit Gürtel und 3D-Effekt» (ID 15448043389313, /products/langarmbluse-mit-gurtel-und-3d-effekt-603900): Farbe = JM721, JM722, JM723 … JM7210 (15 Werte)
- «Edelstahl-Anhänger: Sternzeichen und Monate» (ID 15447582900609): Farbe = MK1578, MK2272, MK2273 … 47 Code-Werte, kein einziger Farbname
- «Herren Business Quarzuhr» (ID 15447589814657): Farbe = T3071, T3072, T3073, T3074

### [dubletten] Fortura-Kostüme stehen doppelt im Shop: 77 Lieferanten-SKUs sind gleichzeitig ein Einzelgrössen-Produkt UND eine Variante im Sammelprodukt — beide mit tracked-Bestand, also wird derselbe Lagerbestand zweimal verkauft
**Betroffen:** 130

**Kostet:** Der Bestand ist über 77 SKUs hinweg um 753 Stück zu hoch angesetzt (Summe der doppelt geführten Mengen). Weil beide Kopien tracked+DENY sind, greift die Bestandsbremse pro Produkt statt pro Ware: bei knappen Artikeln (Killer Clown: 2 Stück) kann der Shop das Doppelte verkaufen und muss danach stornieren — genau das Muster der Ghost-Sale-Bestellungen #1006/#1008/#1009. Dazu sieht die Kundin in der Kostüm-Kategorie dasselbe Kostüm zwei- bis viermal, was die Auswahl verwässert und Klicks verschenkt. Alle 130 Produkte sind im Onlineshop publiziert (im Google-Kanal ist keines, dort droht also keine Sperre).
- fortura-PC93599 (2 Stück am Lager): «Kostüm Killer Clown · Gr. L/XL» ID 15469442269569, CHF 43.50, /products/kostum-killer-clown-gr-l-xl-ftpc93599 — dieselbe SKU nochmals als Variante in «Kostüm Killerclown» ID 15469974684033, /products/kostum-killerclown-fgsspc9359. Beide ACTIVE, beide tracked, beide zeigen 2 Stück → 4 verkaufbar bei 2 vorhandenen.
- fortura-BO82281 (26 Stück): «Kostüm Piratin Tracy 7-9 Jahre» ID 15469808746881 und Variante in «Kostüm Piratin Tracy 4-6 Jahre» ID 15469959446913 — beide live, beide 26 Stück.
- fortura-90285-2 und -90285-3: «Kostüm Evil Joker Gr. M, Jacke» ID 15469478314369 + «Kostüm Evil Joker Gr. L Jacke» ID 15469478347137 doppeln die Varianten von «Kostüm Evil Joker Jacke» ID 15469943882113 (alle drei liefern HTTP 200 auf luxestyle.ch).

### [seo-technik] 99 von 132 veröffentlichten Shop-Seiten haben weder title_tag noch description_tag — Shopify baut das Snippet aus dem Seitentext, mit zusammengeklebten Wörtern und doppelt kodierten Zeichen
**Betroffen:** 99

**Kostet:** Die Blog-Artikel machen es richtig — alle 282 Ratgeber- und 30 Magazin-Artikel haben ein sauberes summary bzw. description_tag, das Snippet stimmt dort. Nur die /pages/-Ebene wurde nie befüllt, und ausgerechnet dort liegen die ~60 selbst geschriebenen Ratgeberseiten, die überhaupt nur existieren, um Gratis-Traffic zu holen. Ihr Suchergebnis besteht aus dem rohen, entkernten Seitenanfang inklusive Emoji mitten im Satz und «&amp;» als sichtbarem Zeichen — das kostet Klickrate genau bei den Seiten, in die Schreibarbeit gesteckt wurde, und bei AGB/Impressum/Rückgabe steht ein zerstückelter Rechtstext als Visitenkarte in Google.
- /pages/agb → Meta-Description live: «Allgemeine GeschäftsbedingungenStand: 14. Juni 20261. GeltungsbereichDiese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle …» (Page-ID 697899352449, metafields.json → keine global.title_tag/description_tag)
- /pages/rueckgabe → Title-Tag live: «Rückgabe &amp;amp; Widerruf – LuxeStyle», im Browser-Tab und im Google-Snippet also lesbar als «Rückgabe &amp; Widerruf»; Meta-Description: «Rückgabe &amp;amp; Widerruf🔄 30 Tage RückgaberechtDu kannst deine Bestellung …». Gleiches bei /pages/kontakt-support («Kontakt &amp; Support»)
- /pages/rfid-schutz-erklaert (Page-ID 697996607873) und ~60 weitere reine SEO-Ratgeberseiten (jade-roller-vs-gua-sha, wanderziele-schweiz-2026, maenner-style-2026, edelstahl-vs-silber-schmuck …) — alle ohne eigenes Snippet

### [blog] 90 von 312 Blogartikeln führen ins Leere: 114 verschiedene interne Links (93 Produkte, 21 Kollektionen) liefern live 404 — insgesamt 304 tote Verlinkungen
**Betroffen:** 90

**Kostet:** Der Blog ist der einzige organische Traffic-Kanal neben Google Shopping. Jeder dieser 304 Links ist ein Kaufklick, der auf einer 404-Seite endet statt im Warenkorb — genau am Punkt der höchsten Kaufabsicht ("Jetzt ansehen" nach dem Ratgebertext). Von 251 internen Links im Blog sind 45 % tot. Dazu SEO-Schaden: Google wertet massenhafte 404-Ziele als Qualitätssignal ab, und Crawl-Budget verpufft. 21 tote Kollektions-Links sind besonders teuer, weil sie ganze Kategorie-Landeseiten bewerben, die es nicht gibt (bundle-beauty-self-care, geschenk-ideen, damen-duefte, herren-duefte, kaffee-maschinen, beleuchtung, staubsauger-haushalt).
- «10 Wellness-Geschenke unter CHF 50 für 2026 🎁» (Article/1001493823873, /blogs/magazin/10-wellness-geschenke-unter-chf-50-2026): 10 tote Produktlinks — live geprüft, u.a. /products/soja-duftkerzen-4er-set-vintage-rose-lavendel = 404, /products/himalaya-salzkristall-lampe-naturkristall = 404, /products/jade-roller-gua-sha-set-rosenquarz-premium = 404
- «Geschenke für Männer 2026: Ideen mit Stil aus der Schweiz» (Article/1001546580353): 10 tote Links, u.a. /products/premium-slim-wallet-rfid-schutz-echtleder = 404, /products/herren-gurtel-echtleder-edelstahl-schliesse-kurzbar = 404
- «Geschenkboxen verschenken: Warum kuratierte Sets das schönste Geschenk sind» (Article/1001546449281): 9 tote Links, u.a. /collections/bundle-beauty-self-care = 404, /collections/bundle-vatertag-gentleman = 404

### [lieferanten-leak] 86 aktive Produkte geben die Grösse in «Yards» an – das chinesische 码 (= Grösse) wurde vom Lieferanten-Feed wörtlich als «Yards» übersetzt
**Betroffen:** 86

**Kostet:** Alle 86 stehen im Google-Kanal. Bei Kinderschuhen ist die Grösse das einzige Kaufkriterium; «17 Yards» ist keine Grösse, die eine Schweizer Kundin einordnen kann – sie bestellt entweder nicht oder falsch, und eine Falschbestellung bei Dropshipping-Ware aus China ist eine Retoure, die teurer ist als die Marge. Zusätzlich verrät die Formulierung unmissverständlich, dass der Text unbearbeitet aus einem chinesischen Listing stammt. Auffällig: der Farbwert-Übersetzer hat bei denselben Optionen einzelne Werte eingedeutscht («Gold», «Grau»), die Kombi-Werte daneben aber stehen lassen – die Auswahlliste zeigt jetzt beides gemischt.
- «Weichgepolsterte Laufschuhe für Kleinkinder» (ID 15452710371713, /products/weichgepolsterte-laufschuhe-fur-kleinkinder-619300): Auswahl «Gold-17 Yards», «Gold-18 Yards» … – gemeint sind Schuhgrössen 17/18
- «Warme Cartoon-Schneestiefel» (ID 15453956440449): «Gray-160 Yards», «Gray-170 Yards» – 160/170 ist die Körpergrösse in cm, nicht Yards
- «Lauflernschuhe mit Riemen, beige/silber» (ID 15453895295361): «Beige-16 Yards» … «Beige-22 Yards»

### [kollektionstexte] 65 Kollektionstexte werben mit «Gratis-Versand ab CHF 65» — die echte Schwelle ist CHF 50, und beide Zahlen stehen auf derselben Seite
**Betroffen:** 48

**Kostet:** Der Kunde muss laut Text CHF 15 mehr in den Warenkorb legen als nötig — bei einem Shop mit 0,37 % Add-to-Cart ist eine zu hoch kommunizierte Gratis-Versand-Schwelle ein direkter Conversion-Verlust, und wer sie erreicht hat, sieht im Checkout eine andere Zahl als auf der Kategorieseite (Vertrauensbruch, Reklamationsgrund). Es ist derselbe CHF-65-Altbestand, der 2026-08-11 in 12 Importern und in den PRODUKT-Texten korrigiert wurde — die KOLLEKTIONS-Texte hat kein Reiniger je angefasst.
- Wahrheit aus dem Versandprofil (Admin-API, deliveryProfiles «General profile» / Zone Domestic): Methode «Kostenloser Versand», Preis CHF 0.00, Bedingung TOTAL_PRICE >= 50.0, active=true. Ab CHF 50 ist der Versand gratis — CHF 65 ist eine veraltete Zweitregel, die nie greift.
- «Für Ihn» (fur-ihn, ID 687522283905, 3'733 Produkte): Body UND SEO-Beschreibung sagen «Gratis-Versand ab CHF 65, 30 Tage Rückgabe». Live auf https://luxestyle.ch/collections/fur-ihn stehen gleichzeitig «Gratis-Versand ab CHF 50, sonst CHF 7.00» (Theme/Ankündigung) und «Gratis-Versand ab CHF 65» (Kollektionstext) auf ein und derselben Seite.
- «Schuhe» (schuhe, ID 688018162049, 3'318 Produkte): Body «…Gratis-Versand ab CHF 65, 30 Tage Rückgabe.» — live ebenfalls im Widerspruch zum CHF-50-Hinweis derselben Seite.

### [versandaussagen] 46 live sichtbare Kollektionen werben weiterhin mit «Gratis-Versand ab CHF 65» — der echte Wert ist CHF 50; auf mehreren Seiten stehen beide Zahlen gleichzeitig.
**Betroffen:** 48

**Kostet:** Die Schwelle ist der stärkste Warenkorb-Hebel im Shop, und 46 Kollektionsseiten nennen sie um CHF 15 zu hoch. Eine Kundin mit CHF 52 im Korb liest «ab CHF 65» und legt entweder unnötig nach oder — häufiger — bricht ab, weil sie glaubt, Versand zahlen zu müssen, obwohl sie die Gratis-Grenze längst überschritten hat. Genau in diesem Bereich liegt der Engpass (10 offene Warenkörbe, CHF 570.61, der jüngste vom 4. Juli). Dazu steht CHF 65 in der Meta-Description, also im Google-Snippet vor dem Klick — der Kanal mit den einzigen belegten Verkäufen wirbt mit der falschen Zahl. Und auf schuhe/herren-uhren sieht die Kundin CHF 50 und CHF 65 direkt untereinander: ein sichtbarer Selbstwiderspruch ist teurer als jede der beiden Zahlen allein. Das ist derselbe Muster wie beim dokumentierten CHF-65-Fix vom 11.08.: die Produkttexte wurden korrigiert (0 aktive Produkte mit CHF 65), die Kollektionen nie — der Reiniger kannte nur descriptionHtml von Produkten.
- /collections/schuhe (3'318 Produkte, HTTP 200): Theme-Leiste zeigt «Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe», der Kollektionstext direkt darunter «…zu fairen Preisen. Gratis-Versand ab CHF 65, 30 Tage Rückgabe.» — beide Zahlen auf derselben Seite
- /collections/herren-uhren (590 Produkte, HTTP 200): identischer Widerspruch, CHF 50 in der Leiste, CHF 65 im Kollektionstext
- /collections/fur-ihn (3'733 Produkte, HTTP 200): «Herren-Mode online kaufen: … Gratis-Versand ab CHF 65, 30 Tage Rückgabe.» — steht auch in der Meta-Description, also im Google-Suchergebnis

### [seo-technik] Acht veröffentlichte Kategorieseiten bewerben live noch die alte Versandschwelle «Gratis-Versand ab CHF 65» — der Shop liefert seit der Korrektur ab CHF 50
**Betroffen:** 48

**Kostet:** Die Aufräumaktion vom 11.08. («Gratis-Versand ab CHF 65 war in 12 Importern fest verdrahtet») hat Produktbeschreibungen und Produkt-SEO korrigiert — 30'810 Produkt-Meta-Descriptions sagen heute CHF 50 — aber die Meta-Descriptions der KOLLEKTIONEN wurden nicht mitgezogen. Genau dieselbe Falle wie bei condition und google_product_category: die Reparatur war eine Feldebene zu eng. Kategorieseiten sind die Seiten, die in Google ranken; das Snippet nennt eine um CHF 15 höhere Hürde als real und widerspricht der Leiste, die derselbe Besucher zwei Sekunden später sieht. Betroffen sind die vier grössten Kategorieseiten des Shops, zusammen 12'439 Produkt-Plätze.
- /collections/fur-ihn (3'733 Produkte) → «Herren-Mode online kaufen: Hemden, Jacken, Schuhe, Uhren und Accessoires. Gratis-Versand ab CHF 65, 30 Tage Rückgabe.»
- /collections/sub-baby-kids (3'027 Produkte) → «… Gratis-Versand ab CHF 65, 30 Tage Rückgabe, Lieferung in die ganze Schweiz.»
- /collections/sub-haustier (2'284), /collections/neu-eingetroffen (1'993), /collections/haustier-hunde (528), /collections/haustier-katzen (412), /collections/erste-august (266), /collections/halloween (196) — alle mit «ab CHF 65»

### [gender-metafeld] 42 aktive Produkte melden das UMGEKEHRTE Geschlecht: 35 Herrenartikel als female, 7 Damenartikel als male
**Betroffen:** 41

**Kostet:** Ein falsches gender ist schlimmer als ein fehlendes: Google spielt das Produkt aktiv der falschen Zielgruppe aus. Eine Herren-Anzughose in den «Damenhosen»-Ergebnissen erzeugt Klicks, die nie kaufen — bezahlt oder nicht, sie verschlechtern die Feed-Qualität und verdrängen passende Ware. Zwei getrennte Ursachen, beide reproduzierbar: (1) 15 der 35 Herrenartikel tragen fälschlich den Tag 'damen'/'damenschuhe' (z.B. «Herren High-top Ankle Boots», Tags damen+damenschuhe), und automation/cj_category_fill.mjs:375 prüft 'damen' VOR 'herren' — der falsche Tag gewinnt. (2) Die 7 Damenartikel sind ein klassischer Substring-Treffer: automation/gfeed_fill.py:23 sucht 'mens' OHNE Wortgrenze, und «Da-MENS-onnenbrille» sowie «My I-MENS-o» enthalten es — dieselbe Falle wie das dokumentierte «IPL in L-IPL-iner». Die Prüfung auf 'herren' steht dort vor der auf 'damen', also schlägt der Fehltreffer durch. Beide Ursachen produzieren bei jedem Lauf neue Fälle.
- Herren Basic T-Shirt Kurzarm — gid://shopify/Product/15447956324737 (live gender=female; Tags nur herren/herren-mode/mode)
- Gefütterte Herrenjacke mit Stehkragen — gid://shopify/Product/15448672862593 (live gender=female)
- Herren-Sandalen aus Vollnarbenleder — gid://shopify/Product/15493855904129 (live gender=female)

### [dubletten] 40 CJ-Produkte sind zweimal angelegt — identische CJ-Varianten-SKU, einmal mit und einmal ohne «CJ-»-Präfix — und werden zu Preisen verkauft, die um bis zum 3,8-Fachen auseinanderliegen; alle 40 stehen im Google-Kanal
**Betroffen:** 40

**Kostet:** Der Shop unterbietet sich selbst: Wer die veredelte Version für CHF 59.90 im Google-Feed findet und dann im Shop weitersucht, stösst auf dieselbe Ware für CHF 15.90 — das ist entweder ein Vertrauensbruch oder ein Margenverlust von bis zu CHF 44 pro Verkauf. Alle 40 Produkte sind im Google-Kanal, dem einzigen Kanal mit belegten Verkäufen; Google wertet zwei Angebote derselben Ware zu verschiedenen Preisen als Duplicate Offer ab. Zusätzlich verteilt sich der Traffic (und künftige Judge.me-Bewertungen) auf zwei Seiten statt einer.
- «Boho-Jacke «Fiore» · Blüten-Stickerei, Bindeband» ID 15421615473025, CHF 59.90, SKUs CJYD292453101AZ/02BY/03CX — identisch mit «Blumen-Oberteil · Damen» ID 15449393824129, CHF 15.90, SKUs CJ-CJYD292453101AZ/02BY/03CX. Auch das Hauptbild ist dieselbe Datei (da2e9017-5f9a-467a-8557-94142d879a4d.jpg bzw. deren Shopify-Kopie).
- «Herrenuhr «Executive» – Business Quarz» ID 15412945191297, CHF 39.90 (CJSY291459601AZ) vs. «Herren Quarz-Armbanduhr» ID 15447588864385, CHF 15.90 (CJ-CJSY291459601AZ) — beide ACTIVE, beide live.
- «Relaxed-Fit Hoodie «Cosy» – mit Fell-Panel & Kordelzug» ID 15412830896513, CHF 39.90 (CJWY291518101AZ) vs. «Kapuzenpullover mit Rippstruktur und Fell-Details» ID 15448105550209, CHF 15.90 (CJ-CJWY291518101AZ).

### [marken] 34 aktive Produkte bewerben sich als Nachahmung fremder Luxusmarken («im Chanel-Stil», «Dr.-Martens-Stil», «Birkenstock-inspiriert») — die Reparatur vom 12.08. hat nur den Titel gesäubert, Beschreibung, SEO-Meta und URL tragen die Behauptung unverändert weiter.
**Betroffen:** 38

**Kostet:** 31 der 34 stehen im Google-Kanal — dem einzigen Kanal mit belegten Verkäufen (52 Klicks, +206 %, praktisch alles organisch). «Impersonation/Counterfeit» ist bei Google Merchant ein Grund für die sofortige Kontosperre, und der Feed liest Titel UND Beschreibung. Zivilrechtlich reicht in der Schweiz nach MSchG Art. 13 Abs. 2 schon das Anlehnen an eine fremde Marke im Werbetext für eine Abmahnung; Chanel und Dr. Martens verfolgen «im Stil von»-Formulierungen systematisch. Dazu der Eigenschaden: der halb ausgeführte Titel-Schnitt hat 4 Titel kaputt gelassen (15447618978177, 15448659755393, 15448704811393, 15449113166209 stehen als «… im -Stil» im Shop) — das sieht die Kundin sofort. Die Lektion aus CLAUDE.md («wer eine Angabe aus einem Feld entfernt, muss prüfen, welches ANDERE Feld sie getragen hat») ist hier ein zweites Mal übersprungen worden: gesäubert wurde nur der Titel, obwohl die Aussage in vier Feldern liegt — Beschreibung, SEO-Titel, SEO-Beschreibung und Handle. Die URL ist dabei die zäheste: sie bleibt auch nach einer Textkorrektur bestehen und ist genau das, was in der Google-Suche verlinkt wird.
- 15448659755393 «Rundhals-Spitzentop im -Stil» — Titel wurde ausgeschnitten und steht jetzt kaputt da, während Beschreibung («die an den ikonischen Chanel-Stil erinnert»), SEO-Beschreibung («Rundhals-Spitzentop im Chanel-Stil – jetzt bei LuxeStyle CH bestellen») und die URL /products/rundhals-spitzentop-im-chanel-stil-623300 die Marke weiterhin nennen. Im Google-Kanal.
- 15485407691137 «Damenbluse im Chanel-Stil» — hier steht die Marke sogar noch im Titel selbst, dazu in SEO-Titel «Damenbluse im Chanel-Stil | LuxeStyle CH», SEO-Beschreibung, Beschreibung («Stilvoller Cardigan im Chanel-Stil») und URL /products/damenbluse-im-chanel-stil-627000.
- 15490774696321 «Flache Damen-Stiefeletten» — Titel live bereits gesäubert, aber Beschreibung («Diese flachen Stiefeletten für Damen im Dr. Martens Stil») und URL /products/flache-damen-stiefeletten-im-dr-martens-stil-615500 stehen unverändert. Im Google-Kanal.

### [altersgruppe] «newborn» wird als Sammelbecken für alle Babyware benutzt: 33 der 165 newborn-Produkte haben Grössen, die Neugeborene um Jahre überschreiten (bis Körperhöhe 140 cm bzw. Schuhgrösse 37) — die zutreffenden Google-Werte infant und toddler kommen im ganzen Katalog praktisch nicht vor.
**Betroffen:** 29

**Kostet:** Google definiert newborn ausdrücklich als «bis 3 Monate», infant als 3–12 Monate, toddler als 1–5 Jahre. Im ganzen Shop existieren nur adult (37'245), kids (2'561) und newborn (193) — infant taucht 4× auf (alles DRAFT), toddler kein einziges Mal. Damit ist bei jedem Artikel zwischen 3 Monaten und 5 Jahren der Wert entweder zu jung oder zu alt. Folge im Feed: Wer im Google-Shopping auf «Neugeborene» filtert, bekommt Kinderschuhe Grösse 36 und 140-cm-Outfits angeboten — Fehlklicks, die Geld kosten und die Attributqualität des Kontos senken; umgekehrt findet niemand die tatsächliche Kleinkindware unter dem passenden Filter. Merchant Center wertet den Widerspruch zwischen size/Variantenangabe und age_group als Datenqualitätsfehler.
- 15452316795265 «Silberne Baby- und Kinderschuhe mit Schleife» — age_group=newborn, Grössen 22,23,…,36 (Gr. 36 = ca. 10 Jahre); live geprüft ACTIVE, im Google-Kanal
- 15493858558337 «Baby-Lauflernschuhe aus Rindsleder» — age_group=newborn, Grössen 23–37; live geprüft ACTIVE
- 15447962321281 «Baby Mädchen Herbst-Outfit Gestreift & Schriftzug» — age_group=newborn, Varianten Red-90cm … Red-140cm (ca. 2–10 Jahre); live geprüft ACTIVE

### [warenkorb] Alle 27 «Selbst gestalten»-Produkte lassen sich über den normalen Kaufbutton und über «Mit shop kaufen» OHNE Design in den Warenkorb legen — der Warenkorb nimmt die Zeile ohne Druckdatei an
**Betroffen:** 27

**Kostet:** Jede so ausgelöste Bestellung geht als Print-on-Demand-Auftrag ohne Druckdatei an Printful bzw. den POD-Partner: entweder bleibt sie hängen und muss manuell geklärt/storniert werden, oder es geht unbedruckte Blankoware raus. Die Kundin hat «Selbst gestalten» gekauft und bekommt ein leeres Shirt — Rückerstattung, Rückversand und eine schlechte Bewertung bei einem Produkt, das mit CHF 27.90–54.90 zu den margenstärksten des Sortiments zählt. Über «Mit shop kaufen» entsteht der Schaden sogar ohne Zwischenstopp im Warenkorb, also ohne jede Chance, den Fehler zu bemerken. Betroffen ist die gesamte POD-Linie (27 Produkte).
- «Unisex T-Shirt – Selbst gestalten» gid://shopify/Product/15422811439489, Variante 55777948074369 (Grösse M): live POST https://luxestyle.ch/cart/add.js → HTTP 200, Warenkorbzeile «Unisex T-Shirt – Selbst gestalten - M», CHF 27.90, properties = {} (leer, keine Druckdatei); anschliessendes GET /cart.js: currency CHF, total 27.90, item_count 1 — checkoutfähig.
- «Unisex Hoodie – Selbst gestalten» gid://shopify/Product/15422815699329 (CHF 38.90) und «Keramik-Tasse – Selbst gestalten» gid://shopify/Product/15422823465345 (CHF 19.90): live geprüft, beide Seiten rendern den nativen Kaufbutton («In den Warenkorb legen», 2 Treffer) UND den Express-Bezahlknopf UND den Designer gleichzeitig.
- Screenshot der T-Shirt-Seite (/tmp/pod_shot.png): «In den Warenkorb legen» + violetter «Mit shop kaufen»-Knopf stehen direkt unter Preis und Grössenwahl; der Designer-Block «🎨 Jetzt selbst gestalten» mit dem korrekten Knopf «🛒 Mit meinem Design in den Warenkorb» sitzt erst ~900 px weiter unten, hinter Trust-Block, Versand- und Rückgabe-Akkordeons. DOM-Reihenfolge bestätigt: erster ATC-Text bei Index 351'073, lspod-designer erst bei 402'417.

### [dubletten] 121 weitere aktive Produkte tragen ein byte-identisches Hauptbild wie ein anderes Produkt und beschreiben erkennbar dieselbe Ware unter umformuliertem Titel — dieselbe Ware, zwei Seiten, zwei Preise
**Betroffen:** 26

**Kostet:** 117 der 121 stehen im Google-Kanal. Google Merchant sieht zwei Angebote mit identischem image_link und unterschiedlichem Preis — das drückt die Sichtbarkeit beider Einträge und ist genau die Konstellation, die als Duplicate Content abgewertet wird. Im Shop selbst erscheint dasselbe Foto zweimal in einer Kollektionsreihe, was den Eindruck eines gepflegten Sortiments zerstört, und die teurere Variante verliert den Verkauf an die billigere. Anders als Fund 2 tragen diese Paare verschiedene Lieferanten-SKUs, sind also über die SKU-Wache nicht auffindbar — die Dublette entsteht, weil zwei CJ-Listings dasselbe Lieferantenfoto benutzen.
- «Velohelm mit Schild und 5-Modi-Licht» ID 15448952242561, CHF 49.90 (CJ-2509071015201606200) und «Velohelm mit Schild für Pendler» ID 15448952897921, CHF 32.90 (CJ-CJYD245767801AZ): Hauptbild live heruntergeladen, beide md5 e9ec6ef5e0498b87f8f1fb114bb0dc08, 97'015 Byte — identische Datei. Beide ACTIVE und live erreichbar.
- «Panda Handyhalter – süsser Schreibtisch-Ständer für Smartphones» ID 15412301922689 und «Panda Halter» ID 15484294889857: Hauptbild live beide md5 96c110c9afda042a09c975012d3d9219, 71'789 Byte; beide ACTIVE, beide CHF 14.90, beide mit eigener Produktseite.
- «Herren Kork-Slipper «Lisbon» · leicht & vegan» ID 15429955977601, CHF 24.90 (SKU veg-kork-40) und «Kork-Slipper für Herren» ID 15481817629057, CHF 15.90 (CJ-CJYD277726801AZ): Hauptbild beide md5 1af7e1b46e97ed4b99099c49979e5b21.

### [altersgruppe] 28 Artikel, die ein Kind am Körper trägt (Kleidung, Schuhe, Schutzhelme, Rucksäcke), sind mit age_group=adult ausgezeichnet und stehen so im Google-Kanal — insgesamt tragen 95 explizit als Kinder-/Babyware betitelte Produkte den Wert adult.
**Betroffen:** 22

**Kostet:** Der Google-Kanal ist der einzige mit belegten Verkäufen (52 Klicks, +206 %). age_group ist für Bekleidung/Schuhe ein Pflichtattribut; ein Wert, der dem Artikel widerspricht, ist für Merchant Center eine Falschangabe (Misrepresentation-Nachbarschaft) und führt mindestens zu Artikelablehnung oder eingeschränkter Auslieferung. Praktisch bedeutet es: Kinderschuhe Gr. 27 und Kinderhelme laufen im Shopping-Filter «Erwachsene» mit, während Eltern, die auf «Kinder» filtern, sie nie sehen — bezahlte wie organische Sichtbarkeit landet bei der falschen Zielgruppe. Bei sicherheitsrelevanter Ware (3 Kinderschutzhelme, Kinderskates, Kindersitz-Zubehör) ist die falsche Altersgruppe zusätzlich eine Haftungsfrage.
- 15496130494849 «Carbon-Racing-Sneaker für Jungen» — age_group=adult, gender=male, Schuhgrössen 34–44, Kategorie «Apparel & Accessories > Shoes», live in 6 Kanälen inkl. Google & YouTube
- 15494462374273 «Kinderrucksack Superleicht» — age_group=adult, live geprüft: ACTIVE, Kanäle Online Store/Shop/TikTok/Facebook & Instagram/Google & YouTube/Pinterest
- 15495024804225 «Kinderhelm für Rollsport und Velo» — age_group=adult, live geprüft, im Google-Kanal (Schutzausrüstung für Kinder als Erwachsenenware ausgezeichnet)

### [google-heikel] Die Marken-Bereinigung vom 12.08. griff nur im Titel — in 20 Produkten steht «Chanel» weiter im Beschreibungstext, und vier Titel sind dabei zu «im -Stil» verstümmelt worden
**Betroffen:** 22

**Kostet:** Eine Luxusmarke zu nennen, um einen Stil zu beschreiben, wertet Google als Markenrechtsverstoss — und der Feed liest die Produktbeschreibung, nicht nur den Titel. Genau deshalb wurden am 12.08. zehn Produkte deswegen aus dem Kanal genommen; die Reparatur hat aber nur das Feld angefasst, in dem der Fehler zuerst auffiel. Das ist wörtlich die Lehre aus CLAUDE.md («Wer eine Angabe aus einem Feld entfernt, muss prüfen, welches ANDERE Feld sie getragen hat») — hier fällt sie ein zweites Mal an. Die vier «im -Stil»-Titel kosten zusätzlich direkt Umsatz: sie sind kundensichtbar kaputt und stehen so in jeder Google-Anzeige und jeder Kollektionskachel. Insgesamt tragen 24 aktive Produkte im Google-Kanal einen Luxusmarkennamen NUR in der Beschreibung, also unterhalb jeder Titelprüfung.
- 15448659755393 · Titel live: «Rundhals-Spitzentop im -Stil» (CHF 14.90, Google: JA). Der Markenname wurde aus dem Titel geschnitten, der Text sagt weiter: «eine elegante Rundhals-Spitze, die an den ikonischen Chanel-Stil erinnert». Kundin sieht einen kaputten Titel, Google sieht die Marke.
- 15449113166209 · Titel live: «Herren Übergangsjacke im -Stil» (CHF 49.90, Google: JA). Text: «Diese luxuriöse Langarm-Übergangsjacke im Chanel-Stil ist wie gemacht für den modebewussten Mann.»
- Zwei weitere verstümmelte Titel, beide live und im Kanal: 15447618978177 «Kissenbezug mit Quasten im -Stil» und 15448704811393 «Warmer Strick-Cardigan im -Stil».

### [blog] 19 Blogartikel nennen die Gratis-Versand-Schwelle CHF 65 — Shop und Versandregel sagen CHF 50, und 62 andere Artikel ebenfalls
**Betroffen:** 19

**Kostet:** Der Artikel nennt die Schwelle genau dort, wo die Leserin über den Kauf entscheidet. Wer glaubt, sie müsse CHF 65 erreichen, obwohl ab CHF 50 gratis geliefert wird, hält die Bestellung eher für zu teuer und bricht ab — oder fühlt sich getäuscht, wenn die Zahl im Checkout eine andere ist. Zusätzlich widerspricht sich der Blog in sich selbst: 62 Artikel sagen CHF 50, 19 sagen CHF 65. Es ist derselbe Fehler, der laut Projektgedächtnis schon in 12 Importern steckte (Regel: bei jeder Textstelle prüfen, ob ein anderer Reiniger dieselbe Aussage gegenläufig setzt) — die Blogartikel wurden bei dieser Korrektur schlicht nicht mitgezogen.
- «Akupressurmatte Anwendung: So nutzt du die Matte richtig für Entspannung» (Article/1001545957761): «Bei LuxeStyle CH bestellst du versandkostenfrei ab CHF 65, profitierst von 30 Tagen Rückgaberecht»
- «Himalaya Salzlampe Wirkung: Was sie wirklich kann und was Mythos ist» (Article/1001546678657): «Innerhalb der Schweiz liefern wir versandkostenfrei ab CHF 65»
- «Smartwatch für Einsteiger: Der ehrliche Ratgeber 2026» (Article/1001547006337): «Bei LuxeStyle CH profitieren Sie vom gratis Versand ab CHF 65»

### [bilder-fehler] 18 aktive Produkte haben ÜBERHAUPT kein Bild über 250 px — bestes verfügbares Bild 149–248 px, durch Umsortieren nicht heilbar.
**Betroffen:** 18

**Kostet:** Bei diesen Produkten hilft kein Umsortieren — es gibt schlicht kein brauchbares Bild, es braucht eine neue Bildquelle beim Lieferanten. 5 stehen im Google-Kanal; davon verfehlen «Minimalistischer Unisex Ring» (150 px) und «Hawaii-Hemd Kurzarm» (244 px) Googles harte Mindestgrösse von 250×250 für Bekleidung und Schmuck und werden im Feed abgelehnt, nicht bloss schlechter platziert. Die übrigen 13 (Fortura-Spielzeug und -Kostüme) sind im Onlineshop live und werden vom Theme aus ~200 px auf 800–1600 px hochgezogen: die Produktseite zeigt einen unscharfen Klotz, was bei Markenware wie BRUDER oder John Deere nach Fälschung aussieht statt nach Fachhandel.
- Minimalistischer Unisex Ring — 5 Bilder, alle 150×150, im Google-Kanal, Kategorie «Apparel & Accessories > Jewelry» (ID 15493498831233)
- Fitnessmatte Morandi Puder — bestes Bild 150×149, im Google-Kanal (ID 15495783940481)
- Hawaii-Hemd Kurzarm für Herren — 10 Bilder, bestes 244 px, im Google-Kanal, Kategorie «Apparel & Accessories > Clothing» (ID 15485321478529)

### [jugendschutz] Alle 16 Produkte, die wegen bestätigter Google-Merchant-Richtlinienverstösse aus dem Google-Kanal genommen worden waren, stehen wieder drin — inklusive der fünf «Restricted adult content»- und der drei CBD-Fälle
**Betroffen:** 16

**Kostet:** Das sind keine Vermutungen über Richtlinien, sondern von Google selbst gemeldete Verstösse: automation/merchant_issue_fix.py hat sie aus dem Merchant-Center-Export gelesen, per publishableUnpublish aus dem Google-Kanal genommen, getaggt und im Ledger quittiert. Die Reparatur ist zu 100 % zurückgedreht — offensichtlich hat ein späterer Lauf, der Produkte in den Google-Kanal nachzieht (automation/google_kanal_nachziehen.py bzw. der CJ-Importer), sie kommentarlos wieder publiziert, weil er die Sperr-Tags nicht kennt. Wirkung: dieselben gemeldeten Verstösse laufen jetzt erneut in den Feed. Wiederholte Richtlinienverstösse nach einer bereits erfolgten Meldung sind der Standardweg zur Merchant-Kontosperre — und der Google-Kanal ist der einzige mit belegten Verkäufen (52 Klicks, +206 %, 3'170 Impressionen, praktisch alles organisch). Es ist exakt das Muster, das im Projektgedächtnis schon zweimal Geld gekostet hat: «Zu jedem Backfill gehört die Frage, wer das Feld beim NÄCHSTEN Produkt schreibt» — hier fehlt die Frage, wer den Kanal beim nächsten Lauf wieder aufmacht. Die Sperr-Tags (google-gesperrt-adult/-cbd/-notlage) sind im Katalog vorhanden, werden vom Nachzieh-Lauf aber nicht als Ausschluss gelesen.
- Ledger dropship/_merchant_issue_done.txt listet 17 abgearbeitete Verstösse; 16 sind noch ACTIVE, und alle 16 sind live wieder in 'Google & YouTube' publiziert (nur 15479401349505 «Hörgerät» ist inzwischen DRAFT und damit aus dem Kanal — durch den Medizinprodukte-Guard, nicht durch diesen Fix)
- 15492325933441 «Pailletten Neckholder Minikleid» — Ledger-Grund google-gesperrt-adult (Restricted adult content); live publiziert in Online Store, Shop, TikTok, Facebook & Instagram, Pinterest, Google & YouTube
- 15449431441793 «Fitness-Yoga-Shorts mit Lift-Effekt» — Ledger-Grund google-gesperrt-adult; live wieder im Google-Kanal

### [suche] Fremde Markennamen wurden nur aus den TITELN gestrichen — in den Produkt-URLs stehen sie weiter, und die Kürzung hat 7 Titel zu Satzruinen gemacht («Lenkradblende für -Benz»)
**Betroffen:** 15

**Kostet:** Die Marken-Bereinigung vom 12.08. gilt als erledigt, ist es aber nicht: Google und Kundinnen sehen den Markennamen weiterhin in der Produkt-URL (Merchant liest den Link mit, die URL steht in den Suchergebnissen und in der Adresszeile), und die Artikel sind alle im Google-Kanal publiziert — genau das Sperr-Risiko, wegen dem am 12.08. 10 Titel geändert wurden. Zusätzlich hat die Kürzung Schaden angerichtet: 7 Titel enden jetzt im Nichts. Bei «Lenkradblende für -Benz» und «TPU Silikon Schlüsselhülle für» ist die KOMPATIBILITÄTSANGABE weg — die Kundin kann nicht mehr erkennen, für welches Auto das Teil passt, was direkt Retouren und Nicht-Käufe erzeugt.
- 15447618978177 — Titel live: «Kissenbezug mit Quasten im -Stil», URL: /products/kissenbezug-mit-quasten-im-chanel-stil-632400 (HTTP 200), live in allen 6 Kanälen inkl. «Google & YouTube»
- 15479377133953 — Titel live: «Lenkradblende für -Benz», URL: /products/lenkradblende-fur-mercedes-benz-608800, live in allen 6 Kanälen inkl. «Google & YouTube»
- 15479636787585 — Titel live: «TPU Silikon Schlüsselhülle für» (Satz bricht ab), URL: /products/tpu-silikon-schlusselhulle-fur-bmw-296128

### [titel-codes] 14 aktive Kleidungsstücke tragen den rohen CJ-Variantenstring als Titel-Ende — englische Farbe plus Grössen-Präfix («– S-Black», «– Blue-0XL», «– Beige-2XL-Standing collar»). Der Titel behauptet damit eine einzige Grösse, obwohl das Produkt S bis 3XL führt.
**Betroffen:** 14

**Kostet:** Alle 14 stehen im Google-Kanal. Der Titel widerspricht dem Angebot: Google liest «S-Black» als Produktnamen, während die Varianten S–3XL abdecken — Titel und Grössen-/Farbattribut passen nicht zusammen, und eine Kundin, die S–3XL sucht, sieht einen Artikel, der nur in S zu existieren scheint. Zusätzlich stehen englische Farbwerte (Black, Dark Brown, Ivory White, Gray Coffee, Midnight Blue) im Titel eines deutschsprachigen Schweizer Shops — dieselben Werte wurden in der Varianten-Auswahl längst übersetzt (S-Schwarz, S-Dunkelbraun), nur im Titel blieb der Rohstring stehen. Bei einem Kanal, der praktisch den gesamten belegten Umsatz trägt, ist jeder so entstellte Titel ein direkt verlorener Klick.
- 15448113578369 — «Eleganter Jumpsuit mit weitem Bein und V-Ausschnitt – S-Black»; die Option «Farbe» führt 25 Werte von S-Schwarz bis 2XL-Grün — der Titel nennt genau einen davon
- 15448790401409 — «Leinenhemd mit Stehkragen für Herren – Beige-2XL-Standing collar»; angeboten M/L/XL/2XL/3XL in Beige und Midnight Blue. Im Titel steht ausserdem der unübersetzte Kragen-Attributwert «Standing collar»
- 15448582521217 — «Damen Jumpsuit mit weitem Bein – Blue-0XL»; «0XL» ist keine im DACH-Raum existierende Grösse, das Produkt führt zusätzlich eine eigene Option Grösse 2XL–5XL

### [titel-deutsch] 13 aktive Produkte tragen den rohen englischen Grössen-Farb-Code des Lieferanten am Titelende («– S-Ivory White», «– M-Gray Coffee», «– Beige-2XL-Standing collar») – obwohl das Produkt 3 Farbvarianten hat
**Betroffen:** 13

**Kostet:** Alle 13 stehen im Google-Kanal. Der Titel behauptet gegenüber Google und der Kundin eine einzige Grösse («S», «XS», «2XL»), obwohl das Produkt gar keine Grössen-Option hat, sondern 3 Farbvarianten – wer «Jumpsuit XS» sucht und die Grösse dann nicht wählen kann, springt ab. «Gray Coffee», «Ivory White», «Brick Red» sind zudem keine Farben, die eine Schweizer Kundin kennt; sie stehen dort nur, weil ein Importer den Variantenstring des Lieferanten in den Titel geschrieben hat. Bei den Jumpsuits erzeugt der Code fünf fast wortgleiche Titel, die sich nur durch den englischen Anhang unterscheiden – in der Kollektionsansicht sieht das wie ein Dublettenfehler aus.
- «Ärmelloser Jumpsuit mit weitem Bein – S-Ivory White» (15448115282305) – 3 Farbvarianten im Shop, Titel verspricht Grösse S in einer Farbe
- «Leinenhemd mit Stehkragen für Herren – Beige-2XL-Standing collar» (15448790401409) – «Standing collar» ist zusätzlich die englische Doppelung des schon im Titel stehenden «Stehkragen»; 3 Varianten
- «High-Waist Yoga Leggings mit Shaping-Effekt – M-Gray Coffee» (15448604934529) und «… – S-Blue» (15448603066753) – zwei fast identische Artikel, unterschieden nur durch einen englischen Variantencode

### [material-metafeld] 17 aktive Schmuckstücke deklarieren material="Gold" bzw. "Silver", obwohl die eigene Beschreibung vergoldetes/versilbertes Kupfer, Messing, Zink- oder Nickelsilber-Legierung nennt — alle im Google-Kanal.
**Betroffen:** 12

**Kostet:** Das Schweizer Edelmetallkontrollgesetz behandelt Bezeichnungen wie «Gold» und «Silber» als geschützte Angaben: plattierte Ware darf nicht ohne Kennzeichnung der Plattierung als Gold- oder Silberware bezeichnet werden. Genau das passiert hier im maschinenlesbaren Feed-Feld, während die Verkaufsseite «vergoldet»/«Kupferlegierung» sagt — derselbe Feed-gegen-Zielseite-Widerspruch wie beim Kunstleder, nur in der Warengruppe mit dem höchsten Preishebel. Google Shopping filtert Schmuck nach Material; wer «Gold» einträgt, konkurriert in einem Preissegment, in dem CHF-20-Ware wie Betrug wirkt — das erzeugt Rücksendungen und Beschwerden statt Verkäufen. Der Nickelsilber-Fall ist zusätzlich heikel: das Produkt wird an anderer Stelle als hypoallergen beworben, Nickel ist in der EU/CH bei Hautkontakt mengenmässig reguliert.
- "Vergoldetes Zirkon Armband" (15493934023041) — material="Gold"; Beschreibung: «Gefertigt aus kupferplattiertem Echtgold». Live per GraphQL bestätigt: Wert "Gold", ACTIVE.
- "Ohrringe «Blue Lotus» mit Zirkonia-Einlage" (15477090091393) — material="Silver"; Materialzeile der Beschreibung: «Material: Nickelsilber (Kupferlegierung)» — Nickelsilber enthält kein Silber. Live bestätigt.
- "Gestreifter Metallring, Kupfer vergoldet" (15493863375233) — material="Gold"; Beschreibung: «vergoldeten Kupferausführung, die durch ein hochwertiges Galvanisierungsverfahren veredelt».

### [menue] Das komplette Footer-Menü wird auf der Live-Storefront nirgends gerendert — 12 von 14 Service- und Rechtsseiten sind aus der gesamten Navigation unerreichbar.
**Betroffen:** 11

**Kostet:** Versandkosten, Lieferzeit, Rückgabe und Sendungsverfolgung sind die vier Fragen, die eine Kundin VOR dem Checkout klärt — genau diese Seiten sind aus der Navigation nicht klickbar. Bei 0,37 % Add-to-Cart und 10 offenen Warenkörben ist jeder unbeantwortete Vertrauensanker direkt ein Kaufabbruch. Dazu: 30 Magazin-Artikel ohne internen Link bekommen kaum Crawl-Budget, und zwei nebeneinander live stehende AGB-Fassungen mit unterschiedlicher Versandschwelle (CHF 65 vs. CHF 50) sind im Streitfall ein rechtliches Risiko.
- Menü »Footer menu« (gid://shopify/Menu/310224126337) hat 14 Einträge; kein einziger href="/pages/faq" auf Startseite, Kollektionsseite, Produktseite, Seiten-Template oder Blog-Template — die Seite selbst lebt aber (200, 2'331 Zeichen Text)
- »Sendungsverfolgung« → /pages/tracking (200, 1'574 Zeichen) — 0 Verlinkungen auf allen 6 geprüften Seitentypen
- »Kontakt & Support« → /pages/kontakt-support (200, 1'093 Zeichen) — 0 Verlinkungen

### [suche] Umlaute als ae/oe/ue getippt ergeben eine Sackgasse — obwohl Tippfehler sonst abgefangen werden
**Betroffen:** 11

**Kostet:** Es ist kein generelles Suchproblem, sondern eine Lücke mit klarem Rand: echte Tippfehler fängt die Suche ab («sonnenbrile» → 65 Treffer, «rucksak» → 461), nur die ae/oe/ue-Umschrift nicht. Wer am Handy oder auf einer Nicht-Schweizer Tastatur «maentel» tippt, sieht bei 155 vorhandenen Mänteln eine leere Seite und geht. Bei «bettwaesche» ist es schlimmer als leer: der Shop antwortet mit einer Samthose, obwohl 33 Bettwäsche-Artikel im Regal liegen.
- «maentel» → 0 Treffer, «mäntel» → 155 Treffer
- «schluesselanhaenger» → 0, «schlüsselanhänger» → 30
- «bettwaesche» → 1 Treffer, und der ist falsch: «Bestickte Retro Samthosen mit weitem Bein» 15448653988225; «bettwäsche» → 33 Treffer

### [warenkorb] 10 aktive Schweiz-Poster liegen in einem eigenen Versandprofil ohne Gratis-Versand-Regel — Produktseite und Warenkorb-Balken versprechen trotzdem «Gratis-Versand ab CHF 50»; EIN Poster im Korb kostet den Gratis-Versand für die ganze Bestellung
**Betroffen:** 10

**Kostet:** Der Shop verspricht auf der Produktseite und mit einem Fortschrittsbalken im Warenkorb («🎉 Gratis-Versand gesichert!») etwas, das die Kasse dann nicht einlöst. Der Aufschlag erscheint erst im letzten Schritt und trifft die ganze Bestellung, nicht nur das Poster — auf einen CHF 78.50-Korb kommen unangekündigt CHF 10.23. Genau dieser Bruch zwischen zugesagtem und berechnetem Endpreis ist der klassische Abbruchgrund im letzten Checkout-Schritt, und bei einem Shop, dessen Engpass ohnehin vor dem Warenkorb liegt, ist jeder verlorene Korb teuer. Der Balken macht es schlimmer: er fordert Kundinnen aktiv auf, für den Gratis-Versand nachzulegen. Zusätzlich verlangt die CH-Preisbekanntgabeverordnung, dass die tatsächlich zu zahlenden Kosten korrekt angegeben werden.
- «Schweiz-Poster «Grüezi» – Mundart-Kunstdruck» gid://shopify/Product/15427142812033, Variante 55791483322753, CHF 14.90. Live-Berechnung (draftOrderCalculate, Lieferadresse Bahnhofstrasse 1, 8001 Zürich, CH): 4 Stück = Zwischensumme CHF 59.60 → einzige verfügbare Versandart «EFTA Flat Rate CHF 10.23». Kein Gratis-Versand, obwohl weit über CHF 50.
- MISCHKORB-Beweis: 4× «Auto Rücksitz-Organizer» (Variante 55797107196289, CHF 63.60 — allein berechtigt zu «Kostenloser Versand CHF 0.00») PLUS 1× Poster 55791483322753 → Zwischensumme CHF 78.50, einzige Versandart «Versand CHF 10.23». Der Gratis-Versand verschwindet komplett; ein Artikel für CHF 14.90 verteuert die Lieferung um CHF 10.23.
- Kontrollmessung ohne Poster: CHF 47.70 → nur «Standard CHF 7.00»; CHF 63.60 → «Kostenloser Versand CHF 0.00» + «Standard CHF 7.00». Die Regel funktioniert also überall sonst korrekt — nur nicht bei diesen 10 Produkten.

### [preis-ausreisser] Bei 9 Produkten steckt reines Zubehör als «Farbe» in der Variantenauswahl — der Shop und der Google-Feed zeigen deshalb den Zubehörpreis als Produktpreis, und wer «Farbe: Battery» bestellt, bekommt für CHF 14.90 einen Ersatzakku statt der Drohne.
**Betroffen:** 9

**Kostet:** Alle 9 stehen im Google-Kanal. Shopify meldet jede Variante als eigenes Angebot — Google bekommt also ein Angebot mit dem Titel «E58 Faltbare HD-Drohne» zu CHF 14.90, das in Wahrheit ein Akku ist. Das ist Misrepresentation, laut Merchant-Richtlinie ein Grund für sofortige Kontosperrung, und trifft ausgerechnet den einzigen Kanal mit belegten Verkäufen (52 Klicks, +206 %). Im Shop selbst zieht der Zubehörpreis das Produkt in die Billig-Kollektionen und -Filter: die Drohne wird über «unter CHF 25» eingeliefert und enttäuscht dort jeden Klick. Bestellt jemand die Variante tatsächlich, verschickt die Automatik einen Akku und der Kunde reklamiert eine Drohne — ein Fall, der immer Geld kostet. Verwandt, aber NICHT dasselbe wie die bekannte «ab CHF 4.90»-Falle: `preisboden.py` hat damals nur die Preise auf CHF 14.90 angehoben, die Zubehör-Varianten stehen unverändert als «Farbe» drin.
- 15450850591105 «E58 Faltbare HD-Drohne» — Option «Farbe» enthält den Wert «Battery» zu CHF 14.90, die Drohne selbst kostet CHF 46.90–73.90. Live: `/products/e58-faltbare-hd-drohne-c013de.js` liefert price 1490, price_min 1490, price_max 7390, Variante «Battery» available:true. Die Brotkrume der Produktseite führt entsprechend über «Mehr & Sale → unter CHF 25».
- 15453776281985 «Reise-Pass-Tasche» — Option «Farbe» hat nur die Werte «Sample» (CHF 15.90) und «Bulk product» (CHF 138.90); das sind Lieferanten-Bestellmodi, keine Farben. Live: price_min 15.90 / price_max 138.90 (Faktor 8.7).
- 15450838532481 «Chivo kw10pro Smartwatch für Damen» — «Farbe»-Werte «Gold Watch band», «Silver Watch band», «Usb cable» (CHF 14.90) neben den echten Uhren-Sets zu CHF 66.90

### [jugendschutz] 11 Laserpointer live im Shop — in der Schweiz nach V-NISSG verboten, kein einziger nennt eine Laserklasse, und 8 davon stehen in den Kinder-/Baby-/Spielzeug-Kollektionen
**Betroffen:** 9

**Kostet:** V-NISSG (SR 814.711) erlaubt seit 1.6.2021 nur noch Laserpointer der Klasse 1, und diese nur zu Zeigezwecken in Innenräumen; Einfuhr, Durchfuhr, ANBIETEN, Abgabe und Besitz der Klassen 1M/2/2M/3R/3B/4 sind verboten. BAG und die kantonalen Waffenbüros halten ausdrücklich fest, dass handgeführte Laser als Katzen-/Tierspielzeug unter dieses Verbot fallen — genau die hier verkaufte Bauart. Konkrete Kosten: (1) Beim Dropshipping-Direktversand aus China beschlagnahmt das BAZG die Sendung an der Grenze — die Kundin hat bezahlt und bekommt nichts, dazu Rückerstattung + Bewertungsschaden; (2) «Anbieten» ist bereits die strafbare Handlung, nicht erst der Versand — Anzeige/Busse treffen den Shopbetreiber, nicht CJ; (3) 10 der 11 stehen im Google-Kanal, dem einzigen Kanal mit belegten Verkäufen (52 Klicks, +206 %) — der Verkauf gesetzlich verbotener Ware ist ein Merchant-Sperrgrund; (4) am schwersten: 8 davon werden Eltern in «Kinder & Baby» / «Kinderspielzeug» / «Geschenke für Kinder» als Kindergeschenk angeboten — ein 3R-Strahl ins Auge eines Kindes ist eine bleibende Netzhautschädigung. Keines der 11 Produkte nennt eine Laserklasse, eine Leistung in mW oder eine Augenwarnung.
- 15495186612609 «Laser-Pointer für Katzen» CHF 21.90 — Live-Breadcrumb auf luxestyle.ch lautet «Home › Mehr & Sale › Kinder & Baby › Laser-Pointer für Katzen»; Kollektionen: baby-kleinkind, sub-baby-kids, spielzeug, kinderspielzeug, geschenke-fuer-kinder; publiziert in Online Store, Shop, TikTok, Facebook & Instagram, Pinterest, Google & YouTube
- 15454193090945 «Drahtloser Laserpointer für Präsentationen» CHF 15.90 — klassischer handgeführter Präsentations-Pointer, in allen 6 Kanälen inkl. Google & YouTube; Beschreibung behauptet sogar «strahlungsfrei … schadet nicht Ihrer Gesundheit»
- 15485599777153 «Laser Hundetrainer» CHF 15.90 — Kollektionen baby-kleinkind, sub-baby-kids, geschenke-fuer-kinder

### [medizin] Neun im August neu importierte Geräte mit medizinischer Zweckbestimmung (Fieberüberwachung bei kranken Kindern, Hirn-/Muskel-Elektrostimulation, Gehörgang-Endoskop, Behandlung eingewachsener Nägel, Zahnsteinentfernung) stehen aktiv im Shop UND im Google-Kanal — der Medizinprodukte-Wächter hat sie nicht erfasst, weil er nach Produktnamen sucht, nicht nach Funktion
**Betroffen:** 8

**Kostet:** Google ist der einzige Kanal mit belegten Verkäufen (52 Klicks, +206 %, praktisch alles organisch). Nicht konforme Medizinprodukte und Elektrostimulationsgeräte sind ein Merchant-Sperrgrund («Healthcare and medicines»), und eine Sperre trifft genau den Kanal, der Umsatz bringt. Schweizrechtlich fallen Fieberüberwachung, CES/EMS-Stimulation und die Behandlung eingewachsener Nägel unter die MepV (Konformitätsbewertung, CE, Anwenderinformation) — ein Fieberpflaster für ein krankes Kind, das bei 38 °C Alarm schlagen soll, ist zudem ein direktes Produkthaftungsrisiko, wenn der Alarm ausbleibt. Strukturell ist es der Fehler, den das Gedächtnis am 12.08. schon einmal notiert hat: Der Wächter lief am 12.08. über die August-Ware und draftete vier Artikel (Hörtest-Headset, Stirnthermometer kontaktlos, Handgelenk-Lichtwellen-Therapiegerät, Ventilator Nasenpolster-Set) — alle vier heissen so, wie sein Muster sie erwartet. Die neun oben tragen die Funktion nur im Beschreibungstext und werden deshalb bei JEDEM künftigen Importtag erneut durchgelassen.
- 15493810356609 «Smartes Temperaturpflaster für Kinder» — «kontinuierliche Überwachung der Körpertemperatur Ihres Kindes über 24 Stunden … besonders nützlich, wenn Ihr Kind krank ist, da es bei Erreichen einer kritischen Temperatur von 38 °C einen intelligenten Alarm auslöst». Das ist ein Fieberüberwachungsgerät für kranke Kinder = klinisches Thermometer mit Messfunktion (MepV), verkauft als Gadget ohne jeden Konformitätshinweis. ACTIVE, Onlineshop + Google-Kanal, kein Tag `medizinprodukt-pruefen`.
- 15484629811585 «2-in-1 Schlafgerät mit Ohrclip und Handheld», CHF 19.90 — «wissenschaftlich fundierte CES-Technologie (Cranial Electrotherapy Stimulation), die durch Mikrostrom-Modulation der Gehirnwellen das Einschlafen beschleunigt». CES-Geräte sind regulierte Medizinprodukte (Stromfluss durch den Kopf); dazu die unbelegte Aussage «Wissenschaftlich belegte CES-Technologie». ACTIVE + Google-Kanal.
- 15483933491585 «Einschlafhilfe mit EMS-Mikrostrom», CHF 10.90 — «Ohne Medikamente, chemische Zusätze, Nebenwirkungen oder Suchtgefahr … ideal für Menschen mit Stress, Angstzuständen und Schlafstörungen». Elektrostimulation plus ausdrückliche Indikation Schlafstörung/Angst, plus Nebenwirkungsfreiheits-Versprechen. ACTIVE + Google-Kanal.

### [seiten] Sieben veröffentlichte Rückgabe-/Widerrufsseiten widersprechen sich bei Erstattungsfrist und Rücksendekosten — zwei davon hängen nebeneinander im Footer, eine nennt Retouren-Mailadressen auf der aufgegebenen Domain luxestyle.com.co
**Betroffen:** 7

**Kostet:** Bei widersprüchlichen AGB-/Rückgabeklauseln gilt die für den Kunden günstigste Auslegung (Unklarheitenregel, OR Art. 18) — der Shop kann also gezwungen sein, jede Retoure per Gratis-Label und binnen 5 Werktagen abzuwickeln, obwohl er intern das Gegenteil kalkuliert. Schlimmer ist die tote Adresse: Eine Kundin, die ihre Rückgabe fristgerecht an returns@luxestyle.com.co meldet, bekommt keine Antwort, verpasst dadurch die 30-Tage-Frist und hat einen berechtigten Beschwerdefall samt Chargeback-Risiko. Zwei direkt benachbarte Footer-Links, die sich beim wichtigsten Vertrauenspunkt eines Dropshipping-Shops widersprechen, kosten zudem genau in dem Moment Conversion, in dem der Kunde nach Sicherheit sucht.
- gid://shopify/Page/697899483521 «Rückgabe & Widerruf» (Footer-Link «Rückgabe & Umtausch»): «Du erhältst ein Rücksendelabel per E-Mail (innert 24h)» und «Wir erstatten dir den Kaufpreis innerhalb von 7 Werktagen» — dieselbe Seite sagt in der Tabelle darunter «Gefällt mir nicht / Grösse falsch → Kunde» zahlt die Rücksendung. Die Seite widerspricht sich selbst.
- gid://shopify/Page/697996345729 «30 Tage Rückgaberecht & 14 Tage Widerruf (EU)» (Footer-Link «Widerruf (14 Tage)», direkt daneben): «Die Rücksendekosten trägst du selbst», kein Label, stattdessen «Wir senden dir die passende Retourenadresse» und «spätestens 14 Tage nach Eingang» statt 7 Werktage — plus «Unsere Impressum-Adresse ist keine Retourenadresse. Bitte sende nichts unaufgefordert dorthin.», während die Nachbarseite ein Postpaket-Label verspricht.
- gid://shopify/Page/698094092673 «↩️ Rückgabe & Widerrufsrecht»: nennt als einzige Kontaktwege «Email an returns@luxestyle.com.co» und «Email mit Foto an hello@luxestyle.com.co» — Adressen auf der alten, nicht mehr als Shop-Domain genutzten .com.co-Domain (www.luxestyle.com.co löst nicht mehr auf); Erstattungsfrist hier: «innerhalb 5 Werktagen».

### [marken] 6 aktive CJ-Billigprodukte führen «Seiko» als erfundenen Hersteller- bzw. Bauteilnachweis — Ursache ist die maschinelle Übersetzung des chinesischen 精工 («Feinwerktechnik»), das denselben Schriftzeichen wie der Markenname trägt.
**Betroffen:** 6

**Kostet:** Das ist kein Stilvergleich, sondern eine Tatsachenbehauptung über verbaute Komponenten. Bei der Armbanduhr (15454497309057) ist das Uhrwerk das kaufentscheidende Merkmal — «Seiko-Quarzwerk» rechtfertigt den Preis und ist schlicht falsch. Das erfüllt in der Schweiz UWG Art. 3 Abs. 1 lit. b (irreführende Angaben über die Beschaffenheit) und ist bei Google Merchant «Misrepresentation», die härteste Sperrkategorie. Alle 6 stehen im Google-Kanal. Wichtiger als die Zahl ist die Quelle: 精工 heisst «Präzisionsfertigung» und ist in chinesischen Lieferantentexten ein Allerweltswort — Seikos japanischer Name benutzt dieselben Zeichen, weshalb jeder Übersetzer daraus die Marke macht. Solange der CJ-Importer diese Texte ungeprüft übernimmt, entstehen mit jedem Import neue Fälle; ein einmaliges Bereinigen der 6 repariert nur den Bestand, nicht die Quelle — genau das Muster, das CLAUDE.md schon zweimal teuer gelernt hat («zu jedem Backfill gehört die Frage, wer das Feld beim NÄCHSTEN Produkt schreibt»). Dieselbe Falle liegt bei 精品/名牌 und bei Farbnamen wie «Chanel style» (15455745180033) und «Hermes-38mm40mm41mm» (15448876220801), die ebenfalls als Variantenwerte im Kaufblock stehen.
- 15454497309057 «Wasserdichter Leuchtender Quarzarmbanduhr mit Kalender» — «Sie besitzt ein Seiko-Quarzwerk mit chinesischer Herkunft» und in der Merkmalsliste nochmals «Seiko-Quarzwerk». Der Satz widerspricht sich selbst; ein Seiko-Werk aus chinesischer Fertigung gibt es nicht. Im Google-Kanal.
- 15453921902977 «Mediavalles Kupferarmband» — «Es besteht aus umweltfreundlichem Kupfer und wurde mit moderner Seiko-Technologie hergestellt», Merkmal «Moderne Seiko-Verarbeitungstechnologie». Seiko baut keine Kupferarmbänder. Im Google-Kanal.
- 15449424691585 «Hochdruck-Tassenreiniger für Kaffeepitcher» — «Der Seiko-Qualitätsauslauf mit 5-Loch-Düse». Hier ist die Fehlübersetzung offensichtlich: ein Uhrenhersteller an einem Spülauslauf. Im Google-Kanal.

### [kollektionstexte] Fünf Kollektionen versprechen Blitzversand/Schweizer Lager, obwohl fast nichts darin aus dem CH-Lager kommt — bei «Schweizer Editionen» 237 von 243
**Betroffen:** 5

**Kostet:** «Blitzversand» ist das einzige echte Differenzierungsmerkmal gegenüber Temu/AliExpress. Wer wegen dieses Versprechens bestellt und dann 7–14 Tage auf China-Ware wartet, storniert, macht Rückbuchung und bewertet negativ — die Aussage steht auf der Kategorieseite, während die Produktseite direkt darunter etwas anderes sagt. Nach UWG Art. 3 Abs. 1 lit. b ist eine unzutreffende Lieferzeitangabe zudem eine irreführende Angabe, und Google Merchant behandelt widersprüchliche Versandangaben als Misrepresentation — bei dem einzigen Kanal mit belegten Verkäufen ein unnötiges Sperr-Risiko.
- «Schweizer Editionen» (erste-august, ID 688564306305, 243 aktive Produkte): Text live «Vieles ab Schweizer Lager mit Blitzversand» — tatsächlich tragen nur 6 der 243 den Tag ch-lager, also 2,5 %. Beispiel Mauspad «Haeee» (ID 15427285090689) und Tasche «Matterhorn» (ID 15427284992385): kein ch-lager; die eigene Produktseite sagt «Lieferung CH ca. 5–10 Werktage» bzw. «7–14 Tage».
- «Haarpflege & Styling» (beauty-haar, ID 690801967489, 368 aktive): Text «kuratierte Auswahl, Blitzversand aus der Schweiz» — OHNE Einschränkung. 193 der 368 sind nicht im CH-Lager, z. B. «Kabelloser Keramik Mini-Lockenstab» (ID 15496541274497) und «Fluffy Hair Straightener Styling Glätteisen» (ID 15496537145729). Zusatzwiderspruch: die SEO-Beschreibung bewirbt «Shampoos, Kuren und Styling-Helfer», die Smart-Regel der Kollektion lässt aber ausschliesslich Titel mit Haartrockner/Föhn/Glätteisen/Lockenstab/Haarbürste/Perücke zu — ein Shampoo kann gar nicht darin sein.
- «Steh- & Deckenlampen» (licht-decken-steh, ID 690626625921, 17 aktive): SEO-Beschreibung «… · Blitzversand a…» — 0 von 17 sind ch-lager, z. B. «LED Deckenleuchte» (ID 15486742528385), «Memphis Glas-Hängelampe» (ID 15478569042305).

### [menue] Acht Menü-Einträge (darunter ein Top-Level-Punkt der Hauptnavigation) führen auf faktisch leere Kategorieseiten, weil 97–99 % der zugeordneten Produkte auf DRAFT stehen.
**Betroffen:** 5

**Kostet:** »Beauty & Parfüm« ist einer von zehn Top-Level-Punkten der Hauptnavigation und wird auf der Startseite ausdrücklich beworben (»Beauty & Pflege bis zu Technik & Gadgets«). Wer dort klickt, sieht ein einziges Produkt und hält den Shop für leer oder kaputt — der teuerste denkbare erste Klick. Bei »Highlights«, dem allerersten Menüpunkt, sind es 7 Artikel. Ein Menüpunkt, der nichts zeigt, verbrennt den Besucher, statt ihn zu sortieren.
- Top-Level »Beauty & Parfüm« UND sein erster Unterpunkt »Beauty & Pflege« → /collections/premium-beauty (gid://shopify/Collection/687793865089): 388 zugeordnete Produkte, davon 387 DRAFT → live genau 1 Artikel sichtbar (»Jade Roller & Gua Sha Premium Set«, gid://shopify/Product/15397247385985)
- »Beauty & Parfüm > Haarfarbe & Coloration« → /collections/haarfarbe-coloration (gid://shopify/Collection/689775280513): 306 zugeordnet, 304 DRAFT → 2 live (»Mascara und Augenbrauen-Tönung« gid://shopify/Product/15490444558721, »Floating Jade – Schwarz-weisse Halo-Färbung« gid://shopify/Product/15479486611841)
- Top-Level »Highlights« UND sein Unterpunkt »Topseller« → /collections/bestseller (gid://shopify/Collection/687789113729, Titel »Hero-Favoriten«): 15 zugeordnet, 8 DRAFT → 7 live

### [google-heikel] Verdeckte Überwachungstechnik steht weiter im Google-Kanal — die Säuberung vom 12.08. griff nur dort, wo der Verkäufer sich im Text selbst verriet
**Betroffen:** 5

**Kostet:** Google führt Geräte zur heimlichen Überwachung unter «Dishonest behavior» — die Sanktion ist nicht die Ablehnung des Artikels, sondern die Sperrung des MERCHANT-KONTOS. Google ist der einzige Kanal mit belegten Verkäufen (52 Klicks, +206 %, 3'170 Impressionen, praktisch alles organisch); eine Sperre kostet den einzigen funktionierenden Absatzkanal. Die Kamera-Sonnenbrille ist zusätzlich ein Schweizer Strafrechtsrisiko (StGB Art. 179quater, Verletzung des Geheim- oder Privatbereichs durch Aufnahmegeräte). Die Lehre: `google_kanal_saeubern2.py` verlangt, dass der Lieferant sein Produkt selbst als «diskret/versteckt» beschreibt — wer das nicht tut, bleibt drin. Nach der FUNKTION suchen (Kamera in Brille/Uhr/Stift/Wecker/Ladegerät; Bauform 43×35×25 mm; SQ-/A9-Modellreihe), nicht nach dem Geständnis.
- 15479450993025 · «SQ13 Wireless Mini-Kamera Full HD» · CHF 15.90 · live im Google-Kanal. Die SQ-Serie ist die klassische Spy-Cam; der Beschreibungstext ist rein technisch («Bewegungserkennung», «90 Minuten Aufnahme») und nennt kein Tarnwort — genau deshalb hat ihn das Muster verfehlt, während die beiden SQ11-Zwillinge (15480280383873, 15480282579329) am selben Tag entfernt wurden.
- 15480273207681 · «A9 Mini-WLAN-Kamera» · CHF 15.90 · live im Google-Kanal. Text: «Mit ihrer geringen Grösse von nur 43x35x25mm lässt sie sich diskret überall platzieren.» Das Muster verlangt «diskret» + Aufnahme/Überwachung/Video — hier folgt «überall», also kein Treffer.
- 15463494320513 · «Kabellose HD-Kamera mit Fernbedienung» · CHF 15.90 · live im Google-Kanal. Identisches Gehäuse (43 × 35 × 25 mm), «lässt sie sich diskret platzieren», Fernauslöser — und einsortiert unter der Warengruppe «Aufbewahrung & Organizer» / google_product_category «Household Supplies > Storage & Organization». Rutscht durch jede Warengruppenprüfung.

### [bestellungen] 88 % des gesamten Bruttoumsatzes wurde zwangs-rückerstattet, weil die Ware beim Lieferanten nicht existierte — bei echten Fremdkunden sind es 93 %, drei von fünf haben nie etwas erhalten
**Betroffen:** 5

**Kostet:** 9 bezahlte Bestellungen über die gesamte Shop-Lebensdauer, Brutto CHF 1'084.02 — davon CHF 955.42 (88,1 %) vollständig rückerstattet. Rechnet man die vier Eigenkäufe des Betreibers (alleng0@hotmail.com) heraus, bleiben 5 echte Kundenbestellungen über CHF 933.42, von denen CHF 869.62 (93,2 %) erstattet wurden; echter, je ausgelieferter Umsatz an Fremdkunden = CHF 63.80 (#1005 CHF 41.90 + #1011 CHF 21.90). Kein einziger Refund ging auf eine Kundenreklamation zurück — alle fünf waren Lieferunfähigkeit. Zusätzlich verloren: die Shopify-Payments-Transaktionsgebühren werden bei Rückerstattung NICHT gutgeschrieben (die REFUND-Transaktionen haben durchweg fees: []) — CHF 28.88 real bezahlt auf Umsatz, der nie entstand (CHF 13.10 + 8.14 + 5.53 + 1.09 + 1.02). Am teuersten ist aber der Vertrauensschaden: drei von drei zahlenden Google-Kundinnen mit Warenkörben von CHF 177–427 bekamen nach Tagen nur ihr Geld zurück. Das sind exakt die Kundinnen, die die Mission «100 zahlende Kunden» tragen sollen.
- Bestellung #1006 (Order 13940184744257), 07.07.2026, CHF 426.51, Kundin lealeoburnand@gmail.com, Lausanne — Produkt «Kompakte Kühlung: Angenehme Frische für Sie!» (Produkt-ID 15440018014593, SKU BB-S0465893). Refund-Notiz: «Klimagerät beim Lieferanten kurz nach Bestelleingang ausverkauft (Hitzewelle), kein Liefertermin». Voll erstattet 9 Stunden nach Eingang, displayFulfillmentStatus bis heute UNFULFILLED.
- Bestellung #1007 (Order 13942800908673), 07.07.2026, CHF 265.90, Kundin rebecca.wyss@suchthilfe-ost.ch, Dulliken — Produkt «Flexible Raumkühlung: Angenehmes Klima mobil!» (Produkt-ID 15440017850753, SKU BB-S91120937). Refund-Notiz: «Klimagerät in die Schweiz nicht lieferbar (kein Transporteur)».
- Bestellung #1008 (Order 13947428209025), 08.07.2026, CHF 177.21, Kunde mel@mondi.agency, Zürich — «Schlauchboot «Intex Excursion 5» · 5 Personen, 366 cm» (Produkt-ID 15440677503361). Refund-Notiz: «Schlauchboot beim Lieferanten ausverkauft (Badesaison)». Erstattet 11 Minuten nach Bestelleingang.

### [mobil] Die Bewertungsfotos der vier «Bewertungssieger» sind direkt von AliExpress verlinkt — darunter der Screenshot einer AliExpress-Bestellung mit «Cupom AliExpress» und R$-Preisen sowie die Garantiekarte einer fremden Marke
**Betroffen:** 4

**Kostet:** Die Bildadresse steht im Quelltext und im Netzwerk-Tab jeder Produktseite: «aliexpress-media.com» nennt der Kundin den Lieferanten. Ein Foto zeigt sogar die Bestellabrechnung samt AliExpress-Gutschein und brasilianischen Preisen — daneben steht der CHF-Preis des Shops. Das entwertet die Marke genau dort, wo sie Vertrauen aufbauen soll, und legt die Marge offen. Zusätzlich hängt die Bildanzeige an einem fremden CDN: fällt das Hotlinking weg, stehen die Bewertungen der Vertrauensanker ohne Bilder da (ein Bild liefert bereits 0 Byte).
- «Klassische Herrenuhr Edelstahl», gid://shopify/Product/15396249960833: 49 Bewertungsfotos, alle von ae-pic-a1.aliexpress-media.com. OCR von .../kf/A6af78be77c884d1baa332b77a11e15364.jpg liest: «Entrar contato com vendedor … Subtotal Enviando Moedas Cupom AliExpress Total Reembolso» — ein portugiesischer AliExpress-Bestellabschluss mit R$-Beträgen (R$108,45 / Gutschein −R$18,00), sichtbar direkt unter dem Produkt. Zwei weitere Bilder (.../Afc0c8df5759b4e65b73354bdf443a55cT.jpg, .../A049e6ee1b1854447a48744e87e4c3a73S.jpg) lesen «AIMIMO DESIGN GUARANTEE CARD» — die Garantiekarte der Fremdmarke, während die Uhr als LuxeStyle-Ware verkauft wird.
- «Slim Wallet Echtleder», gid://shopify/Product/15396249502081: 42 Bewertungsfotos, alle ae-pic-a1.aliexpress-media.com.
- «Jade Roller & Gua Sha Premium Set», gid://shopify/Product/15397247385985: 12 Fotos; «Strand-Maxikleid «Bali»», gid://shopify/Product/15412915339649: 11 Fotos — ebenfalls alle von aliexpress-media.com. Summe 115 Bilder, 1 davon liefert schon jetzt 0 Byte (Hotlink auf fremdem CDN, jederzeit abschaltbar).

### [kollektionstexte] Drei Kollektionen zeigen live den unfertigen KI-AUFTRAG statt des Textes — bei einer davon in der Google-Meta-Description von 7'496 Produkten
**Betroffen:** 3

**Kostet:** Der Kunde liest im Google-Treffer bzw. auf der Kategorieseite eine englische Arbeitsanweisung — das ist der stärkste denkbare Vertrauensbruch für einen Schweizer Shop und kostet den Klick, bevor er passiert. premium-marken-lager ist mit 7'496 Produkten eine der grössten Kategorien; ihr Snippet ist derzeit unbrauchbar. Es ist exakt die im Projekt-Gedächtnis dokumentierte Kimi-Reasoning-Falle (k3 liefert bei strukturierten Prompts den Denk-Text statt der Copy) — sie ist also nie vollständig aufgeräumt worden.
- Kollektion «Premium & Marken» (premium-marken-lager, ID 689837736321, 7'496 Produkte): <meta name="description">, og:description UND twitter:description auf https://luxestyle.ch/collections/premium-marken-lager lauten wörtlich «1 meta description max 150 characters, with category + Switzerland/Blitzversand (flash shipping)» — genau der Text, den Google im Suchergebnis anzeigt und den Facebook/WhatsApp beim Teilen einblendet.
- Kollektion «Ballone» (ft-ballone, ID 690577244545, 35 Produkte): der SICHTBARE Fliesstext auf der Seite steht als <p>2 sales-strong sentences in High German (Hochdeutsch) for the category page, with Swiss reference, no invented facts</p>; die SEO-Beschreibung trägt zusätzlich «1 meta description max 150 characters, with category + Switzerland/Blitzversand».
- Kollektion «Kostüm-Hüte & Mützen» (ft-kostuem-hut, ID 690576982401, 167 Produkte): SEO-Beschreibung ebenfalls «1 meta description max 150 characters, with category + Switzerland/Blitzversand (flash shipping)». Der Body-Text ist hier korrekt — nur das SEO-Feld blieb der Prompt.

### [google-heikel] Selbstverteidigungswaffen und Klingen im Google-Feed — als «Küche & Bar», «Aufbewahrung & Organizer» und «Werkzeug» deklariert
**Betroffen:** 3

**Kostet:** Google verbietet im Shopping-Feed Waffen und Zubehör, das primär dem Verletzen von Menschen dient; ein Produkt, das sich selbst «Selbstverteidigungswaffe/-werkzeug» nennt, ist der eindeutigste Fall. Verschärfend: alle elf melden eine Warengruppe, die nichts mit dem Produkt zu tun hat — eine Falschdeklaration im Feed ist bei Google ein eigener Verstoss (Misrepresentation) und wiegt schwerer als der Artikel selbst. Beim Feder-Abwehrstock geht es über Google hinaus: Verkauf einer nach WG Art. 4 verbotenen Waffe in die Schweiz — dasselbe Muster wie beim Butterfly-Messer, das am 12.08. deshalb auf DRAFT gesetzt wurde. Dieses hier steht weiter aktiv im Shop UND im Feed.
- 15495190020481 · «Automatischer Feder-Abwehrstock» · CHF 21.90 · live im Google-Kanal · Warengruppe «Werkzeug & Heimwerken», google_product_category «Hardware > Tools». Eigener Text: «für den persönlichen Schutz konzipiert … 19 cm im eingefahrenen Zustand und 39 cm ausgefahren … Legierung 4142 … unauffälliges Erscheinungsbild». Das ist ein federgetriebener Teleskopschlagstock — nach Schweizer Waffengesetz Art. 4 Abs. 1 Bst. d ein Gerät, das dazu bestimmt ist, Menschen zu verletzen (verbotener Gegenstand). Der 12.08.-Lauf kannte «Teleskopschlagstock», der Verkäufer schreibt «Abwehrstock».
- 15454473388417 · «Selbstverteidigungswerkzeug» · CHF 24.90 · live im Google-Kanal · deklariert als «Home & Garden > Household Supplies > Storage & Organization». Text: «Effektive Selbstverteidigung durch schnelles Öffnen». Das Waffen-Muster verlangt ein Klingen-Nomen oder die Endung «…waffe» — «…werkzeug» steht in keiner Liste.
- 15463465943425 · «PC Defense Stick Gehstock-Paar» · CHF 22.90 · live im Google-Kanal · ebenfalls «Storage & Organization». Text: «ein diskretes Mittel zur Selbstverteidigung».

### [seo-technik] Drei veröffentlichte Kollektionen tragen live einen LLM-Arbeitsauftrag als Meta-Description — die grösste davon steht vor 7'496 Produkten
**Betroffen:** 3

**Kostet:** Was Google als Snippet zeigt und was beim Teilen auf WhatsApp/Facebook/Instagram als Vorschautext erscheint, ist ein englischsprachiger Arbeitsauftrag an ein Sprachmodell. Das ist auf der grössten Kategorieseite des Shops (7'496 Produkte, mehr als jede andere) sichtbar und zerstört die Glaubwürdigkeit genau dort, wo der Kunde zum ersten Mal auf den Shop trifft — im Suchergebnis, vor dem Klick. Es ist zudem das exakte Muster aus CLAUDE.md «Kimi k3 liefert reasoning_content statt Copy»: der Denk-/Auftragstext wurde ungeprüft ins Feld geschrieben. Betroffen sind 7'698 Produkte hinter diesen drei Seiten.
- /collections/premium-marken-lager (7'496 Produkte, gid://shopify/Collection/691558744449-Bereich) → <meta name="description" content="1 meta description max 150 characters, with category + Switzerland/Blitzversand (flash shipping)"> — identisch auch in og:description
- /collections/ft-kostuem-hut «Hüte & Kopfbedeckung» (167 Produkte) → exakt derselbe Prompt-Text als Meta-Description und og:description
- /collections/ft-ballone «Ballone & Deko» (35 Produkte) → «1 meta description max 150 characters, with category + Switzerland/Blitzversand»

### [alt-texte] Lieferanten-SKU steht sichtbar im Alt-Text von 24 Bildern (4 Produkte) — «Ref. CJ-CJYD294848201AZ»
**Betroffen:** 2

**Kostet:** Der Alt-Text ist kundensichtbarer Text: Screenreader lesen ihn vor, Google indexiert ihn für die Bildersuche, und bei einem Ladefehler steht er anstelle des Bildes auf der Seite. Hier trägt er die CJ-Lieferanten-SKU. Damit ist die Hausregel «Keine Lieferanten-Leaks im Kundentitel» (CLAUDE.md Regel 3) an einer Stelle unterlaufen, die bisher niemand geprüft hat — die Importer strippen den Code aus dem Titel, schreiben ihn aber in den Alt-Text zurück. Genau das Muster, das im Gedächtnis schon zweimal Geld gekostet hat: eine Angabe wird aus einem Feld entfernt, ein anderes Feld trägt sie unverändert weiter. Wer «CJYD294848201AZ» googelt, landet direkt beim Grosshändler und sieht den Einkaufspreis — das untergräbt die Premium-Positionierung und lädt zum Direktkauf ein. Der Umfang ist klein (4 Produkte, 24 Bilder), die Behebung aber trivial, und die Regel für künftige Importe gehört mitgezogen.
- 15448531927425 «Ärmelloser Jumpsuit mit weitem Bein · Modell 2» — 8 Bilder, Alt-Text «Ärmelloser Jumpsuit mit weitem Bein – Ref. CJ-CJYD294848201AZ» (bzw. «… – Ansicht 2…8»)
- 15448713494913 «Gestreiftes Kurzarmhemd für Herren» — 6 Bilder, Alt-Text «Gestreiftes Kurzarmhemd für Herren – Ref. CJ-CJDS295213101AZ»
- 15448838472065 «Titan-Schneidebrett · 41×27 cm» — 5 Bilder, Alt-Text «Titan-Schneidebrett AS-CJ41X27T»

### [rabatte] Der Automatik-Rabatt drückt den Warenkorb unter die Gratis-Versand-Schwelle: bei CHF 50.00–55.55 Warenwert verspricht die Leiste Gratis-Versand, die Kasse verlangt CHF 7.00.
**Betroffen:** 1

**Kostet:** Der Widerspruch trifft genau den Korbbereich, den der Shop mit dem Gratis-Versand-Versprechen erst erzeugen will: Kundinnen füllen gezielt bis über CHF 50 auf und sehen an der Kasse trotzdem CHF 7.00 Versand, während über ihnen die Leiste Gratis-Versand verspricht. Bei einem Shop, der aktuell fast niemanden bis zur Kasse bringt (letzter abgebrochener Warenkorb 4. Juli, bisherige Bestellungen CHF 14.90–34.90 plus jeweils CHF 7.00 Versand), ist das der teuerste denkbare Ort für einen gebrochenen Versprechen — und er wirkt zusätzlich als Rabatt-Falle, weil ausgerechnet der Mengenrabatt den Versandvorteil auffrisst.
- LIVE-BEWEIS: 2x «Tasche klein aus Kunstfell» (gid://shopify/Product/15469916029313, Variante 55970617557377, CHF 27.50). Warenwert CHF 55.00 → Automatik-Rabatt 'Bundle: 2+ Artikel -10%' CHF 5.50 → Summe CHF 49.50. Abfrage /cart/shipping_rates.json für CH/8001 Zürich liefert als EINZIGE Versandart «Standard: CHF 7.00». Kein Gratis-Versand, obwohl die Ware CHF 55 kostet und die Leiste ab CHF 50 Gratis-Versand verspricht.
- KONFIGURATION (Admin-API, live): Versandprofil «General profile», Zone Domestic/CH hat drei aktive Tarife — «Standard» CHF 7.00 ohne Bedingung, «Kostenloser Versand» CHF 0.00 ab TOTAL_PRICE >= CHF 50.00, «Standard» CHF 0.00 ab TOTAL_PRICE >= CHF 65.00. Shopify wertet TOTAL_PRICE nach Abzug der Rabatte; bei CHF 49.50 greift keine der beiden Gratis-Stufen — genau das zeigt der Live-Test.
- RECHNUNG DER TOTZONE: Gratis-Versand braucht 0.9 x Warenwert >= 50, also Warenwert >= CHF 55.56. Jeder Korb mit >=2 Artikeln und Warenwert CHF 50.00 bis 55.55 verliert den Gratis-Versand. Bei CHF 55.00 zahlt der Kunde 49.50 + 7.00 = CHF 56.50, bei CHF 55.56 zahlt er CHF 50.00 — wer für 56 Rappen mehr einkauft, zahlt CHF 6.50 weniger.

## Widerlegt (bewusst NICHT angefasst)

- **[seiten]** Eine öffentlich erreichbare, in der Sitemap gelistete Shop-Seite veröffentlicht gültige Zugangsdaten im Klartext — Shopify-Admin-API-Token, Klaviyo-Key, Discord- und Make-Webhooks
  → WIDERLEGT — die Struktur des Fundes stimmt, die entscheidende Behauptung («gültige Zugangsdaten») nicht.

BESTÄTIGT (unstrittig): Alle 7 Seiten sind live (HTTP 200, isPublished=true, erstellt 21.–23.05.2026) und stehen tatsächlich in der Sitemap (curl "https://luxestyle.ch/sitemap_pages_1.xml?from=6

- **[seiten]** Veröffentlichte Versandseiten nennen Beträge, die der Shop im Checkout nicht einhält — die AGB die falsche Gratis-Schwelle, die EN-FAQ eine zu tiefe Pauschale, drei Seiten versprechen Liechtenstein Schweizer Konditionen, die es dort gar nicht gibt
  → Der Fund ist in seiner Zahl (6) und in zwei von drei Teilbehauptungen WIDERLEGT. Live nachgeprüft am 14.08. gegen Admin-GraphQL (deliveryProfiles) UND gegen echte Checkout-Raten (/cart/shipping_rates.json auf einem realen Warenkorb).

(1) AGB «Gratis-Versand ab CHF 65» — WIDERLEGT, kein Mangel. Der 

- **[titel-deutsch]** 137 aktive Produkte tragen unübersetzte englische Fachwörter im Titel (Hooded, Sleeveless, Hollow-Out, Commuter, Slimming, Sheath …) – die Kundin findet sie über den deutschen Suchbegriff nicht mehr
  → WIDERLEGT — die Titel existieren, aber der behauptete Schaden («Kundin findet sie nicht») ist live falsifiziert, und die Zahl 137 hält der Nachzählung nicht stand.

1) SCHADENS-MECHANISMUS LIVE WIDERLEGT. Die Belege des Prüfers stützen sich auf Suchanfragen, die er selbst formuliert hat («ärmellose 

- **[titel-codes]** 157 aktive Produkte tragen einen no-name Lieferanten-Modellcode im Titel — meist an erster Stelle, wo die Kundin und Google das wichtigste Wort erwarten; der Reiniger vom 11.08. sah nur das Titel-ENDE und hat diese Klasse nie berührt.
  → WIDERLEGT — nicht wegen Veraltung (die Titel stehen alle noch so da), sondern weil die Deutung falsch ist und die Zahl aus Fehltreffern besteht.

LIVE-LAGE (Admin-GraphQL, alle 187 Kandidaten meines eigenen Scans einzeln abgefragt): 187/187 ACTIVE, nur 2 Titel seit dem Export minimal geändert (T037 

- **[variantenwerte]** Bei 2'369 aktiven Produkten heisst das Auswahlfeld «Farbe», enthält aber keine einzige lesbare Farbe – darunter 271 Produkte, bei denen die Kundin zwischen reinen Lieferanten-Artikelnummern wählen muss
  → Der Fund ist in der behaupteten Form widerlegt: die Zahl 2'369 ist rund neunfach überhöht, und vier der sechs Belege sind Fehltreffer.

1) METHODENFEHLER: Das Prüfmuster testet ausschliesslich DEUTSCHE Farbwörter. Alles, was auf Englisch dasteht, fällt durch. Von den 2'369 enthalten 1'126 (48 %) pla

- **[gender-metafeld]** 99 aktive Kinder- und Babyartikel melden age_group=adult an Google — alle 99 im Google-Kanal
  → Rohzahl live bestätigt, Deutung widerlegt: Alle 99 sind per Admin-GraphQL weiterhin ACTIVE mit age_group=adult. Aber die Behauptung "99 Kinder- und Babyartikel" hält der Prüfung nicht stand — die Zahl ist um Faktor ~7,6 überhöht.

(1) 76 der 99 sind gar keine Bekleidung. google_product_category: Hom

- **[farbe-metafeld]** Bei 498 aktiven Produkten steht im color-Metafeld gar keine Farbe, sondern Grösse, Steckertyp oder Region — alle 498 stehen im Google-Kanal
  → WIDERLEGT — die Kernaussage «steht gar keine Farbe» ist bei 80 % der gemeldeten Fälle live falsch, und die Zahl ist um Faktor 9 überhöht.

(1) Die beiden Kronzeugen belegen das Gegenteil. Live per Admin-GraphQL geprüft: 15447923196289 «Reithandschuhe aus Leder für Damen» → color = «S-Black» — Black 

- **[farbe-metafeld]** 1'487 aktive Produkte melden Google eine Farbe, die die Kundin im Shop gar nicht auswählen kann — bei 722 blieb das Feld englisch, nachdem die Varianten ins Deutsche übersetzt wurden
  → WIDERLEGT — die Zahl ist um Faktor ~100 zu hoch, und die Kernaussage («eine Farbe, die die Kundin gar nicht auswählen kann») trifft auf die eigenen Belege des Prüfers überwiegend nicht zu.

WAS STIMMT: Die 1'487 reproduzieren sich exakt (31'398 aktive, 10'226 mit color-Metafeld, 9'420 mit «Farbe»-Op

- **[preis-ausreisser]** 13 Alltags-Kleinartikel stehen zu Preisen im Shop, die der eigene Katalog beim gleichen Artikeltyp um das 3- bis 7-Fache unterbietet — ein Paar Baumwollsocken für CHF 102.90, ein Plüsch-Schlüsselanhänger für CHF 103.90, eine Stoffhülle fürs Tablet für CHF 103.90.
  → WIDERLEGT — die Preise stimmen, die Deutung nicht. Der Peer-Vergleich vergleicht nicht denselben Artikeltyp, sondern Artikel mit 5- bis 15-fach unterschiedlichem Einkaufspreis beim GLEICHEN Lieferanten.

Was ich bestätigen kann: alle 13 Preise sind live echt (curl /products/<handle>.js: Socken 102.9

- **[bestand]** 183 BigBuy-Produkte verkaufen mit einem Bestand vom 10.07. — drei davon sind beim Lieferanten nachweislich schon ausverkauft
  → WIDERLEGT — die Zahl 168 misst keinen Mangel, sondern einen Zeitstempel, und die Belege des Prüfers widerlegen seine eigene Kernzahl.

1) DER FEHLSCHLUSS: `inventoryLevel.updatedAt` bewegt sich in Shopify NUR, wenn sich die MENGE ÄNDERT. Ein Produkt, das seit dem Import am 10.07. immer noch genau se

- **[bestand]** 11 aktive Produkte mit ECHTEM, synchronisiertem Bestand stehen auf CONTINUE — die Prüfung vom 11.08. konnte sie nicht sehen, weil sie nur nach «Bestand 0 UND CONTINUE» suchte
  → WIDERLEGT — die Zahl 11 stimmt zwar, aber die tragende Behauptung «ECHTER, synchronisierter Bestand» ist live nachweislich falsch, und der unterstellte Schaden existiert nicht.

1) KEIN synchronisierter Bestand — der Kern der Behauptung fällt. Ich habe für alle Belegprodukte `inventoryItem{updatedAt

- **[medizin]** Vier neu importierte Kosmetik-/Wellness-Artikel versprechen im Verkaufstext die Linderung von Krankheiten und Symptomen (Angstzustände, Panik, Schlaflosigkeit, Kopfschmerzen, Akne/Narben, Rückenschmerzen) — die Wortliste in heilversprechen.py kennt keinen dieser Begriffe
  → Live geprüft am 13./14.08. per Admin GraphQL + Storefront: alle vier Produkte sind ACTIVE und in allen 6 Kanälen (inkl. Google & YouTube), die zitierten Sätze stehen unverändert im Text. Der Fund scheitert also nicht an einem veralteten Export — er scheitert an seiner eigenen Trennlinie. Von 4 Beleg

- **[jugendschutz]** 41 Outdoor-/Survival-/Taktik-Messer, eine Machete und eine Axt ohne jeden Altershinweis — als «Küchenhelfer» und «Geschenkidee» einsortiert und in alle vier Werbekataloge publiziert, obwohl der Shop bei 46 Raucherzubehör-Artikeln konsequent «ab 18» schreibt
  → WIDERLEGT — die Zahlen stimmen, der Mangel nicht.

LIVE BESTAETIGT (Admin-GraphQL, 41/41 abgefragt): alle 41 ACTIVE mit Online-Store-URL, 41 in TikTok/Facebook & Instagram/Pinterest, 15 zusaetzlich in 'Google & YouTube'; 0/41 mit Altershinweis in descriptionHtml; Vergleichsgruppe Tag raucher/18plus 

- **[menue]** Sieben Ziele der Hauptnavigation sind doppelt bis dreifach verlinkt; im Highlights-Dropdown stehen zwei unterschiedlich benannte Einträge nebeneinander, die auf dieselbe Seite führen.
  → Live gegen die Admin-API (Menü gid://shopify/Menu/310224093569) und das gerenderte Storefront-HTML geprüft. Die Behauptung «7 doppelt bis dreifach verlinkte Ziele» ist in dieser Form falsch — aus drei Gründen.

1) DIE ZAHL STIMMT NICHT. Alle 95 Einträge rekursiv geflacht und nach Ziel-URL gruppiert 

- **[suche]** Bei zusammengesetzten Suchbegriffen zerfällt die Suche und zeigt dutzende Treffer der FALSCHEN Worthälfte statt «keine Ergebnisse»
  → WIDERLEGT — die Trefferzahlen stimmen zwar grob, aber die Diagnose und drei der vier Belege halten der Live-Prüfung nicht stand.

1) «akkuschrauber»: Der Kernbeleg ist FALSCH. Behauptet wird «kein einziger Akkuschrauber (der Katalog hat keinen)». Der Katalog hat zwei: «Multifunktionaler Akku-Schraub

- **[strukturdaten]** 199 Produkte mit 1'058 echten Judge.me-Bewertungen zeigen der Kundin Sterne, liefern Google aber KEINE Bewertung im JSON-LD – Judge.me-Rich-Snippets sind in den App-Einstellungen ausgeschaltet.
  → WIDERLEGT durch Live-Rendering. Der Prüfer hat nur den rohen HTML-Quelltext (curl) untersucht — dort stimmt alles: 3 ld+json-Blöcke (Organization, ProductGroup, BreadcrumbList), 0× aggregateRating, und jdgmSettings enthält tatsächlich remove_microdata_snippet=true + enable_json_ld_products=false. Au

- **[rabatte]** Der beworbene Willkommensrabatt WELCOME10 wird ab dem 2. Artikel im Warenkorb von Shopify abgelehnt (applicable:false) — der Kunde tippt den Code ein und der Preis bleibt exakt gleich.
  → WIDERLEGT. Die Technik stimmt, die Schlussfolgerung ist falsch: Der Kunde verliert keinen Rappen.

1) MECHANIK BESTÄTIGT (Admin-API 2025-01, live): WELCOME10 = gid://shopify/DiscountCodeNode/2338583150977, ACTIVE, discountClass=ORDER, 10%, combinesWith.orderDiscounts=false. «Bundle: 2+ Artikel -10%»

- **[rabatte]** Die beworbene Regel «–10% ab 3 Artikeln» greift kein einziges Mal — ein vergessener Zwilling vom 01.06. schenkt stattdessen schon ab 2 Artikeln 10% her, unbeworben.
  → WIDERLEGT. Die Konfiguration stimmt zwar (live per Admin-API bestätigt: «Bundle: 2+ Artikel -10%» gid .../2343829766529, ACTIVE seit 01.06.2026, ORDER, Mindestmenge 2, 10%, allItems; «Mengenrabatt — 10% ab 3 Artikeln» gid .../2363896299905, ACTIVE seit 06.08.2026, ORDER, Mindestmenge 3, 10%, allItem

- **[alt-texte]** 73,5 % aller aktiven Produkte (24'841) haben auf KEINEM einzigen Bild einen Alt-Text — das Theme setzt ersatzlos alt="", ohne Rückfall auf den Produkttitel
  → WIDERLEGT. Die Rohdaten stimmen, die Wirkung nicht: Das Admin-Feld `alt` ist tatsaechlich leer (live per Admin-API bestaetigt: Produkt 15449825771905 «Schnellladegeraet» liefert fuer alle 12 MediaImage-Knoten alt=""), ABER die ausgelieferte Storefront rendert ueberall den Produkttitel. Shopifys `ima

- **[alt-texte]** Englische Alt-Texte auf deutschsprachigen Produktseiten (8 Produkte)
  → WIDERLEGT — live gegen den Shop nachgeprüft (Admin GraphQL, 2026-08-14, alle 34'407 aktiven Produkte, 56'688 nicht-leere Alt-Texte).

1) DIE ZAHL STIMMT NICHT — in BEIDE Richtungen. Ich habe die Regel des Prüfers (≥2 englische Tokens, ≥60 % Anteil, kein deutscher Marker) live auf den GANZEN Katalog 

- **[bestellungen]** Der Ghost-Sale-Schutz für BigBuy ist seit 27 Tagen nicht mehr gelaufen: 168 aktive BigBuy-Produkte verkaufen einen Lagerstand vom 10./18.07., viele davon 1–2 Stück
  → WIDERLEGT IN ZAHL UND METHODE — ein deutlich kleinerer Kern bleibt echt.

Ich habe nicht nur Shopify, sondern den LIEFERANTEN live gefragt. Der BigBuy-Key liegt in /tmp/bigbuy_key.txt (purse.json antwortet "1000.00"); über api.bigbuy.eu/rest/catalog/productsstockbyhandlingdays.json habe ich heute 16

- **[bestellungen]** Die verbindliche Versandbedingung nennt Versender und Warenherkunft, die es im Shop nicht gibt — kein einziger der vier je erfolgten Versände lief über Schweizerische Post oder DHL, und die Ware kommt nicht aus der EU
  → WIDERLEGT. Die Policy-Zitate stimmen wörtlich (live geprüft), aber die daraus gezogene Kernaussage hält keiner Nachprüfung stand — und die Zahl gehört gar nicht zu ihr.

1) «Die Ware kommt nicht aus der EU» ist NACHWEISLICH FALSCH — und zwar aus den vier Bestellungen, die der Prüfer selbst als Beleg
