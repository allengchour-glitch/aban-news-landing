# Katalogfenster «Selbst gestalten»: EU-Grössen, ml statt oz, Knopf zum Editor (04.11.2026)

Marken: **GEMESSEN** = hier abgefragt · **QUELLE** = Dritte, nicht selbst geprüft · **Hypothese** = nicht belegt · **unbekannt** = nicht gemessen.

## Auslöser
Besitzer 04.11. (Handy-Screenshots vom Katalogfenster, Adresse `/collections/selbst-gestalten-1?view=luxe-gestalten`):
«europa grösse, und das überall» (Katalog «Men's Slip-On Canvas Shoes» zeigte US-Grössen 5 bis 13), «oz grösse ändern» («White Glossy Mug» mit 11/15/20 oz) und «bearbeitungstool fehlt».
Die Auslegung ist meine: Katalogfenster, nicht der ganze Shop (siehe «Was nicht gemacht wurde»).

## Messung (Workflow `wf_d9627d02-92f`: drei Messer, drei unabhängige Prüfer, nur lesend)
- Der Katalog (Sektion `luxe-clothing`, nur über `?view=luxe-gestalten`) ist ein **Lieferanten-Nachschlagewerk**: 572 Printful-Produkte, 13 160 Varianten, in 51 Datenschalen im Theme (Schnappschuss 01.11.2026, nicht im Repo). `cartEnabled=false` und `shopifyMapping=null` bei 572 von 572, der Code kennt weder Warenkorb noch Editor. Nur **39 von 572** Modellen (6,8 %) haben ein Shopprodukt und damit einen Preis und den Link «Produkt im Shop ansehen».
- Der echte Editor (`assets/lspod-designer-v5-safe.js`) läuft nur auf den Produktseiten der Shopprodukte, dort immer aufgeklappt ganz unten. Der Anker `#lspod-start` landete auf dem Desktop **536 px unterhalb** des Fensters (die rechte Spalte ist sticky und höher als das Fenster), mobil unter der Kopfzeile.
- **US-Schuhe:** 10 Produkte, 292 Varianten (146 Grössenzeilen), keine EU-Daten im Katalog. EU-Werte kommen aus Printfuls Grössentabelle «Europe» je Produkt (`/products/{id}/sizes`, 146 von 146 Zeilen von einem zweiten Prüfer frisch bestätigt). **Keine allgemeine Umrechnung**: Marken und Leisten streuen um bis zu 1,5 Grössen (Brogue Genf: 3 von 14 gleich).
- **oz:** 23 Produkte, 76 Varianten (56 ml bei Getränkeware, 18 g bei Kerzen, 2 offen beim Tiernapf). Das Stoffgewicht «oz./yd.²» (334 Beschreibungen, 384 Stellen) ist keine Flüssigkeit und bleibt unberührt.
- Zoll nach cm macht der Katalogcode schon (`createMetricFormatter`, an 27 Beispielen und allen Fundstellen geprüft).

## Was geändert wird (sieben Dateien im MAIN-Theme `213013037447`)
| Datei | Änderung |
|---|---|
| `assets/luxe-clothing-reference-gallery.json` | Etiketten `variants[].displaySizeCh` für 31 Produkte, 365 Varianten (der Katalogcode liest dieses Feld schon, Vorbild Produkt 653). 11 vorhandene Zeilen mit freigegebenem Herstellerbild werden nur um `variants` ergänzt, 20 neue Zeilen. Format und alle anderen Felder bleiben Byte für Byte. |
| `assets/luxe-clothing.js` | Filter-Option und Filter-Chip zeigen bei mehreren Etiketten alle («EU 42 / EU 44 / 10») statt des US-Rohwerts; Knopf «Jetzt selbst gestalten»; ehrliche Anzeige für nicht bestellbare Modelle/Ausführungen und nicht lieferbare Angebote. 4 Originalzeilen verändert, 4 Zeilen neu. |
| `assets/luxe-clothing.css` | Klassen `.lcl-design-cta`, `.lcl-design-switch`, `.lcl-not-orderable` (angehängt) |
| `sections/luxe-clothing.liquid` | 5 Label-Zeilen |
| `locales/de.json`, `locales/en.default.json` | 5 neue Schlüssel, `notice` und `shop_price_note` neu gefasst (`fr` fällt auf `en.default` zurück) |
| `blocks/buy-buttons.liquid` | zweites `<script>` im Zweig `lspod_designzwang == '1'` (nur Produkte mit Editor): springt zum Editor, 100 px unter die Oberkante, auch bei Klick auf den vorhandenen Knopf «Zuerst dein Design gestalten» |

## Regeln der Etiketten (`etiketten.mjs`, jede belegt)
- **Schuhe:** nur die Printful-Tabelle des jeweiligen Produkts (`daten/schuh_eu_tabellen.json`, abgerufen 04.11.2026). Format «EU 37,5». **20 Varianten tragen «(ca.)»:** Herren US 11,5 und 12 (Produkte 513, 574, 578, 657), Slides Herren 11,5 (597) und Slides Damen 6,5 (598): dort weichen Zweitquellen (Atoms, Converse, Vans, size.ly) ab oder Printful widerspricht sich selbst. Die Zweitquelle ist nur teilweise unabhängig und bestätigend, nicht «unabhängig bestätigt».
- **oz:** nur Kategorie «Drinkware & coasters» nach ml (1 US fl oz = 29,5735 ml) und «Candles» nach g (28,3495 g); alles andere bleibt. Nennt die Beschreibung desselben Produkts «N oz (M ml|g)» und weicht M höchstens 3 % von der Rechnung ab, gilt der Herstellerwert, damit Knopf und Text dasselbe sagen (7 Produkte: 382 → 500 ml, 585/742/909 → 600 ml, 691 → 443 ml, 788 → 950 ml, 935 → 650 ml). Sonst wird gerechnet und auf ganze ml gerundet (11 oz = 325 ml, 15 oz = 444 ml, 20 oz = 591 ml).
- **Produkt 751 («16 oz. (590 ml)») wird nicht umgerechnet:** der Hersteller widerspricht sich selbst (590 ml sind rund 20 oz, die Rechnung gäbe 473 ml). Offen beim Hersteller. Tiernapf 678 (18/32 oz): unbekannt, ob Volumen oder Gewicht, bleibt.

## Wortlaut (de)
Knopf «Jetzt selbst gestalten» (gleich der Überschrift des Editors; «Jetzt gestalten» ist schon der Knopf der Vorschau-Seite `?view=luxe-studio`, die nichts bestellt). Ohne Angebot: «Noch nicht bestellbar: Für dieses Modell gibt es bei LuxeStyle noch kein Produkt zum Selbstgestalten.» / «Diese Ausführung ist noch nicht bestellbar. Andere Ausführungen dieses Modells kannst du gestalten.» (mit Wechselknopf) / «Diese Ausführung ist derzeit nicht lieferbar.» Der alte Satz «Gestaltung und Bestellung sind hier noch nicht verknüpft» ist weg.

## Einspielen und Rücknahme
```
node dropship/katalog-einheiten-0411/patches_test.mjs        # Tests (ohne Netz)
node dropship/katalog-einheiten-0411/mutationsprobe.mjs      # 29 absichtliche Fehler, alle müssen rot werden
node dropship/katalog-einheiten-0411/apply.mjs               # Trockenlauf gegen das Live-Theme (liest nur)
LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs        # einspielen
ZURUECK=1 LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs   # Rücknahme (nur wenn alle sieben Dateien exakt dem eingespielten Stand entsprechen)
NODE_PATH=$(npm root -g) node dropship/katalog-einheiten-0411/pruefen_live.cjs   # Browserprüfung am Live-Shop (ein Aufruf mit Query)
```
Das Einspielen prüft die MD5 aller sieben Live-Dateien gegen den Ausgangsstand (sonst Abbruch, nichts geschrieben), legt `sicherung/*.vor` ab, schreibt in zwei Schritten (1: Texte, Section, Galerie, ohne Code harmlos; 20 s Pause; 2: CSS, JS, Produktseiten-Skript, weil `t()` bei fehlendem Label den rohen Schlüsselnamen zeigt) und liest nach 75 s alle Dateien über die **Prüfsumme** zurück (die Galerie ist mit 243 KB über der Grösse, ab der die Theme-API den Inhalt nur als URL liefert).

## Was nicht gemacht wurde (Entscheide des Besitzers oder nicht belegt)
1. **Die echten Shopprodukte** (53 Printful-Tassen mit «11 oz / 15 oz / 20 oz» in der Option «Grösse», darunter die 2 aktiven «Selbst gestalten»-Tassen) bleiben bei oz. Eine Umbenennung ist technisch sicher (SKU, Printful-Sync, Editor und Bilder hängen an IDs), braucht aber: gleichzeitig die Texte der Tassen (wiederholen «11 oz») und die englischen Übersetzungen (63 von 107 Werten) ändern, die Rundung von 15 oz entscheiden (444 gerechnet, Handel nennt 440) und das Umbenennungswerkzeug gezielt für eine feste Liste von seinem Zahlenschutz befreien.
2. **US-Schuhe im Shop:** 11 CJ-Schuhprodukte tragen US/UK-Werte; keine belegte Tabelle, keine Formel. Pro Produkt aus dem CJ-Datenblatt belegen oder Hinweis setzen.
3. **Bestellbar machen:** 533 von 572 Katalogmodellen haben kein Shopprodukt. Je Modell braucht es ein Produkt (Texte, Bilder, Optionen, SKU `<Kennung>_<Printful-Variante>`), Preis (Printful-Kosten plus Versand nach CH, bei 572 von 572 `unknown`) und Druckflächen (`printGeometryStatus` bei 572 von 572 unbekannt). Menge: 13 160 Varianten gegen eine Tagesgrenze von rund 9 500 neuen Varianten für den ganzen Shop. Nicht in einem Zug lösbar.
4. **Doppelte Shopangebote:** 7 Printful-Varianten haben zwei Shopangebote (Tasse 11/15 oz bei `tasse-zum-selbstgestalten` und `keramik-tasse-selbst-gestalten`; T-Shirt weiss S bis 2XL bei `shirt-zum-selbstgestalten` und `unisex-t-shirt-selbst-gestalten`): der Katalog fragt «Shopangebot wählen». Nur die 7 doppelten Paare einer Seite zu streichen wäre die Lösung (nicht die ganze Produktzeile: 10 T-Shirt-Farben würden sonst verschwinden); Entscheid des Besitzers, welches Produkt gilt.
5. **Titelkacheln im Katalogkopf** (`snippets/luxe-selfdesign-cover.liquid`) führen in die Vorschau ohne Bestellung (`?view=luxe-studio`).
6. **Deutsche Titel** (565 von 572 nur englisch): Wortregeln tragen nicht (227 von 572 Titeln bestehen aus den 150 häufigsten Wörtern); braucht Glossar und Stichprobe.
7. **Kindergrössen** (2T bis 6X, 3M bis 24M, Y, 2 bis 20): keine Umrechnung; Printful liefert die Körpergrösse in cm, eine zweite Quelle fehlt.
8. **Herren US 11,5/12 und Slides Damen 6,5** bleiben «(ca.)», bis Printfuls Tabelle im Browser geprüft oder beim Support geklärt ist.
9. **Produkt 751, Tiernapf 678**, Produkt 509 (Grössen G, GG, P, XGG neben M, Ursache ungeklärt).

## Wirkung
Auf Verkäufe **unbekannt** (Hypothese). Der Katalog ist nur über `?view=luxe-gestalten` erreichbar; mehr sichtbare Bestellwege können mehr manuelle Arbeit bedeuten, weil die Weitergabe an Printful nicht automatisch läuft (`printful-sync.yml` pausiert, Anlage nur per Hand).
