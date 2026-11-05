# Katalogfenster «Selbst gestalten»: nur bestellbar anzeigen (05.11.2026)

Marken: **GEMESSEN** = von Claude am 05.11.2026 selbst nachgemessen (Zeit in UTC) · **QUELLE** = Dritte, nicht geprüft · **Hypothese** = nicht belegt.
**Stand: gebaut und geprüft, NICHT LIVE.** Nichts im Shop wurde geändert (nur lesende Abfragen und ein Trockenlauf des Einspielskripts).

## Auftrag und Auslegung
Besitzer 05.11. abends: «nur bestellbare anzeigen» (früher am Tag: «die nicht CH lieferbar und ausverkaufte nicht anzeigen»). **Auslegung (meine, nicht bestätigt): das Katalogfenster** `https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten` (572 Printful-Modelle), nicht die Shopliste darunter und nicht die Produktseiten.

**Regel (verbindlich im Code):**
- Ein Modell erscheint nur, wenn mindestens **eine Ausführung** ein Shopangebot hat (aus dem Shop, `available` nicht `false`, aktives Produkt) und weder das Modell noch die Ausführung in `assets/luxe-clothing-ausblenden.json` steht.
- In der Detailansicht erscheinen nur Farben und Grössen, die zu einer bestellbaren Ausführung gehören (auch die Vorschaubilder und die Zeile «N bestellbare Ausführungen»).
- Zähler (Ergebniszeile, Gruppen, Typ-Liste, Unterkategorie-Chips, Farb- und Grössenfilter, Kurzwahl «Sticker», Sonderauswahl Baby/Unisex) zählen nur das Sichtbare; Gruppen, Kategorien und Auswahlknöpfe ohne sichtbares Modell verschwinden.
- Karten und Details tragen immer den Knopf «Jetzt selbst gestalten» (Ziel `/products/<handle>?variant=<id>#lspod-start`).
- Bei null sichtbaren Modellen steht ein ehrlicher Satz statt einer leeren Seite.
- Die 96 (jetzt 54) Links `?view=luxe-studio` führen auf die Produktseite mit dem echten Bestell-Editor.

## Zahlen (GEMESSEN)
| | vorher 22:45 UTC (31 Shopprodukte) | vorher 23:10 UTC (17 Shopprodukte) | nachher (Browsertest, Nachbildung gegen das Live-Dokument 23:10 UTC) |
|---|---|---|---|
| Modellkarten im Fenster | 572 | 572 | **22** |
| Karten mit Knopf «Jetzt selbst gestalten» (Seite 1 / alle) | 0 / 0 | 0 / 0 | 12 / **22** |
| Karten ohne diesen Knopf | 572 | 572 | **0** |
| Modelle mit Shopangebot (Rechnung aus den Angeboten) | 39 | 22 | 22 |
| bestellbare Ausführungen | 301 | 205 | 205 |
| Detailansicht T-Shirt «Bella + Canvas 3001» | 84 Farben, 9 Grössen, «628 Originalvarianten» | gleich | nur bestellbare Farben und Grössen, «N bestellbare Ausführungen» |
| Detailansicht ohne Angebot («Noch nicht bestellbar») | 533 Modelle (572 − 39) | 550 Modelle | **0** (die Modelle erscheinen nicht) |
| Links `view=luxe-studio` im HTML / im DOM | 96 / 96 (93 Shopliste, 3 Titelkacheln) | 54 / 54 (51 + 3) | **0** (51 Shopliste + 3 Titelkacheln zeigen auf `…?variant=<id>#lspod-start`) |
| Gruppen (Zähler) | 9, keine mit 0 | 9, keine mit 0 | 8 (Kinder & Jugend entfällt), keine mit 0 |
| Typ-Liste | 177 Einträge, davon 4 mit «(0)» | gleich | 61 Einträge, keine mit «(0)» |
| Farbfilter / Grössenfilter | 687 / 355 | 687 / 355 | 9 / 61 |
| Seitliches Scrollen 1440 / 390 px, Seitenfehler | keins, 0 | keins, 0 | keins, 0 |

**Wichtig: die Zahl der bestellbaren Modelle hat sich zwischen den zwei Messungen von selbst geändert.** Um 22:37 UTC setzte der Schritt «L0 live» der Parallelarbeit (Commit `66a45f1947`: «14 Produkte mit zu kleiner v5-Druckdatei auf Entwurf») 14 «Selbst gestalten»-Produkte auf ENTWURF (Kuscheldecke, Strandtuch, Fotokissen, Poster, Sport-BH, Jogginghosen, Kleid, Bomberjacke, Hoodie, Pullover, Rucksack, Leggings, Badeanzug, Boardshorts; Status DRAFT, 0 Verkaufskanäle, `updatedAt` 22:37:24–22:37:38). Damit sank das Fenster von 39 auf 22 bestellbare Modelle. Das ist nicht diese Änderung: sie zeigt genau das, was der Shop zu dem Zeitpunkt anbietet. Der Browsertest rechnet seine Erwartung deshalb jedes Mal aus dem frisch geholten Live-Dokument.

## Wie es funktioniert
- **Angebote** kommen unverändert aus `snippets/luxe-clothing-shop-offers.liquid` (`config.shopVariantOffers`, je Eintrag `printfulVariantId`, `available`, `url`).
- **Variantenkarte** `assets/luxe-clothing-variantenkarte.json` (neu, 333 774 Byte): je Printful-Variante `[Nummer, Farbe|null, Grösse|null]` für alle 13 160 Varianten der 572 Modelle (aus den 51 Datenschalen, `variantenkarte_bauen.mjs`, geprüft gegen den Index). Das JS ordnet jedes Angebot über seine Variantennummer einem Modell, einer Farbe und einer Grösse zu. Ohne Karte lädt der Katalog nicht (ehrlicher Ladefehler mit «Erneut versuchen»), er zeigt nie unbestellbare Modelle.
- **Zusatzschutz** `assets/luxe-clothing-ausblenden.json` (neu, 1 571 Byte): 40 Modelle (nicht in die Schweiz lieferbar, technisch ungeeignet oder überall ausverkauft) und 126 überall ausverkaufte Varianten in 35 sonst lieferbaren Modellen, aus `dropship/codex-katalog/ausblenden.json` (Printful-API, GEMESSEN 05.11.). Das JS liest die Datei **defensiv**: fehlt sie (404) oder ist sie gesperrt, läuft alles weiter (`data-hide-state="unavailable"`). Heute überschneidet sich die Datei **nicht** mit den Shopangeboten (GEMESSEN: 0 von 309 Angeboten liegen auf einer ausverkauften Variante, 0 der 39 Modelle mit Angebot stehen in der Liste; das Modell 684 «Snap Case for Samsung» ist nachgetestet bestellbar und steht nicht darin): sie greift erst, wenn ein Shopprodukt zu einem ausgeblendeten Modell angelegt wird.
- **JS** (`assets/luxe-clothing.js`, 10 kleine verankerte Ersetzungen mit der Marke `LX-NURBESTELLBAR-0511`, **keine** Zeile aus dem Bereich 449–460 der Beschreibungen/Optionen): `variantsFor` filtert auf bestellbare Ausführungen; `lxPrepare()` (vor `renderGroups`) schränkt `products` auf bestellbare Modelle ein und kürzt je Karte `colors`, `sizes`, `colorSizes` auf bestellbare Paare; Gruppen, Typ-Liste, Kurzwahl und Sonderauswahl blenden Leeres aus; jede Karte bekommt den Knopf (vor «Auswahl & Details»); bei zwei Shopangeboten für dieselbe Ausführung ist das erste lieferbare vorgewählt (sonst fehlte der Knopf bis zur Wahl); ein unklares zweites Angebot (anderer Preis/Währung) macht die Ausführung **nicht** bestellbar.
- **Liquid/Texte:** Titelkacheln (`snippets/luxe-selfdesign-cover.liquid`) und Shopliste (`sections/luxe-category.liquid`: Kachel, Bild, Titel, Knopf) führen auf `{{ product.url }}?variant={{ product.selected_or_first_available_variant.id }}#lspod-start`; der Knopf der Shopliste heisst «Jetzt selbst gestalten» (vorher «Entwurf öffnen»); die zwei neuen Dateien stehen im Manifest; die Sektion gibt `none_orderable` und `orderable_variants` weiter.
- **Texte (de/en/fr):** `notice` neu («Hier siehst du nur Modelle, die du bei LuxeStyle gestalten und bestellen kannst. Gestaltet und bestellt wird auf der Produktseite im Shop. Schuhgrössen: Europa-Tabelle des Herstellers, «ca.» = ungefähr.»); neu `none_orderable` («Im Moment ist kein Modell zum Selbstgestalten bestellbar. Bitte schau später wieder vorbei.») und `orderable_variants` («[count] bestellbare Ausführungen»); `luxe_category.end_note` ohne «Dein Entwurf bleibt eine Vorschau» (stimmt nicht mehr, wenn die Karten zum echten Editor führen).

## Dateien (MD5 alt → neu; Ausgangsstand live gemessen 05.11.2026 22:30 UTC und im Trockenlauf bestätigt)
| Datei | alt | neu |
|---|---|---|
| `assets/luxe-clothing.js` | `198328a67066f91ac776e7953d33f07b` | `144038a5ff1903eca8419a1f417af99a` |
| `assets/luxe-clothing.css` | `feba50324b9f59bf07216b2d46ffdbb5` | `549bf374b1791834af07eb70ba05ce5c` |
| `sections/luxe-clothing.liquid` | `71c1406cf5d069e0a23b535d629f1bde` | `b305205924153ceab9a3cafddd6adcb3` |
| `snippets/luxe-clothing-asset-manifest.liquid` | `0539431c5b7f9b15886885d4006d2fd1` | `e384e40aae88e0282e83cbd8e05c36e9` |
| `snippets/luxe-selfdesign-cover.liquid` | `8006e5ededfe5c22a4dc44fda82ded49` | `69d4e5b6c01fc6dfccb648bb79bec46e` |
| `sections/luxe-category.liquid` | `10674566df5ca93ea7e71caf31d921dd` | `2dfc2b62476c800d9c9234bc0a02bbbc` |
| `locales/de.json` | `74704b4a7583a70276bda37f2b5fed6a` | `8cdd691e2ef2c7834bea5e1c7c77924d` |
| `locales/en.default.json` | `75522c426fe29e23479bbc3e35bffa77` | `0c760ab488e9a7524af94f7ec886c1cc` |
| `locales/fr.json` | `0a21cf6b810a2e2fd33552977912948b` | `d938a8fd86d3997a5e8db01ff7083367` |
| `assets/luxe-clothing-ausblenden.json` (neu) | fehlt | `7f27109aa5049125e80a0f3d0374861a` |
| `assets/luxe-clothing-variantenkarte.json` (neu) | fehlt | `5790968bda235f40049578e0471e9899` |

Im Paket: `patches.mjs` (verankerte Ersetzungen, `MD5_VOR`), `apply.mjs`, `apply_test.mjs`, `patches_test.mjs`, `test_nur_bestellbar.cjs`, `mutationsprobe.mjs`, `variantenkarte_bauen.mjs`, `liquid_render.rb` + `liquid_helfer.mjs` (echtes Ruby-Liquid), `daten/` (Variantenkarte, Ausblenden-Quelle, `pruefstand.json`), `sicherung/*.vor` (die neun Ausgangsdateien).

## Einspielen und Rücknahme (nichts davon ist geschehen)
```
node dropship/katalog-nur-bestellbar-0511/apply.mjs                      # Trockenlauf (Vorgabe): liest nur, nennt alle elf MD5 und die neuen Grössen
LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs               # einspielen
ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs     # Rücknahme (NEUE_BEHALTEN=1 lässt die zwei neuen Dateien stehen)
```
- Vor dem Schreiben: MD5 der neun bestehenden Live-Dateien gegen `MD5_VOR`, die zwei neuen Dateien müssen fehlen, die Sicherung muss dem Ausgangsstand entsprechen; bei Abweichung **Abbruch ohne Schreiben** (Exit 4; bei «schon eingespielt/Teilzustand» Exit 3).
- Schritt 1 (Daten, Texte, Liquid: ohne den neuen Code harmlos), Warten bis die Prüfsummen in der API stimmen (höchstens 150 s), Schritt 2 (CSS, JS), nach 75 s Rücklesen aller elf Dateien über die Prüfsumme (Exit 6 bei Abweichung). Die Merkliste `sicherung/eingespielt.json` entsteht vor dem Schreiben.
- Rücknahme: je Datei «neu»/«alt»/«fremd»; eine fremd veränderte Datei bricht ab (Exit 3, `FREMD_UEBERSCHREIBEN=1` übersteuert). Reihenfolge: CSS/JS, warten, Texte/Liquid, zuletzt die zwei neuen Dateien per `themeFilesDelete` löschen (Schema am Live-Shop per Introspektion geprüft: `themeFilesDelete(themeId, files: [String!]!)`).
- **Trockenlauf gegen den echten Shop (GEMESSEN 05.11. 23:0x UTC, nur lesend):** alle neun MD5 gleich `MD5_VOR`, beide neue Dateien «fehlt», «Trockenlauf, nichts geschrieben».
- **Zusammenspiel mit dem Auftrag «Katalogtexte deutsch»:** der ändert dieselbe Datei `assets/luxe-clothing.js` (Zeilen 449–460). Meine Ersetzungen liegen ausserhalb; wer **zuerst** schreibt, ändert die MD5 der JS-Datei, und das zweite Einspielen bricht mit Exit 4 ab. Dann nennt `apply.mjs` die abweichende Datei und prüft selbst, ob die Anker noch passen («Hinweis: Die Anker von patches.mjs passen noch auf den aktuellen Live-Stand»). Weiter: `MD5_VOR[JS]` und `sicherung/assets__luxe-clothing.js.vor` auf den neuen Live-Stand setzen, `patches_test.mjs`, `test_nur_bestellbar.cjs` (mit `PRUEFSUMME_IGNORIEREN=1`), dann `daten/pruefstand.json` neu schreiben und alles wiederholen.

## Prüfung
ERGEBNISSE_PLATZHALTER

## Offene Punkte und Entscheide
ENTSCHEIDE_PLATZHALTER
