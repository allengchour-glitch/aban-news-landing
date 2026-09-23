# Kollektionen & Menü — Audit-Befunde 2, 3, 13, 14 (23.09.2026)

Block «kollektionen-menue». Alle Zahlen: Admin-API, `productsCount(limit:null)` mit `precision`
(immer EXACT), Kanarienvogel `tag:…-xqzv-kanarie` = 0 vor jedem Lauf. Öffentliche Seite per WebFetch.

## Ergebnis auf einen Blick

| Menüpunkt / Kollektion | aktiv vorher | aktiv nachher | Fremdware vorher → nachher |
|---|---:|---:|---|
| Wohnen & Garten › Beleuchtung (`sub-beleuchtung`, TAG beleuchtung) | 31 | __BEL__ | 9 → 0 |
| Damen › Accessoires: Schals, Mützen & Gürtel (`accessoires`, TAG accessoires) | 34 | __ACC__ | 0 Schals/Gürtel/Socken → __ACC_NEU__ neu |
| Beauty › Parfum & Düfte (`parfum-duefte`) | 31 | 34 | 4 aktive Nicht-Düfte → 0 |
| Geschenke › Geschenke für Ihn (`geschenke-fuer-ihn`, TAG herren UND geschenk) | 14 | __IHN__ | Menüpunkt fehlte → __MENU__ |

## Befund 2 — Beleuchtung

**Ursache** (`automation/cat_tags.mjs`, alte Zeile 42): `/\blampe\b|leuchte|beleuchtung|projektor|…/`
- `\blampe\b` findet kein Kompositum (Tischlampe, Wandlampe, Nachttischlampe) → 163 aktive Lampen mit Tag `lampe` fehlten.
- nacktes `leuchte` traf «LEUCHTEndes Hai-T-Shirt», «leuchtende LED»-Mütze, Gamepad «mit Leuchteffekten», BRUDER-«Rundumleuchte».
- nacktes `projektor` traf Video-Beamer, nacktes `beleuchtung` «Headset mit Beleuchtung», Herrenuhren «leuchtend».
  Vergleich alte/neue Regel über alle 51'189 Exporttitel: −308 Fehltreffer (Uhren, Beamer, Hundehalsbänder,
  Leuchtschuhe …), +65 echte Lampen; alle übrigen Tags unverändert (Nebenwirkungsprobe).

**Neu** `istBeleuchtung(titel, typ)`: Lampen-/Leuchten-Komposita, Lichterketten, Nachtlichter, Leuchtmittel,
Sternenhimmel-/Stimmungsprojektoren — entschieden am **Titel-Kopf** (vor « mit »: «Ladegerät mit Tischlampe» ist
ein Ladegerät, «Tischlampe mit Wireless Charger» eine Lampe) — mit Ausschluss für Taschen-/Stirn-/Velo-/Nagel-/
Mücken-/Wärme-/Pflanzenlampen, Spielzeug, Diffuser, Auto, Bundles. Kanarienvögel (45 echte Titel beide
Richtungen): `node automation/cat_tags.mjs --test` → OK.

**Bestand** (`automation/beleuchtung_tags_fix.py`, zwei Läufe): +168 echte Lampen, −39 Fremdware (9 aktiv:
Gamepad, Hai-T-Shirt, Rundumleuchte, Kindermütze, Aroma-Diffuser, Wellness-Bundle, Duft-Teelichter,
aufblasbare Partydeko, Glitzer-Kronleuchter-Partyset; 30 Entwürfe: Monitor, Epilierer, Taschenlampen,
Camping-Laternen, Diffuser …). Alle Schreibvorgänge zurückgelesen (Lauf 2: 12/12). WebFetch luxestyle.ch/collections/sub-beleuchtung: **185 Artikel**, Platz 1–20 nur Lampen.

**Zwei teure Lehren aus dem ersten Lauf:**
1. **`tagsRemove` ist gross/klein-GENAU, Regeln und Suche sind gross/klein-BLIND.** Sechs Fremdprodukte trugen
   `Beleuchtung` (gross). `tagsRemove(["beleuchtung"])` liess es stehen, mein Rücklesen (`"beleuchtung" in tags`)
   meldete «OK» — die Kollektion zeigte die Ware weiter. Jetzt: Vergleich überall `.lower()`, beim Entfernen jede
   vorhandene Schreibweise nennen.
2. **Export-Tags sind alt:** WEG-Kandidaten nur aus der LIVE-Liste, nie aus `/tmp/export.jsonl` (der zweite
   Trockenlauf zeigte sechs längst bereinigte Produkte erneut «mit Tag»).
Schutz für Handverlesenes: Tag `beleuchtung-manuell` → der Lauf nimmt `beleuchtung` nie weg.

## Befund 3 — Accessoires (Damen)

Regel `TAG = accessoires` bleibt (eine Titel-Regel «CONTAINS Schal» träfe Schale/Schalter/Schalkragen,
«CONTAINS Gürtel» jeden Taillengürtel am Kleid). Stattdessen Tag an echte Accessoires, entschieden am Titel-Kopf:
Schals/Tücher (~67), Mützen (16), Damen-Gürtel (48), Socken/Strümpfe (16), Handschuhe (41) — 187 Produkte
geschrieben, 187/187 zurückgelesen. Ausgeschlossen: Kostüme, Kinder, Herren,
Sport-/Heiz-/Massage-/Shapewear-Gürtel, Box-/Arbeits-/Spülhandschuhe, Socken-Schuhe, Uhr-/Akku-/Lautsprecher-Gürtel.
Entfernt: `accessoires` am Panda-Handyhalter. **POD («Selbst gestalten»: Sticker, Bügeltransfer, iPhone-Hülle)
bewusst nicht angefasst** (Regel 4).

**Kompositum-Fallen, die der Trockenlauf gefangen hat** (vor dem Schreiben behoben):
- `sticker` traf «Baseball-Cap … **Sticker**ei» → 2 Caps wären rausgeflogen → `\bsticker\b`.
- Ausschluss `schuh` (für Socken-Schuhe) traf «Hand**schuh**» → 40 Handschuhe fehlten → `(?<!hand)schuh`.
- Ausschluss `abnehm` (Schlankheitsgürtel) traf «Schal mit **abnehm**barem Kragen» → `abnehm(?!bar)`.
- «Wärmegürtel mit Rotlichtfunktion», «Taillengürtel mit Fischgrät-Shapewear»: Ausschluss am GANZEN Titel,
  nicht nur am Kopf.

## Befund 13 — Parfum & Düfte

Die Kollektion war nicht nur dünn, sondern falsch: `cat_tags.mjs` vergab `parfum` für nacktes «duft».
Entfernt (Tag `parfum`): Boden-Reinigungstücher «mit Frischeduft», Nagellack «mit Aprikosenduft»,
Auto-Duft-Clip, 2× Reed-Diffuser, Duftkerzen (Entwurf). Ergänzt: 7 aktive echte Düfte, die fehlten (Parfum-Balsam,
Roll-on, Parfüm-Öl, Holzduft-Parfum 100 ml …). Nachher **34 aktiv, alle Düfte** (Liste gelesen).
Nicht entfernt: «Aromatisch-holziger Lavendelduft (100ml)» — laut Beschreibung ein Herrenparfüm (Duftwort + ml
behält den Tag). Die beiden Fortura-«Eau de Parfum Pfeife/Miss Fashionista» sind laut Lieferanten-Feed echte
75-ml-Düfte (Gruppe «Haushalt Bad Kosmetik») — nur der Produkttyp «Kostüme & Verkleidung» ist falsch.
Neu in `cat_tags.mjs`: `PARFUM_JA`/`PARFUM_NEIN` (Auto, Diffuser, Kerzen, Reinigung, Nagel, Duftöl, Geschenksets).
**Menüentscheid bleibt offen:** 34 kaufbare Artikel sind dünn, aber sauber (Hauptagent/Betreiber).

## Befund 14 — Geschenke für Ihn

Engpass war nicht `geschenk`, sondern `herren`: 705 aktive Herrenuhren ab CHF 19, 630 davon mit Tag
`geschenk`, aber 698 **ohne** Tag `herren`. Regel (herren UND geschenk, spiegelbildlich zu «für Sie») bleibt.
Tags `herren`/`geschenk` an: Herrenuhren (715), Leder-Accessoires Herren (59: Geldbörsen, Kartenetuis,
Aktentaschen, Leder-Umhängetaschen), Herrenschmuck (16), Bart/Rasur ohne Klingen (13), Herrendüfte (5),
Geschenkset (1) — alle ab CHF 19. Ausgeschlossen: Klingen/Rasierhobel/Messer, Kostüme, Kinder, Damen,
Pheromon-«Seduce Him», Uhrenarmbänder 16–26 mm, Spliss-Trimmer.
Leck-Schutz: `herren` wird nicht gesetzt, wenn der Titel Shirt/Hemd/Hose enthält oder das Produkt `schuhe`
trägt (Titel-CONTAINS-Regeln von herren-shirts/-hemden/-hosen, herren-schuhe).
__IHN_DETAIL__

## Menü «🎁 Geschenke & Mehr»

__MENU_DETAIL__

## Täglich (Tagesliste für fixer_keepalive.sh — nicht selbst eingetragen)
- `beleuchtung_tags_fix` — hält «Beleuchtung» in beiden Richtungen sauber (MAX 400, Kanarien-Pflicht).
- `kollektion_accessoires_fix` — Standard-Modi accessoires,parfum,ihn (nur hinzufügen bzw. Nicht-Düfte weg);
  der Menü-Eingriff läuft NUR mit `MODUS=menue`.
Beide enden mit «FERTIG …» (Konvention des Aufsehers), bei Fehlern ohne.

## Offen / nicht in diesem Block
- `automation/menue_links.py` meldet dünne Menüziele nicht (nur «0 aktiv») — Vorschlag aus Befund 13:
  `productsCount(collection_id AND status:active, limit:null)` mit Schwelle 40. Nicht meine Datei.
- Dünne Menüziele laut Befund 13 (kuschel-heizdecken 17, geschenkverpackung 27, beamer-heimkino 28 …) —
  nicht angefasst.
- Kollektionstexte von «Geschenke für Ihn» und «Parfum & Düfte» sagen «Gratis-Versand ab CHF 50»; laut
  CLAUDE.md gilt seit 22.09. CHF 45 → Block Koll-SEO.
- `kat-muetze-schal` (Kollektion «Mützen, Schals & Stirnbänder», Herbst-Menü) ist verschmutzt: Polizeimützen,
  Plüschmützen, Kochmützen aus Papier, «Mantel mit Schalkragen», «Huhn mit Schal» — eigener Befund.
- Produkttyp falsch: Fortura-Parfums als «Kostüme & Verkleidung», LED-Streifen als «Basteln & DIY»,
  Pendelleuchte als «Sport & Outdoor».
