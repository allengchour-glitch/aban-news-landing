# Taxonomie «Rest des Shops» nach dem Vorbild des CJ-Kategoriebaums: Auftrag, Regelsprache, Messwerkzeug

Stand 26.10.2026. Auftrag des Besitzers an diesem Abend, mit Screenshots der CJ-App («All Categories»): «erstelle auch solche
Unterkategorien und sortiere besser, grinden wir erst später wenn alles gefixt ist» und «da mehr, da und anderen auch du weisst was
ich meine». Gemeint: nicht nur die Mode (314 Kategorien live), sondern ALLE Bereiche bekommen einen Baum Bereich → Gruppe →
Unterkategorie, wie ihn CJ zeigt. **Jetzt wird nur geplant, gebaut und gemessen. Nichts geht live**, bis der Auswahl-Lauf (Farben/Grössen
bei allen Produkten) durch ist. Schreiben in den Shop (Tags, Collections, Menü) ist verboten.

## Vorbild: so zeigt CJ seine Bäume (Screenshots des Besitzers, nur die sichtbaren Teile)

- **Consumer Electronics**: Home Audio & Video (Projectors, Television, TV Receivers, Audio Amplifiers, Projectors & Accessories, TV Sticks) ·
  Accessories & Parts (Digital Cables, Home Electronic Accessories, Audio & Video Cables, Charger, Batteries, Digital Gear Bags) ·
  Smart Electronics (Wearable Devices, Smart Home Appliances, Smart Wearable Accessories, Smart Wristbands, Smart Watches, Smart Remote Controls) ·
  Camera & Photo (Photo Studio, Camera Drones, Camera & Photo Accessories, Digital Cameras, Action Cameras, Camcorders) ·
  Video Games (Gamepads, Handheld Game Players, Video Game Consoles …).
- **Phones & Accessories**: Mobile Phone Accessories (Cables, Power Bank, Screen Protectors, Lenses, Holders & Stands, Chargers) ·
  Mobile Phone Parts (SIM Card & Tools, Mobile Batteries, Housings, LCDs, Flex Cables, Touch Panel) · Mobile Phones (nach Prozessor/SIM/RAM).
- **Computer & Office**: Security & Protection (Alarm & Sensor, Fire Protection, Workplace Safety Supplies, Door Intercom, Surveillance Products) ·
  Storage Devices (SSD, USB Flash Drives, HDD Enclosures, Memory Cards, External Hard Drives) ·
  Tablet & Laptop Accessories (Tablet LCD Screens, Laptop Batteries, Laptop Bags & Cases, Tablet Cases, Tablet Accessories) · (weitere oberhalb).
- **Toys, Kids & Babies**: Shoes & Bags · Boys Clothing · Baby Clothing (Kinder-Mode ist in der Mode-Taxonomie schon erledigt) · Spielzeug (nicht sichtbar).
- Weitere oberste Ebenen von CJ: Men's Clothing, Bags & Shoes, Sports & Outdoors, Home Improvement, Automobiles & Motorcycles
  (dazu vermutlich Home/Garden/Furniture, Beauty/Health, Jewelry/Watches, Pet Supplies).

- **Der VOLLE CJ-Baum liegt vor** (`dropship/taxonomie-2610-b/cj_baum.json`, gelesen am 26.10.2026 über CJs offizielle Schnittstelle `product/getCategory`: 14 oberste Ebenen,
  89 Gruppen, 578 Blätter; die Seite `cjdropshipping.com/list/…` ist für Firecrawl gesperrt, der Umweg über einen Stealth-Proxy wurde nicht gegangen). Er ist die Checkliste,
  gegen die jede Bereichsdatei nachträglich abgeglichen wird: für jedes CJ-Blatt «hat der Shop genug echte Produkte, und gibt es dafür eine Kategorie?».
  Gegenprobe: die Screenshots des Besitzers (Home Improvement, Computer & Office, Sports & Outdoors, Consumer Electronics, Phones & Accessories, Toys/Kids/Babies) stimmen in Gruppen- und Blattnamen mit diesem Baum überein
  (für Home Improvement und Computer & Office am 26.10. 22:30 UTC Name für Name verglichen: 0 Abweichungen). Nach CJ liegen Beleuchtung und Haushaltsgeräte unter «Home Improvement», nicht unter Wohnen: die Abgrenzung der Bereiche folgt hier unserem Menü, der CJ-Abgleich geht je Blatt nach Daten.

**Das Vorbild ist eine Gliederung, kein Befund.** CJ ordnet die Produkte selbst unsauber ein: das Titelbild von «Screen Protectors» ist eine
Winkelschleifer, das von «Chargers» ein Motorteil, das von «Quad Core» ein Gehstock. Darum folgt unsere Zuordnung NIE dem CJ-Namen, sondern
der Google-Kategorie und dem Titel des Produkts im Shop, mit Gegenprobe an den echten Titeln. Spezifikations-Kategorien («Octa Core»,
«5-inch Display») gibt es bei uns nicht. Kategorien, die der Katalog nicht hergibt (< 15 echte Produkte), werden nicht angelegt.

## Was schon da ist (vorher lesen, nichts doppelt bauen)

- `/tmp/taxo_b/bestand_sort.txt`: die 116 vorhandenen sort-Kategorien der Engine (handle | titel | tag | Menüpfad | aktive Mitglieder | im Menü).
- `node dropship/taxonomie-2610-b/bestand_suche.mjs '<regex>'`: alle 949 Collections des Shops (handle | titel | Produkte | Regeln | Menü). Viele alte
  Collections sind Titel-Regeln («TITLE CONTAINS Powerbank») mit Fremdkörpern und teils nicht im Menü.
- `/tmp/taxo_b/menue.txt`: das Hauptmenü, eingerückt, mit Handle. Mode (Damen/Herren/Kinder/Schuhe/Taschen/Accessoires) ist fertig und tabu.
- Katalog (aktive Produkte, frisch 26.10. 20:14): `/tmp/katalog_taxo.json` → `{produkte:[{id,handle,title,productType,tags,g}]}`; `g` = Google-Kategorie
  (Metafeld `mm-google-shopping.google_product_category`, bei 97 % gesetzt). 76,6 % der Produkte haben schon ein `sort-…`-Tag.
- Die Engine: `automation/lib/kategorien.mjs` (`BASIS_KATEGORIEN` mit den Regeln als Code, Hilfen `gp`, `wort`, `anfang`, `ende_`). Gute vorhandene
  Kategorien NICHT neu bauen, sondern im Baum mit ihrem Handle als Kind einordnen. Neu bauen: Lücken, und Verfeinerungen zu grober
  Sammelbecken (Beispiel: «Elektronik-Zubehör & Kleinteile» enthält rund 170 Powerbanks → eigene Kategorie «Powerbanks»).
- **Sperr-Tags** (`adult-nicht-bewerben`, `18plus`, `fortura` = Kostüme, Waffen, Stecker …) schliesst das Werkzeug automatisch aus.
  Die 1 222 Kostüm-Produkte ohne Google-Kategorie sind Fortura-Ware mit eigenen Collections (Kostüme & Party), nicht Teil dieser Aufgabe.

## Regelsprache (`kern.mjs`, rein, ohne Netz; gleiche Sprache wie die Mode-Taxonomie)

Eine Kategorie ist ein JSON-Objekt:

```json
{ "handle": "powerbanks", "titel": "Powerbanks & mobile Akkus",
  "g_prefix": ["Electronics > Electronics Accessories > Power"],   // Google-Kategorie beginnt mit EINEM davon
  "g_nicht": [],                                                  // … und mit KEINEM davon
  "titel_muss": ["power ?bank|powerbank|zusatzakku"],             // Titel trifft MINDESTENS EINE Regex (i); mit g_prefix kommt es dazu (UND); ohne g_prefix ist es der einzige Einschluss
  "titel_nicht": ["(^|[^a-zäöüß])(ladekabel|adapter)(?![a-zäöüß])"],// Titel trifft KEINE
  "tags_nicht": [],
  "beschreibung": "Ein bis zwei sachliche Sätze (ab 40 Zeichen): was liegt hier, wofür. Kein «Sie», keine Heilsversprechen, keine erfundenen Zahlen.",
  "unterfilter": [ { "handle": "powerbanks-solar", "titel": "Solar-Powerbanks", "titel_muss": ["solar"], "titel_nicht": [] } ] }
```

- **Wortgrenzen**: JavaScript-`\b` kennt keine Umlaute. Anfang `(^|[^a-zäöüß])wort`, Ende `wort(?![a-zäöüß])`. Ein blankes Teilwort ist die Fehlerquelle Nr. 1
  («SSD» in «Stossdämpfend», «Weste» in «Western», «Tasse» in «Tassel», «kleid» in «Bekleidung», «rock» in «Schnelltrocknung», «tasche» in «Kameratasche»
  für Handy). Titel sind deutsch, aber oft aus dem Englischen übersetzt: beide Schreibweisen prüfen («Power Bank»/«Powerbank»).
- **Google-Kategorie zuerst, Titel zum Schärfen.** Ist die Google-Kategorie nur ein Oberbegriff (`Hardware > Tools`, `Electronics > Electronics Accessories`),
  entscheidet der Titel; nie nur am Oberbegriff messen. Bei falscher Google-Kategorie (Kleidung unter «Handbags») hilft `g_nicht`.
- **Unterfilter** sind Titel-Regeln, die nur auf Produkte der Eltern-Kategorie wirken (Chips auf der Kategorieseite). Aktiv nur mit ≥ 15 Treffern.
- **Kategorie** ≥ 15 aktive Produkte (`min`), sonst nicht anlegen (Produkte in die nächstgrössere Kategorie oder in `ausserhalb` mit Grund).
- **Handle**: nur a-z, 0-9, Bindestrich; muss im Shop FREI sein (`bestand_suche.mjs`; das Werkzeug meldet «KOLLISION»). Titel: deutsch, kurz, wie die
  vorhandenen («Handyhüllen & Cases», «Kabel & Adapter»); keine englischen CJ-Namen, kein «Premium», kein «Beste».

## Aufbau der Bereichsdatei `dropship/taxonomie-2610-b/bereiche/<bereich>.json`

```json
{ "bereich": "handy", "titel": "Handy & Zubehör",
  "menue": { "oben": "Elektronik" },                      // Zweig des Hauptmenüs, unter dem die Gruppen hängen (so wie im Menü geschrieben)
  "universum": { "g_prefix": ["…"], "titel_muss": ["…"], "g_nicht": [], "titel_nicht": [] },  // ODER-Regel: alles, was zum Bereich gehört (Lückenmessung)
  "kategorien": [ { … wie oben … } ],                      // NEUE Kategorien (bekommen Tag sort-<handle> und eine Collection)
  "gruppen": [ { "titel": "Zubehör", "handle": "handy-zubehoer-gruppe", "kinder": ["powerbanks", "handy-huellen", "kabel-adapter"] } ],
  "ausserhalb": [ { "text": "Warum diese Produkte/Google-Kategorien bewusst in keiner Kategorie stehen", "beispiele": ["Titel …"] } ],
  "hinweise": [ "Alt-Sammelbecken, die durch die neuen Kategorien schrumpfen sollten; Auffälliges; offene Entscheidungen" ] }
```

- `gruppen[].handle` = Handle der Gruppen-Collection (Sammlung aller Kinder; später als «eines dieser Tags» angelegt), frei im Shop, a-z/0-9/-.
- `kinder` = Handles NEUER Kategorien dieser Datei ODER vorhandener Collections/Kategorien des Shops (die dann nur im Baum eingeordnet werden). Eine Kategorie darf in
  zwei Gruppen stehen (Verweis). Gruppen mit weniger als 2 Kindern gibt es nicht.
- Jede neue Kategorie steht in mindestens einer Gruppe. Die Gruppen sollen für den Kunden lesbar sein (CJ-ähnlich, 3 bis 8 Kinder je Gruppe, 3 bis 6 Gruppen je Bereich).

## Messwerkzeug (NUR LESEN)

```bash
N=/opt/node22/bin/node
$N dropship/taxonomie-2610-b/messen.mjs dropship/taxonomie-2610-b/bereiche/<bereich>.json --zeige h1,h2 --n 40 --luecke 40 [--alle]
```

Ausgabe: Prüfungen der Datei (FEHLER = Exit 2), Tabelle je Kategorie (TREFFER, «ZU» unter 15, SCHON-DA = Mitglieder, die schon eine sort-Kategorie haben,
ÜBERLAPP = in zwei Kategorien dieser Datei, häufigste bestehende Kategorie), Überlappungen mit Beispielen, Universum und Lücke nach Google-Kategorie.
Mitgliederlisten: `/tmp/taxo_b/<bereich>/<handle>.txt` (handle | titel | google, ALLE Mitglieder), Lücke: `/tmp/taxo_b/<bereich>/_luecke.txt`.
`--zeige` = Google-Verteilung + feste Stichprobe der Mitglieder. `--alle` prüft Handle-Kollisionen auch gegen die anderen Bereichsdateien.

## Qualitätsregeln (wie bei der Mode-Taxonomie; jede stammt aus einem gemessenen Fehler)

1. **Beide Seiten lesen.** Mitgliederliste lesen (bis 150 Mitglieder ganz, darüber mindestens 80 verteilt, DANN gezielt nach Fremdkörpern greppen: `grep -iE 'muster' /tmp/taxo_b/<bereich>/<handle>.txt`)
   UND die Lücke lesen (`_luecke.txt`): gehört dort etwas hinein? Eine Stichprobe von 25 beweist keine Fehlerquote; ein Verdachtswort-Grep schon eher.
2. **Überlappung**: innerhalb einer Gruppe kein Produkt in zwei Kategorien (ausser bewusster Verweis; dann begründen). Entscheide über Vorrang per `titel_nicht` der allgemeineren Kategorie.
3. **Zubehör ≠ Gerät.** «Hülle für Kamera» ist keine Kamera, «Halter für Tablet» ist kein Tablet, «Ersatzfilter» ist kein Staubsauger, «Kabelbinder» ist kein Kabel. Die Art des Produkts entscheidet, nicht ein Stichwort irgendwo im Titel.
4. **Fremdware raus**: Tier-, Spielzeug-, Kostüm-, Werkzeug- oder Schmuck-Produkte mit Elektronik-Wort («Hunde-Tracker», «Spielzeug-Handy», «Handy-Kette») gehören in ihren Bereich. Zähle Fremdkörper in deiner Stichprobe EHRLICH mit; über 3 % → Regel schärfen.
5. **Nie raten**: Was der Titel nicht belegt, kommt nicht in eine Kategorie («Smartphone», wenn nur «Handy-Ständer» im Titel steht). Unklares in `ausserhalb`.
6. **Kein Fachwort ohne Beleg.** Beschreibungen nennen nur, was die Kategorie wirklich enthält; keine Zahlen, keine Marken, keine Versprechen wie «beste», «original».
7. **Neu nur mit Mehrwert**: Ist eine vorhandene Kategorie gut (Fremdkörper < 3 %) und deckt dasselbe ab, wird sie eingeordnet, nicht kopiert. Ist eine vorhandene Titel-Regel-Collection voller Fremdkörper, baue die saubere Kategorie NEU
   (neuer Handle) und notiere den alten Handle in `hinweise` («ersetzt: <alt>»).
8. Tote Regex: jede Regex wird gegen die Mitglieder gemessen; eine Regel, die nichts trifft oder alles trifft, ist ein Fehler.
