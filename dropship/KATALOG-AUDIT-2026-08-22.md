# Katalog-Audit LuxeStyle CH — Abschlussbericht

**Stand 22.08.2026** · Grundlage: Vollexport `audit_frisch.jsonl` (45'860 aktive Produkte, 386'600 Varianten), jeder Befund anschliessend gegen die Live-Daten und, wo möglich, gegen die Lieferantenquelle (CJ) gegengeprüft. Alle Zahlen unten sind die **korrigierten** Zahlen nach dieser Gegenprüfung, nicht die Rohzahlen der Suchläufe.

Eine Vorbemerkung zur Einordnung: Der Shop hat rund fünfzehn Bestellungen insgesamt. Kein Befund unten hat einen *belegten* Verlust verursacht. «Was Geld kostet» heisst hier: was den Verkauf verhindert oder beim nächsten Verkauf Geld kostet.

---

## 1. Was sofort Geld kostet

### 1.1 POD-Druckdateien zeigen ins Leere — bezahlt, aber nicht druckbar
**~186 Produkte (Zahl unsicher, siehe unten) · Schwere: kritisch**

Dieser Befund stammt nicht aus dem Audit-Auftrag, sondern fiel bei der Widerlegung eines anderen Befunds an. Er ist trotzdem der teuerste Fund des ganzen Laufs.

Die POD-Produkte tragen ihr Druckmotiv im Metafeld `custom.print_file`; `automation/printful_sync.mjs:104` liest genau dieses Feld, wenn eine Bestellung eingeht. Bei den Fertigdesigns zeigt die URL auf `abannews.com/social/designs/…` — und diese Adresse antwortet mit **404**. Live nachgemessen: `matterhorn.png` → 404, während die heute auf das Shopify-CDN gehobenen Sticker (`sheep.png`) sauber 200 liefern.

Das ist die Klasse der Bestellung **#1008**: bezahlt, nie lieferbar. Der Kunde zahlt, Printful bekommt keine gültige Druckdatei, und der Fehler fällt erst beim Fulfillment auf.

- `automation/sticker_druckdatei.py` hat das für **264 Sticker bereits behoben** — die übrigen Warengruppen (Magnete, Shirts, Tassen, Taschen, Kissen, Mauspads) nicht.
- **Die Zahl ~186 ist eine Hochrechnung**, keine Zählung: geprüft wurden 26 Zufallsprodukte aus 10 Varianten-Gruppen, davon trugen 24 eine eigene Motiv-URL. Wie viele davon 404 liefern, wurde nur stichprobenartig gemessen. **Das gehört als Erstes exakt nachgezählt.**
- ⚠️ Die Reparatur betrifft **ausschliesslich das Metafeld**, nicht die SKU. Wer wegen dieses Befunds an den SKUs schraubt, zerstört einen funktionierenden Druckweg (siehe §5).

**Wächter:** `automation/sticker_druckdatei.py` muss von der Sticker-Sonderlösung zum allgemeinen POD-Druckdatei-Wächter erweitert werden — ein HTTP-Statuscheck über jedes `custom.print_file` aller POD-Produkte, täglich im `fixer_keepalive.sh`. Ein Produkt mit totem Motiv gehört auf **DRAFT mit Tag `druckdatei-tot`**, nicht gelöscht.

---

### 1.2 Die Grösse steckt im Farbwert — und das Grössenfeld zeigt eine andere
**364 aktive Produkte · 1'700 Varianten · 363 davon im Google-Kanal · Schwere: hoch**

Der Importer hat CJs Zusatzgrössen in den **Farbwert** geschrieben und den Grössen-Slot mit einem Füllwert aufgefüllt. Zwei unabhängige Gegenproben belegen, dass es systematisch ist und kein Zufall:

- Die eingebettete Grösse liegt bei **1'700 von 1'700** ausserhalb der regulären Grössenliste des Produkts (XXS/0XL/1XL unterhalb, 7XL–11XL oberhalb).
- Der Grössen-Slot zeigt bei **1'700 von 1'700** exakt die *kleinste* Grösse des Produkts — ein Füllwert.

Nebenwirkung: Die Grössenleiter reisst auf. «Florales Etuikleid» führt live S, M, L, 3XL, 4XL — das 2XL steckt im Farbwert.

| ID | Produkt | Beleg |
|---|---|---|
| `15501060571521` | Damenkleid mit ausgestelltem Saum, 88 Varianten | Farbmenü live: `Rot`, `Red-7XL`, `Red-8XL` — dreimal dieselbe Farbe; Variante `Red-7XL / S`, SKU `CJ-CJLY296037710JQ` |
| `15466024305025` | A-Linien-Kleid mit Rüschenärmeln, 98 Varianten | `Aprikose-XXS / XS` neben der sauberen Reihe `Aprikose` mit XS–2XL |
| `15448590549377` | Strick-Pullover mit V-Ausschnitt, 24 betroffene Varianten | `Gray-0XL / 2XL` neben der korrekten deutschen Reihe `Grau` |

**Was ich an der ursprünglichen Bewertung korrigiere** (Schwere kritisch → hoch): Es ist **keine automatische Fehllieferung**. Die Wahrheit steht in dem Etikett, das die Kundin anklickt — wer S will, wählt «Rot» und bekommt «Rot / S», und das ist korrekt. Der reale Schaden ist eine widersprüchliche, dreifach doppelte Farbliste plus ein falsches `size`-Attribut im Google-Feed. Die im Erstbefund behauptete «sofortige Merchant-Kontosperre wegen Misrepresentation» ist eine unbelegte Zuspitzung; Sperren dieser Art zielen auf Preis, Verfügbarkeit und Firmenidentität.

⚠️ **Reparaturfalle:** Ein naives Umbenennen `Aprikose-XXS` → `Aprikose` kollidiert mit dem bereits vorhandenen Wert und löst «Option value already exists» aus — zwei Varianten würden **verschmolzen** (die bekannte Falle aus `farbwerte_uebersetzen.py`). Der richtige Weg ist umgekehrt: die fehlende Grösse in die Option «Grösse» aufnehmen, die Variante dorthin umhängen, den Farbwert **erst danach** kürzen. DRY-Lauf mit Kollisionswache je Produkt ist Pflicht.

**Wächter:** neu, in der Familie von `variant_value_clean.py` — dieses Werkzeug fasst Optionswerte bereits an und hat seit dem 21.08. eine Kollisionswache («lauten zwei Werte danach gleich, bleibt die ganze Option unberührt»). Genau die wird hier gebraucht.

---

### 1.3 Multipack ohne Stückzahl im Titel
**~220 Produkte (von 260 gemeldeten) · 250 im Google-Kanal · Schwere: hoch, für ~60–80 Verbrauchsartikel kritisch**

Das ist die Ballon-Falle des Betreibers («sonst fragen leute zu teuer für ballon»), nur nie flächig repariert — die Regel steht seit 26.07.2026 im Gedächtnis und wurde auf 15 Luftballon-Produkte angewandt.

| ID | Produkt | Beleg |
|---|---|---|
| `15447929356673` | Einweghandschuhe einzeln verpackt | CHF 19.90 · «1200 einzeln verpackte Handschuhe» = 1,7 Rappen je Stück |
| `15453951164801` | Barock-Perlen für Schmuck | CHF 20.90 · «ABS 500 Stück pro Packung» — liest sich wie eine Perle für 20.90 |
| `15477420851585` | Wäscheblätter | CHF 15.90 · «Jede Packung enthält 100 einzelne Blätter» |

Die stärkste Gegenhypothese — die Menge stecke in der Variante und eine Titelzahl wäre falsch — wurde geprüft und fällt: Fünf der sechs Belegprodukte haben genau eine Variante («Default Title»), der sechste trägt «1200 packs» identisch in allen sechs Varianten. Die Menge ist eine **Produkt**-Eigenschaft.

**Korrekturen:** 260 → ~220. Fünf Fehlgriff-Familien, die jedem naiven Muster entgehen, weil es die Zahl zählt, ohne zu fragen, *was* gezählt wird: **Fadenzahlen** («Fadendichte von 30 Stück» bei einem Langarmshirt), **Grosshandels-Umverpackung** («20 Stück pro Packung» bei einem Hemd mit Grössen S–XXL), **Eigenschaftszahlen** («24 klassische Farben» bei Malen-nach-Zahlen), **Bauteile in Beugung** («967 kleinen Bausteinen», «359 einzelnen K9-Kristallen»), **Zubehörmengen** (Nagelpistole mit 100 Nägeln).

⚠️ Und ein Argument des Erstbefunds ist **verdreht**: Google beanstandet eine *falsche* Mengenangabe im Titel, nicht eine *fehlende*. Der Ist-Zustand erzeugt das Item-Disapproval-Risiko nicht — ein blinder Massen-Schreiber würde es erzeugen: «Herren Langarmshirt · 60 Stück» (Fadenzahl), «Sportwagen · 3145 Stück» (Bausteine). Bei 250 Produkten im einzigen Kanal mit Verkäufen.

**Zusätzlich, kleiner, aber sicher:** 59 % der Treffer sind Nageldesign-Artikel. Dort greift die Ballon-Falle nicht (niemand hält CHF 15.90 für einen einzelnen Kunstnagel) — dort ist die Stückzahl das **verschenkte Kaufargument** (10 gegen 24 Nägel zum selben Preis). Optimierung, kein Defekt.

**Wächter:** `automation/stueckzahl.mjs` kennt den «· N Stück»-Zweig bereits, wendet ihn aber nur beim Import an. Er braucht einen Bestands-Modus, und zwingend die Regel: **Bei Kleidung ist eine Stückzahl im Titel fast immer falsch.**

---

### 1.4 Preis unter Einstand — schwere Ware, nicht billige
**1 harter Fall + 4 belegte Fälle + ~1'400 wahrscheinliche (Zahl unsicher) · Schwere: hoch für den einen, mittel für die Menge**

**Der eine harte Fall:** `15412304871809` «Komfort-Fahrradsattel XXL», price 16.90 · unitCost 27.55 · **1250 g** · SKU `CJYD291313201AZ` · ACTIVE in 7 Kanälen inkl. Google. Er verliert **schon bei der Einzelbestellung mit vollen CHF 7 Versanderlös −3.65**; kein Warenkorb rettet ihn. Die Kostenzahl ist nicht aus dem Export übernommen, sondern bei CJ live nachgerechnet: `product/variant/query?productSku=CJYD2913132` liefert für genau diese Variante `variantWeight 1250.00`, `variantSellPrice 4.19` → `4.19·0.9 + (3.4+16.3·1.25) = 27.55`, auf den Rappen. Er ist der einzige Artikel im ganzen Katalog mit dieser Eigenschaft; der nächstschlechtere Fall liegt bei **+1.61**.

**Drei weitere, die jeder plausiblen Frachtannahme standhalten** — ausnahmslos schwere Ware, bei der die Gewichtsformel statt des Frachtbodens rechnet:
- `15412307853697` Silikon-Abtropfmatte XL, 500 g, 24.90 vs 30.29
- Gemüseschneider, 1620 g, 39.90 vs 41.00 (eigene CJ-Zahl, keine Schätzung)
- Solar-Lichterkette, 720 g, 19.90 vs 20.17

**Und die grosse, unsichere Menge:** 3'620 aktive Produkte stehen auf **genau CHF 14.90**. Der Erstbefund erklärte alle für Verlustware, weil «die Fracht allein mindestens CHF 15 kostet». **Das ist widerlegt** und die Widerlegung ist wichtiger als der Befund:

- Die «gemessene Untergrenze CHF 15» wird von **zwei der vier eigenen Messungen** widerlegt: LX1013 bestand aus zwei Sendungen zu **$6.34** und **$9.49**.
- CJ live gefragt (`logistic/freightCalculate`, CN→CH, je 1 Stück): Ohrstecker 20 g = **$4.82** · Ohrringe 23 g = **$4.87** · Ring 34 g = **$5.06** · Panda-Handyhalter 270 g = **$9.08**. Der Boden CHF 15 überschätzt dort um Faktor 1,8 bis 3,5.
- Die lineare Formel `3.4 + 16.3·kg` **ohne** Boden trifft dagegen alle neun Datenpunkte, einschliesslich LX1015 (906 g: gerechnet 18.17, gemessen 17.42) und einer Livequote bei 840 g ($18.20).
- Der «Beleg» des Erstbefunds war ein **Zirkelschluss**: `cj_kosten_backfill.mjs:31` berechnet `unitCost` selbst als `u·0.9 + max(15, …)` — jede unitCost ist per Konstruktion ≥ 15.

**Echt ist der Befund für die schwere Ware.** Live gemessen am Freizeit-Hoodie-Set (840 g, Ware $4.02, Fracht $18.20): Kosten CHF 20.00 gegen VK 14.90 → Einzelbestellung nur noch **+1.90**, Gratis-Versand-Korb **−5.10**, mit Mengenrabatt **−6.59**. Kippgrenze bei rund **600–750 g**.

⚠️ **Die Zahl ~1'400 ist eine Hochrechnung und darf nicht als Arbeitsliste benutzt werden.** Sie lässt sich nicht belegen, weil **45'700 von 45'741 aktiven Produkten gar kein Gewicht tragen** (99,9 %) und nur **15'553 von 386'600 Varianten (4 %) überhaupt einen unitCost** haben. Ohne Gewichts-Backfill ist die Frage nicht beantwortbar.

**Wächter:** `automation/preisboden.py` zieht diese Ware täglich auf genau CHF 14.90 hoch — auf einen Wert aus einer Zeit, als die Fracht nicht im Preis steckte. Der Boden gehört **gewichtsabhängig**, nicht pauschal. Voraussetzung ist ein Gewichts-Backfill (heute schreibt nur `gewicht()` in `cj_preis.mjs` bei Neuware mit).

---

### 1.5 Das Farbfeld besteht aus reinen Lieferanten-Artikelnummern
**53 Produkte (von 83 gemeldeten) · 3'067 Varianten · alle im Google-Kanal · Schwere: hoch**

Die Kundin sieht statt Farben `XK76 · XK77 · XK222 · XK226` und kann nicht erkennen, was sie bestellt. Ein Auswahlfeld, das die Wahl nicht erklärt, wird nicht bedient — der Abbruch passiert auf der Produktseite und zählt in keiner Statistik. Google bekommt `XK76` als `color`-Attribut. Zugleich ist es ein Lieferanten-Leak nach GEHIRN-Regel 3, eine Ebene *unter* dem Titel, wo ihn keine Titelprüfung je erreicht hat.

| ID | Produkt | Beleg (live) |
|---|---|---|
| `15497447670145` | Loose Herren Kurzarmhemd, 96 Varianten | Option heisst «Farbe», Werte: `XK76 · XK77 · XK78 · XK222 · XK224 · XK225 · XK226` |
| `15496579449217` | 3D Digital-Print Kleid, 96 Varianten | `CDCS1001 · CDCS1002 · … · CDCS10012` |
| `15449435832705` | Damen-Loose-Sweatshirt, 99 Varianten | `GWY1222 · GWY1223 · …`, dazwischen `DZ ZLL Beige` |

Alle 83 Kandidaten wurden live nachgeladen: 83/83 noch ACTIVE, keine Reparatur-Engine war schneller; bei 82 heisst der Code-Slot «Farbe», bei einem «Ausführung» — nirgends ein ehrlich benanntes Modellfeld. Alle 83 sind verkäuflich (`CONTINUE`, `tracked=false`), der Schaden ist nicht theoretisch.

⚠️ **Warum es trotzdem nur 53 sind — und warum die Differenz gefährlich ist:** **26** der 83 sind gar keine Farbfelder, sondern **falsch benannte Grössenfelder**: 12 Jeansjacken (`Y032S … Y105S`) und 14 Herrenhosen mit Werten `Y102S · Y102M · Y102L · Y102XL · Y102XXL`. Die Grösse steht am Ende jedes Werts, die Kundin kann sehr wohl wählen. Wer diese 26 mit derselben Regel behandelt und den Code gegen eine Farbe tauscht, **löscht die einzige Grössenangabe und macht 152 Varianten unbestellbar** — und läuft gegen die im Gedächtnis dokumentierte Entscheidung, den Y-Code bei genau diesen Jacken bewusst zu behalten. Vier weitere sind glatte Fehlgriffe (echte Farbnamen + «Set1…Set45»; `AR2000…AR7000`, im eigenen Text als Modellklassen erklärt; `Style1…Style19`).

**Reparatur in zwei getrennten Läufen**, und für die 53 **keine geratenen Farbnamen**: CJ kennt zu jedem Varianten-SKU die echte Farbe, die muss abgefragt werden. Ein Lauf, der «XK76» auf Verdacht in «Schwarz» übersetzt, wäre schlimmer als der Code.

**Wächter:** `variant_value_clean.py` — mit der harten Auflage, dass es weiterhin **nichts auf Verdacht löscht** (es hätte am 21.08. «110 cm»→«cm» und «Dad 3XL»→«Dad» geschrieben).

---

### 1.6 Titel bei exakt 70 Zeichen mitten im Wort gekappt
**51 Produkte · 51 im Google-Kanal · Schwere: hoch**

«…mit 3D-Digitaldru», «…grossem Fassungsvermög», «…Vorne/Hinten/L». Der Titel ist die Zeile in Google Shopping, in der Kollektions-Kachel und im Warenkorb — ein Vertrauensbruch genau dort, wo die Kaufentscheidung fällt. Betroffen ist auch teure Ware: Ellipsentrainer CHF 120.90 (`15452721119617`, «…Velora 4000 Innova» → InnovaGoods), Moissanit-Ring CHF 91.90, Camping-Schaukelstuhl CHF 88.90.

Die Längenverteilung beweist die harte Kappe unabhängig: **69 Zeichen → 25 Produkte, 70 → 82, 71 → 11.**

| ID | Beleg |
|---|---|
| `15455515378049` | «…Betttuch mit 3D-Digitaldru» — eigene Beschreibung schreibt «Digitaldruck» (im Katalog 240×) |
| `15454012965249` | «…grossem Fassungsvermög» — das «en» fehlt, der Umlaut steht noch da |
| `15450164560257` | endet auf «Vorne/Hinten/L» — die Aufzählung bricht nach einem Buchstaben ab |

Alle Zweifelsfälle wurden gegen die **eigene Beschreibung** aufgelöst statt geraten: «GRA» → «GRA-Zertifikat» (echt gekappt, nicht die gültige Abkürzung), «6 Gal» → «6 Gallonen».

Eigene Nachzählung: 55 Treffer, davon 4 Fehlgriffe (letztes Wort vollständig und lesbar: «…mit Auffangbox», «…mit Fleece-Futter») → **51 echt**. Das Muster übersieht ausserdem mindestens 6 weitere («für Klein» → Kleinkinder, «Rück» → Rücken) — die Zahl ist also eher zu tief.

**Die Rate ist stark gefallen:** Juli 76/22'886 = 0,33 %, August 2/21'981 = 0,009 % — Faktor 37. Warum, konnte ich **nicht abschliessend klären**; der Code ist unverändert, und ein Fall stammt vom 19.08. (`15503947694465`). Als erloschen darf der Fehler deshalb nicht gelten.

---

### 1.7 Englische Optionswerte im Auswahlfeld
**5'089 Produkte (von 5'099 gemeldeten) · 73'258 Varianten · 5'028 im Google-Kanal · Schwere: hoch, aber nur zu ~30 % sicher reparierbar**

27,7 % aller Produkte mit echter Auswahl. Bei 5'087 steht das Englische im **ersten** Feld — dem, das die Kundin zuerst anklickt; bei 1'215 ist das Farbfeld komplett englisch. Der Optionsname ist dabei jedes Mal deutsch («Farbe», «Grösse», «Ausführung»), der Bruch sitzt also exakt am Kaufknopf. Vollends unbedienbar wird es bei den Rohübersetzungen: «Lotus Root Color» (241 Varianten), «Skin Color» (130), «Xingyao Black» (68), «150 pounds color words».

| ID | Beleg (live) |
|---|---|
| `15477531902337` | Abendkleid CHF 74.90 — Farbfeld: `1Color · 1Color-US 0 · 1Color-US 16W` (72 Werte) |
| `15481756287361` | Stiefeletten CHF 42.90 — `Black-37-Leather · Black-37-Suede` (Farbe + Grösse + Material in EINEM Wert) |
| `15450828898689` | Thermo-Strumpfhose — `2pcs Black skin with feet-220g fleece and thickened` |

Das Muster ist ungewöhnlich sauber: 45 von 45 handgelesenen Zufallstreffern echt, **10 belegte Fehlgriffe von 5'099 (0,20 %)** — drei Handy-Modellnamen («iPhone 14 Plus»), «Type C» (offizielle Steckernorm), fünfmal «Golden» (auch deutsches Adjektiv), einmal «Large/Medium» als Grössennamen. Die deutschen Lehnwörter im Muster (Pink, Khaki, Beige, Sand, Modell, Silber) kommen 60'412-mal in den Varianten vor und lösten kein einziges Mal fälschlich aus.

⚠️ **Aber nur rund 1'540 sind sicher reparierbar.** **3'549 der Treffer** tragen das Englische in einem **kombinierten** Wert (`Black-37-Leather`, `Blue-35to39-1pair`, `001 Camel color-37-Four season collection`). Genau diese Klasse hat das Projektgedächtnis bewusst ausgespart — «dort ist die STRUKTUR falsch, nicht die Sprache» — und ein Umbenennen löst «Option value already exists» aus und verschmilzt Varianten. Sofort und sicher machbar ist die reine Farbwert-Klasse («Dusty Blue1», «Watermelon Red», «Budding Green», «Skin Color») über `automation/farben_de.json`.

**Wächter:** `automation/farbwerte_uebersetzen.py`, das seit dem 21.08. auf `farben_de.json` als einziger Quelle sitzt. Es hat bereits 1'316 Produkte übersetzt — es muss nur wieder laufen und die Wortliste braucht die oben gefundenen Rohübersetzungen.

---

### 1.8 Kleinere, aber echte Titel-Lücken

| Klasse | Anzahl | Beleg | Bewertung |
|---|---|---|---|
| «Set» im Titel, Teilezahl fehlt | **45** (von 98) | `15503238070657` Cocktail-Shaker «11-teilig» · `15490445017473` Makeup-Bürsten «10-teilig» | mittel — die Zahl steht auf derselben Seite, es ist eine verschenkte SEO-/Vergleichschance. **Nur reparieren, wenn genau EINE Teilezahl im ganzen Text steht**; bei 19 der 64 Kerntreffer ist die Zahl eine Variante («4-, 6-, 8-, 10- oder 14-teilig») oder ein Bauteil («60-teiliges Schraubendreher-Set *innerhalb* eines Reparatur-Sets») — dort wäre die Titelzahl eine Falschaussage im Google-Feed |
| CH-Lager: «1 Dose à N Stück» | **5** (von 7) | `15470031372673` HARIBO Happy Cola CHF 27.00 / 150 Stück · `15470037139841` Besteckset «Lieferumfang: 50 Sets» | mittel. Die frühere Reparatur erfasste nur «Beutel à N Stück» (16/16 sauber), nicht «Dose à». **Der wertvollste Fall ist das Besteckset** — als «· 50 Sets» schreiben, nicht «50 Stück» (das wären 200 Teile) |
| Lieferantencode irgendwo im Optionswert | **116** eng / ~307 weit | `15453921542529` Midi-Rock: `044BSNQ041 · BSNQ031` | mittel |
| Kleine Mehrfachpackung (2–9) | **~25** (von 176) | `15454001463681` Golf Eisenabdeckungen, 9-teilig, CHF 21.90 | niedrig — bei 84 % Fehlerquote **kein Massen-Schreiber** |

⚠️ **Zwei CH-Lager-Produkte dürfen NICHT angefasst werden**: `15470073479553` Lampionstab und `15470001357185` Zauberstab tragen live «Lieferumfang: **1 Stück**»; «📦 Verkauf in Bündeln zu 10 Stück» ist eine Fortura-Grosshandelsnotiz zur Gebindegrösse. Die Produktbilder zeigen einen einzelnen Stab. Wer hier «· 10 Stück» schreibt, verspricht das Zehnfache. **Die Reparaturregel muss den LIEFERUMFANG lesen, nicht die Bündelzahl, und bei «Lieferumfang: 1 Stück» hart abbrechen.** Beleg dafür, dass die Felder unabhängig sind: von 56 aktiven «Verkauf in Bündeln»-Produkten tragen 53 die Menge korrekt im Titel — und dort stimmt sie **immer** mit dem Lieferumfang überein.

---

## 2. Was strukturell blutet

Zu jedem Befund die Frage: *Wer schreibt das Feld beim nächsten Produkt?*

### 2.1 `automation/stueckzahl.mjs` Zeile 50 und 52 — der 70-Zeichen-Schnitt
```
return t.slice(0, maxLen)
```
Ein roher Schnitt ohne jede Wortgrenzen-Behandlung. Aufgerufen von **allen drei aktiven Importern**: `cj_category_fill.mjs:742`, `cj_sku_import.mjs:175`, `cj_trending_import.mjs:314`.

Das Belegende: **dieselbe Datei macht es in den Zeilen 57–64 richtig** — Wortgrenze plus Füllwort-Trimmen, mit dem Kommentar «Ein abgeschnittener Titel darf nicht auf einem Binde- oder Füllwort enden … liest sich wie ein Fehler». Aber nur im selten genommenen «· N Stück»-Zweig. Der Hauptpfad blieb roh.

Das ist zum **vierten Mal** dieselbe Fehlerklasse nach Farbtabelle, `publishVerified()` und Preisformel: *Wer eine Hilfsfunktion an einer Stelle repariert, muss ihre Geschwister suchen.* Hier stehen beide Fassungen sogar in derselben Datei.

**Fix:** die Wortgrenzen-Logik aus 57–64 in den Hauptpfad ziehen. `automation/title_hygiene.mjs` deckt das **nicht** ab — es entfernt nur Lieferanten-Refs und hängende Trennzeichen.

### 2.2 Optionswerte: der Importer übernimmt CJ ungefiltert
Grösse-im-Farbwert (364), Codes im Farbfeld (53), Englisch (5'089) und Code-Vorsatz (116) haben **eine** Quelle: Der CJ-Importer schreibt CJs `variantKey` unverändert in die Shopify-Option. Für Farben gibt es seit dem 21.08. eine Wahrheit (`automation/farben_de.json`), für **Codes und eingebettete Grössen gibt es keine Regel** — und keinen Wächter, der den Bestand prüft.

`variant_value_clean.py` ist das nächstliegende Werkzeug, wurde aber am 21.08. bewusst stark entschärft, weil seine alte Regel Grössen gelöscht hätte. Es braucht drei neue, eng gefasste Regeln (eingebettete Grösse → Grössen-Option; Code+Farbe → Farbe; Code allein → CJ fragen), jede mit DRY-Lauf und Kollisionswache.

### 2.3 Der Frachtboden `max(15, …)` in `automation/cj_preis.mjs`
Seit dem 22.08. liegt die Preisrechnung an EINER Stelle — das war richtig und hat vier auseinandergelaufene Formeln zusammengeführt. Der **Boden von CHF 15** ist aber der unbelegte Teil des Modells:

- Zwei der vier eigenen Messungen liegen darunter ($6.34, $9.49).
- Vier CJ-Livequoten liegen darunter ($4.82 bis $9.08).
- Die lineare Formel `3.4 + 16.3·kg` trifft **alle neun** Datenpunkte ohne Boden.

Folge: Der Boden erzeugt 91 von 94 «Verlustfällen» im Gratis-Versand-Befund und 15 von 28 im Mengenrabatt-Befund. **Er verfälscht jede Margenrechnung im ganzen Katalog nach unten** — und würde bei einer Preisreparatur rund 2'200 Artikel verteuern, die in jedem Warenkorb Gewinn bringen (Schmuck +8 bis +10 CHF).

### 2.4 Gewicht und Kosten: das Fundament fehlt
- **45'700 von 45'741 aktiven Produkten (99,9 %) haben kein Gewicht.** `gewicht()` schreibt es seit dem 22.08. bei Neuware mit — der Altbestand bekommt es nicht.
- **Nur 15'553 von 386'600 Varianten (4 %) haben einen `unitCost`.** `cj_kosten_backfill.mjs` läuft, ist aber weit von fertig.

Ohne beides ist die Frage «welche Ware verliert Geld?» **nicht beantwortbar** — und jede Zahl in §1.4 bleibt Hochrechnung. Das ist die lohnendste Investition des nächsten CJ-Punktebudgets, nicht das 45'861-ste Produkt.

### 2.5 `automation/google_feed_cull.py` führt kein Ledger
Das Werkzeug entfernt Produkte aus dem Google-Kanal (Grund: Google-CSS-Kapazität überschritten, sonst wird der **gesamte** Feed abgelehnt) — und hinterlässt **keine Spur im Repo**. Sein Zustand liegt in `/tmp/gfeed_cursor.txt`.

Folge: Der Filter «kein Sperr-Tag und nicht im Säuberungs-Ledger, also unerklärt» selektiert systematisch die *absichtlichen* Ausschlüsse dieses Laufs. **Jede künftige Google-Lücken-Analyse wird dieselben Produkte erneut als Fehler melden** — dieser Lauf hat genau darauf 27 Produkte falsch angeklagt.

**Wächter:** `automation/google_kanal_luecke.py` muss den Cull-Grund kennen; dafür braucht `google_feed_cull.py` ein Ledger mit Grund im Repo, nicht in /tmp. (*Was nur in /tmp lebt, ist verloren* — zum dritten Mal.)

### 2.6 POD-Druckdateien: die Geschwister-Lücke
`automation/sticker_druckdatei.py` hat die toten `abannews.com`-Motive für 264 Sticker auf das Shopify-CDN gehoben. Magnete, Shirts, Tassen, Taschen, Kissen und Mauspads blieben stehen. Niemand prüft, ob ein `custom.print_file` überhaupt antwortet, bevor ein POD-Produkt publiziert wird.

---

## 3. Was nur der Betreiber entscheiden kann

Alles Folgende trifft beworbene Ware oder Geldmechanik. Es sind **Geschäftsentscheidungen, keine technischen Korrekturen** — ich fasse nichts davon an.

**3.1 Der Frachtboden CHF 15.** Auf die gemessene lineare Linie senken (`3.4 + 16.3·kg`, trifft alle neun Datenpunkte) oder als bewussten Sicherheitszuschlag behalten? Die Entscheidung verändert **jeden künftigen Preis** und die Bewertung von rund 3'620 Bestandsartikeln. Für den konservativen Boden spricht, dass er die Marge klein rechnet, nicht schön — das ist im Zweifel richtig herum. Gegen ihn spricht, dass er Leichtware um Faktor 1,8 bis 3,5 zu teuer macht und die 3'620 als Problem erscheinen lässt, das sie zu ~61 % nicht sind.

**3.2 Der Fahrradsattel `15412304871809`.** Der einzige Artikel, der bei *jeder* Bestellung verliert. Die aktuelle Formel ergäbe CHF 32.90 (nicht 34.90, wie im Erstbefund stand). Ein Fahrradsattel für CHF 32.90 — verkäuflich oder nicht? Alternative: **DRAFT mit Tag `preis-unter-einstand-pruefen`**, dann ist er weder Verlustquelle noch Fehlentscheid. Löschen ist in keinem Fall richtig.

**3.3 Die schwere 14.90-Ware.** Rund 1'400 Artikel ab ~600 g (Zahl unsicher, siehe §2.4). `dropship/PREIS-ALTBESTAND-ENTSCHEID.md` vom 22.08. rechnet drei Wege durch. **Was nachweislich nicht hilft:** die Gratis-Schwelle anheben — die Fracht fällt je *Artikel* an, belegt an LX1013 (zwei Artikel, zwei separate Frachten von $6.34 und $9.49).

**3.4 Die Rabatt-Mechanik — drei Zahlen, die niemand gemeinsam betrachtet.**

| Stellschraube | Wert | Zustand |
|---|---|---|
| Versandprofil, aktive Gratis-Stufe | **45.00** | aktiv (= 50 × 0.9, absichtlich) |
| Automatischer Rabatt «Gratis-Versand» | **49.00** | aktiv |
| Beworbene Zusage im Shop | **50** | überall im Text |
| «Bundle: 2+ Artikel −10 %» | ab 2 | **aktiv** |
| «Mengenrabatt −10 % ab 3 Artikeln» | ab 3 | **aktiv, aber wirkungslos** |

Shopify wendet je Bestellung nur **einen** automatischen Rabatt an; die 3er-Regel kann bei gleichem Prozentsatz nie etwas bewirken, was die 2er nicht schon tut. **Die Startseite bewirbt trotzdem «ab 3 Artikeln»** — Kundinnen wird ein höherer Mindestkauf genannt, als tatsächlich nötig ist. Das ist die billigste Korrektur des ganzen Berichts.

**3.5 Die 23 BigBuy-Artikel im Google-Feed.** Sie flogen am 09.08. wegen Lieferantencodes im Titel raus; die Titel sind seit dem 11.08. bereinigt, der Ausschlussgrund ist weg. Zurückholen hängt an der Google-CSS-Kapazität **und** an einer Lieferbarkeitsprüfung gegen den Viability-Guard — es ist stillgelegte Ware mit je ein bis zwei Stück Restbestand. Die #1008-Klasse.

**3.6 Die 8 handkuratierten Altprodukte ohne Lieferanten-SKU** (`WALLET-BLK`, `WATCH-001`, `SUNGLASS-BLK`, `LED-001`, `BAND-001`, `BABY-BIB-001`, `JADE-SET-001`, `PROJ-PANDA-001`). Alle ACTIVE, `CONTINUE`, mit erfundenem Bestand (35–100 Stück), hinter der SKU kein Lieferant. Darunter die Bewertungssieger (Slim Wallet 5,0★, Herrenuhr 5,0★, Jade Roller 5,0★) — genau deshalb ist pauschales Draften teuer.

---

## 4. Geprüft und sauber — nicht erneut prüfen

| Was | Zahl | Beleg |
|---|---|---|
| **Schmetterlingsmesser im Google-Feed** | 4/4 geschlossen | alle DRAFT, `resourcePublicationsV2` **leer** (0 Publikationen), Tags `waffengesetz-verboten` + `nicht-bewerben` bereits gesetzt. Gegengeprüft an einem Kontrollprodukt (Slim Wallet → 7 Publikationen), die leere Liste ist kein Query-Artefakt |
| **9999-Bestand bei POD** | 22 Produkte, kein Befund | Unter `inventoryPolicy=CONTINUE` ist die Bestandszahl für die Verkaufsentscheidung wirkungslos — die ~450 übrigen Printful-Produkte stehen auf 0/CONTINUE und verhalten sich identisch. Quersumme geprüft: alle 22 `totalInventory` sind glatte Vielfache von 9999 |
| **Printful-SKU-Präfix `9000001`** | 450 Produkte, Absicht | `printful_sync.mjs:65` liest nur die Varianten-Hälfte (`/_(\d+)\s*$/`); kein Konsument löst die Zahl davor auf. `sku_dup_scan.py:27` nimmt ihn ausdrücklich aus. 24 von 26 geprüften Produkten tragen eine eigene Motiv-URL |
| **Substring-Fallen im Grösse-im-Farbwert-Muster** | 0 von 1'700 | Suffix-Verteilung ausschliesslich 1XL (502), 2XL (285), XXS (243), 7XL (198), 0XL (187), 8XL (153) u. w. — **kein einziges kurzes `-S`/`-M`/`-L`**. Die IPL-/Leder-/Skincare-Klasse ist hier strukturell ausgeschlossen |
| **Englisch-Muster, Präzision** | 45/45 handgelesen echt, 10 Fehlgriffe von 5'099 (0,20 %) | Die Lookarounds halten: «led» in Leder, «and» in Sand, «model» in Modell, «silver» in Silber, «light» in Highlight lösen **nicht** aus (60'412 Vorkommen geprüft) |
| **Fortura CH-Lager, Titel-Mengen** | 53/56 «Verkauf in Bündeln» korrekt, 16/16 «Beutel à» korrekt | Nur die «Dose à»-Formulierung wurde übersehen |
| **Unter-Einstand-Menge: fremde Lieferanten** | 0 | 0 Produkte mit `pod`/`printful`/`fortura`-Tag, 0 mit `ch-lager`/`eu-lager` in der Menge — es ist reine CJ-Ware |
| **Optionsnamen** | 82/83 heissen «Farbe», 1 «Ausführung» | Nirgends ein ehrlich benanntes Modellfeld — die Codes tarnen sich durchweg als Farbe |
| **Die 27 «fehlenden» Google-Publikationen** | erklärt, kein Fehler | Shopify-Ereignisliste: bei Anlage publiziert, am 09.08. zwischen 04:09 und 12:13 in Paginierungs-Reihenfolge ausgeschlossen — ein durchlaufender Cull-Lauf, kein Versehen |

---

## 5. Widerlegt — bitte nicht nochmals aufwerfen

- **«4 Schmetterlingsmesser live im Google-Feed»** — sachlich richtig klassifiziert (4/4 echte Balisongs, WG Art. 4), aber zwischen Export (18:40) und Prüfung bereits gedraftet und aus allen Kanälen genommen. Klassischer Schnappschuss-Effekt. Nichts zu reparieren.
- **«Die teuerste Ware fehlt bei Google — Importer publizierte ohne Quittung» (27 Produkte)** — falsche Diagnose: `google_feed_cull.py` hat sie am 09.08. bewusst entfernt, weil die Google-CSS-Kapazität überschritten war und sonst der **ganze** Feed abgelehnt wird. Eine «Reparatur» brächte Bilder unter 500 px zurück in den Feed und bewürbe stillgelegte BigBuy-Ware mit ungeprüfter Lieferbarkeit.
- **«9999 als Bestand ist eine Bestandslüge» (22 POD-Produkte)** — unter `CONTINUE` wirkungslos; die eine angebliche Gegenprobe (5XL auf 0/DENY) ist im Gegenteil der Beweis, dass bei Printful **nachgefragt wurde**. Auf DENY umstellen würde Ware unverkäuflich machen, die auf Bestellung gefertigt wird.
- **«Erfundene Printful-Produkt-ID 9000001» (450 Produkte)** — dokumentierter, per `SKU_PREFIX` konfigurierbarer Rohteil-Präfix; das Fulfillment liest ihn nie, das Motiv kommt aus `custom.print_file`. Eines der Beispiele war zudem falsch (`15429994185089` ist ein Tassen-Set mit SKU `MUGSET-KINGQUEEN-11/15`). ⚠️ **Der echte Defekt an denselben Produkten steht in §1.1** — er betrifft das Metafeld, nicht die SKU.
- **«3'620 Produkte auf CHF 14.90 verlieren strukturell Geld»** — der Beleg war ein Zirkelschluss (`unitCost` wird selbst mit `max(15, …)` berechnet), und die «gemessene» Untergrenze CHF 15 wird von zwei der vier eigenen Messungen widerlegt. Echt ist der Befund für schwere Ware ab ~600–750 g, nicht für Schmuck und Accessoires (dort CJ-Livequoten $4.82–$5.06 gegen angenommene CHF 15).
- **«94 Produkte kippen im Gratis-Versand-Korb»** — 91 davon sind Artefakte desselben Frachtbodens; 79 % der betroffenen Varianten tragen gar kein Gewicht, dort *ist* die «Fracht» der Boden. Echt bleiben 4.
- **«27 Produkte kippen durch den 2+-Rabatt»** — 15 sind Bodenartefakte (CJ live: Silberarmband 2 g, Kissen 190 g, Gaming-Maus 215 g), und bei 17 der 28 erreicht ein 2er-Korb die Gratis-Schwelle gar nicht, kassiert also CHF 7 Versand und ist im Plus. Echt bleiben 12, alle ab ~670 g.
- **«Lampionstab und Zauberstab brauchen ‹10 Stück› im Titel»** — beide tragen live «Lieferumfang: 1 Stück»; «Verkauf in Bündeln» ist eine Grosshandelsnotiz. Eine Reparatur hätte das Zehnfache versprochen.
- **«83 Produkte mit Codes im Farbfeld»** — 26 davon sind falsch benannte **Grössenfelder** (`Y102S · Y102M · Y102L`); eine Farb-Reparatur würde dort die einzige Grössenangabe löschen und 152 Varianten unbestellbar machen.
- **«176 kleine Mehrfachpackungen ohne Titelhinweis»** — ~84 % Fehlgriffe: Einheiten («Kapazität von 3 Litern», «Enthält D&C Red 6»), Bauteile («Quadcopter, Fernbedienung, Akku, 4 Ersatz-Rotorblätter»), Varianten («Optional mit 4er-Set Reiben erhältlich» bei EINEM Schneidebrett) und bereits pluralische Titel.

---

### Die eine Lehre, die dieser Lauf dreimal bestätigt hat

Drei der vier Preis-Befunde und beide Frachtargumente messen **dieselbe Annahme**, nicht den Katalog: den Frachtboden `max(15, …)`. Wo ein Modell in die Belegkette wandert, wird jede Zählung darauf zur Tautologie — `unitCost ≥ 15` per Konstruktion, also findet man garantiert Produkte unter 15. Der Ausweg war jedes Mal derselbe: **beim Lieferanten nachfragen** (CJ `product/variant/query`, `logistic/freightCalculate`) statt die eigene Formel gegen sich selbst zu prüfen. Das kostete vier Abfragen und hat vier Befunde umgedreht.