# Modell-Fabrik «Selbst gestalten» (Strom 2)

Stand 05.11.2026. **Nichts live.** Die Fabrik hat in dieser Sitzung nichts bei Shopify, im Theme, bei Printful oder bei CJ geschrieben (nur Katalogdateien gelesen, Plan-Dateien in den Scratch und in `beispiele/` geschrieben). Der Schreibweg (`LIVE=1`) ist gegen eine Attrappe getestet, nie gegen den echten Shop.

Aus einer Printful-Modellkarte (`../werkzeuge/modellkarte.mjs`) wird der PLAN für ein Shopify-Produkt «… selbst gestalten» erzeugt. Nur mit `LIVE=1`, einem geprüften Plan, frischen Daten, Ledger und Editor-Adresse legt `pod_modell.mjs` das Produkt als ENTWURF an (DRAFT, in keinem Verkaufskanal). Veröffentlichen tut die Fabrik nie.

## Dateien

Code in `automation/pod_modell/` (Node 22, `/opt/node22/bin/node`):

| Datei | Aufgabe |
|---|---|
| `glossar.mjs` | Wörterbuch Englisch nach Deutsch: Titel (Genus, Beugung), Handle (höchstens 50 Zeichen), Farben (Komposition, Farbrang), Fremdmarken |
| `beschreibung.mjs` | Beschreibung aus der Printful-Beschreibung: Belegpflicht je Satz, Grössentabelle in cm, Lieferbox, Rückgabehinweis, Editor-Container |
| `plan.mjs` | `planeModell()`: Varianten-Auswahl (höchstens 100), Optionen, SKU, Preis, Bilder, Tags, Metafelder, Editor-Karte, Plan-Hash |
| `tore.mjs` | 16 Blocker-Tore und 7 Hinweis-Tore |
| `charge.mjs` | Chargenplan: höchstens 3 000 neue Varianten je Lauf, Tageslimit, Grundlast |
| `anlegen.mjs` | Schreibweg: productSet, Metafelder, Medien, Variantenbilder, Beschreibung, Rücklesen, Ledger, Rücknahme |
| `pod_modell.mjs` | Kommandozeile (Trockenlauf Vorgabe, `LIVE=1`, `ZURUECK=1`) |
| `bilder_messen.mjs`, `bildmass.mjs` | Pixelgrösse von Bildadressen messen (nur lesen, Range-Anfragen, Host-Liste) |
| `fake_shopify.mjs`, `testhilfe.mjs` | Attrappe des Shopify-GraphQL und Testwerkzeug |
| `*_test.mjs` (8 Dateien), `mutation.mjs` | Tests und Mutationsprobe |

Daten hier: `uebersetzungen/` (13 Dateien, jeder Satz `{de, beleg}`, der Beleg steht wörtlich im Printful-Text), `beispiele/` (12 Pläne, Tabelle, Chargenplan, Plan-Hash, `gegenproben/`).

## Befehle

Eingaben (aus Strom 1, alles Dateien): `KATALOG_DIR` (`<id>.json`), `VERSAND` (`versand_alle.json`), `SCHAETZUNG` (`schaetzung_alle.json`), `ABGLEICH` (`katalog_abgleich.json`), `BESTAND` (`matrix.json`), `BILDER` (`bilder_masse.json`).

```
# Trockenlauf (Vorgabe, schreibt nur nach OUT)
OUT=<Ordner> STUFEN=1,2 [MODELLE=760,403,… | ALLE=1] START=2026-11-06 node automation/pod_modell/pod_modell.mjs
# Bildgrössen messen (nur lesen, nur files.cdn.printful.com)
PLAENE=<OUT> OUT=<bilder_masse.json> node automation/pod_modell/bilder_messen.mjs
# Anlegen als ENTWURF (nur nach Trockenlauf, siehe Live-Plan)
LIVE=1 PLAN=<OUT>/plan.json LEDGER=<Pfad> LSPOD_EDITOR_URL=<https-Adresse> [ONLY=<handle,…>] [VARIANT_BUDGET=<Zahl>] node automation/pod_modell/pod_modell.mjs
# Rücknahme (nur Ledger-Produkte, die noch Entwurf, in keinem Kanal und mit Marker-Tag sind)
ZURUECK=1 LIVE=1 LEDGER=<Pfad> node automation/pod_modell/pod_modell.mjs
# Tests und Mutationsprobe
for t in glossar beschreibung plan tore charge bildmass anlegen pod_modell; do node automation/pod_modell/${t}_test.mjs; done
node automation/pod_modell/mutation.mjs
```

Exit: 0 ok, 1 Fehler, 2 Lauf-Grenze (Rest morgen), 3 Abweichung (Plan oder Zustand), 4 Tageslimit für neue Varianten, 5 Produkt gesperrt (Tor nicht bestanden).

CI: der Hauptlauf muss `automation/pod_modell/**` in `.github/workflows/luxestyle-automation-tests.yml` an ZWEI Stellen eintragen, unter `paths:` UND im `sparse-checkout` (Lehre vom 04.11.), dazu die Datei `dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen/` und `pod/v6/werkzeug/karte_fuer_editor.mjs` (Vertragstest, fehlt sie, wird er übersprungen).

## Was ein Plan festlegt

- **Titel:** Glossar, Muster «<deutscher Name> selbst gestalten». Marke, Handelsname («Staple», «Heavy Blend») und Modellnummer fallen weg; eine Behauptung im Titel («Bio», «Eco», «recycelt») muss in der Printful-Beschreibung stehen. Unbekannte Wörter blockieren das Anlegen (Tor `titel_uebersetzt`), es wird nie geraten. `TITEL_FEST` in `glossar.mjs` hat Vorrang (5 Modelle).
- **Handle:** `<slug>-selbst-gestalten`, nur a-z 0-9 und Bindestrich, höchstens 50 Zeichen (Grenze der Google-Feed-ID), gekürzt an der Wortgrenze, nie auf einem Füllwort. Kollision: Modellnummer einsetzen, sonst kein Handle (nie ein vorhandener).
- **Beschreibung:** Lieferbox («voraussichtlich X bis Y Werktage laut Printful, Datum in der Kasse»), Editor-Container, dann die übersetzten Sätze mit Beleg, Eckdaten (Druckverfahren, Druckdatei in Pixeln und cm), Grössentabelle in cm, Rückgabehinweis im Wortlaut der Live-Seiten. Zoll, oz, lb werden umgerechnet oder weggelassen, Gedankenstriche gibt es nicht.
- **Optionen:** Farbe (deutsch) und Grösse (cm, ml, EU), bei Handyhüllen «Modell» und «Oberfläche». Über 100 Varianten: deterministische Auswahl der gängigsten Farben (Farbrang: reine Grundfarben vor veränderten wie «Schwarz meliert»), die Liste der ausgelassenen Farben mit Grund steht im Plan (`auswahl.farbenAusgelassen`).
- **SKU:** `<9100000 + Modellnummer>_<Printful-Variantennummer>`. Der Teil nach dem Unterstrich bestimmt `printful_sync` (`variantFromSku`).
- **Preis:** `../werkzeuge/preisformel.mjs` (Kurs 0.90, Gewinn nach MWST und Gebühr mindestens CHF 4.00 in JEDER Variante, Preise auf X.90). Ohne Printful-Kostenschätzung rechnet der Kostenboden mit Katalogpreis mal 1.26.
- **Bilder:** Produktbild und je Farbe ein Bild aus den Printful-Bildern, höchstens 20, ohne zu kleine (kürzere Seite unter 600 px). Variantenbild über den Alt-Text (die Lehre vom 04.11.: `mediaSrc` im Bulk-Update wird ignoriert).
- **Tags:** `wunschdesign`, `selbst-gestalten`, `printful_personalized_product`, `sg-fabrik` (Marker für die Rücknahme), `sg-<gruppe>`, `sg-modell-N`, `sg-klasse-…`, `sg-typ-…`, bei Übersee-Herkunft `pod-uebersee`, bei unsicherem Bestellweg `pod-bestellweg-manuell`.
- **Metafelder:** `luxe_sg.karte` (kompakte Prüfkarte, Schema `lspod-karte/1`, ohne Variantenliste, höchstens 10 240 Byte), `luxe_sg.modell`, `luxe_sg.klasse`, `luxe_sg.quelle`, dazu `mm-google-shopping.condition` und `custom_product`, `custom.lieferzeit`.

## Editor-Schnittstelle (Vertrag mit `pod/v6/`)

GEMESSEN am Quelltext von `pod/v6/lspod-designer-v6.js` (Kopf, Zeilen 11 bis 24) und `pod/v6/werkzeug/karte_fuer_editor.mjs`:

```
<div class="lspod-designer-v6" data-variant="<Shopify-Variante>"><script type="application/json" id="lspod-karte">{ Karte }</script></div>
<script src="<LSPOD_EDITOR_URL>" defer></script>
```

- **Eigene Klasse `lspod-designer-v6`, nicht `lspod-designer`.** Der live wirksame Editor v5 (`assets/lspod-designer-v5-safe.js`) sucht nur `lspod-designer`; mit dieser Klasse würde v5 ohne Bilder mounten. Das stand in der ersten Fassung der Fabrik falsch und wurde nach dem Lesen des v6-Kopfs korrigiert (Test und Mutant halten es fest).
- **Karte** = Ausgabe von `karteFuerEditor` (Schema 1: `printfulProductId`, `klasse`, `minDpi`, `platzierungen`, `druckdateien`, `hinweise`, bei mehreren Druckdateien `druckdateiGruppen` und `varianten`, bei mehreren Farben `farben`), aber `varianten` und `farben` nur für die gewählten Varianten. `plan_test.mjs` vergleicht sie bei 6 Modellen mit der Quelle des Editors (ausser `varianten`, `farben`, `shop`, Titel). Der englische Katalogtitel mit Fremdmarke («… | Gildan 18500») wird nicht eingebettet; statt `titelEn` steht der deutsche Titel als `titelDe`.
- **`shop.varianten`** (Shopify-Variantennummer zu Printful-Variante) kennt erst das Anlegen: im Plan steht der Platzhalter `"__SHOP_VARIANTEN__"`, `anlegen.mjs` trägt die Abbildung aus den frisch gelesenen Varianten ein (Schritt «Editor-Baustein»), `vergleiche()` prüft sie danach.
- **Grösse:** Metafeld-Karte höchstens 10 240 Byte (Vorgabe). Die Editor-Karte samt Abbildung höchstens 24 576 Byte (Setzung, `editorKartenMaxBytes`): GEMESSEN an 577 Modellen Median 3,2 KB, 90 % unter 6,7 KB, Poster 17 KB (30 Formate, je eine Druckdatei), Maximum 35,8 KB; über 24 KB sind 2 Modelle (1564, 3), über 10 KB bei der Metafeld-Karte 2.
- **Ungemessen:** ob der Editor v6 im echten Shop auf einem so angelegten Entwurf mountet. Dass Shopify ein Skript in der Produktbeschreibung behält, belegt der heutige Stand (`pod/live/README.md`: v5 steht in der Beschreibung), die Normalisierung des neu eingebetteten JSON ist ungemessen; `vergleiche()` liest nach dem Anlegen frisch und meldet jede Abweichung als Exit 3.

## Tore

Blocker (alle müssen «bestanden» sein, «ungeprüft» zählt nicht): `klasse` (FLACH, FLACH_MIT_HINWEIS, PANEL in Stufe 2; UNGEEIGNET nie), `modell_neu` (nicht in den 44 heutigen Produkten), `ch_rate` (Printful-Versandrate nach CH, «nur US» ist kein Ausschluss), `lieferangabe`, `varianten` (1 bis 100, mit Preis), `sku_eindeutig`, `option_namen`, `marge` (mindestens CHF 4.00 in jeder Variante, X.90), `bilder` (mindestens 3 lesbare, kürzere Seite 600 px, gemessen), `titel_uebersetzt`, `titel_belegt`, `handle_frei`, `masse_einheiten` (kein Zoll, oz, lb), `gedankenstrich`, `beschreibung_belegt`, `karte` (Grösse, bestellbare Fläche).
Hinweise (blockieren nicht, stehen in der Tabelle): `bestellweg`, `lieferherkunft`, `bildinhalt` (Fremdmarken auf Printful-Bildern: bleibt immer Sichtprüfung), `farben`, `kostenschaetzung`, `groessentabelle`, `uebersetzung_luecken`.

## Beispiele (12 Pläne, GEMESSEN am Trockenlauf 05.11.2026)

`beispiele/*.json` (ein Plan je Modell), `beispiele/tabelle.md`, `beispiele/chargen.json`, `beispiele/PLAN-HASH.txt`. **12 von 12 anlegbar**, Charge 1 (06.11.): 12 Produkte, 327 von 3 000 Varianten.

| Modell | Titel | Klasse | Varianten | Preis CHF | Netto min CHF | Tore |
|---|---|---|---|---|---|---|
| 760 | Unisex Eco T-Shirt selbst gestalten | FLACH | 21 | 32.90 bis 37.90 | 4.31 | 16 von 16 |
| 403 | Keramik-Tasse mit farbiger Innenseite selbst gestalten | FLACH | 11 | 26.90 bis 27.90 | 4.50 | 16 von 16 |
| 1 | Poster auf mattem Papier selbst gestalten | FLACH | 30 | 22.90 bis 38.90 | 4.02 | 16 von 16 |
| 140 | Strukturierte Cap mit geschlossener Rückseite selbst gestalten | FLACH_MIT_HINWEIS | 22 | 45.90 | 4.02 | 16 von 16 |
| 683 | Snap-Hülle für iPhone selbst gestalten | FLACH | 54 | 28.90 | 4.07 | 16 von 16 |
| 146 | Unisex Hoodie 271 g/m² selbst gestalten | FLACH | 99 | 46.90 bis 63.90 | 5.59 | 16 von 16 |
| 214 | Premium Kissen mit Allover-Druck selbst gestalten | PANEL (Stufe 2) | 5 | 41.90 bis 48.90 | 4.05 | 16 von 16 |
| 378 | Grosse Eco Tragetasche selbst gestalten | FLACH_MIT_HINWEIS | 2 | 39.90 | 4.72 | 16 von 16 |
| 616 | Dünne Leinwand selbst gestalten | FLACH | 13 | 33.90 bis 111.90 | 4.24 | 16 von 16 |
| 673 | Kiss-Cut holografische Aufkleber selbst gestalten | FLACH | 3 | 20.90 bis 21.90 | 4.25 | 16 von 16 |
| 711 | Sherpa-Decke selbst gestalten | FLACH | 2 | 61.90 bis 74.90 | 6.95 | 16 von 16 |
| 411 | Unisex Premium Sweatshirt selbst gestalten | FLACH | 65 | 50.90 bis 59.90 | 6.99 | 16 von 16 |

Hinweise der Beispiele: `kostenschaetzung` bei allen (Einkauf aus dem Katalogpreis mal 1.26, wo keine Schätzung vorliegt), `bestellweg` bei 140, 214, 378 (Aufträge bleiben bei Printful Entwurf, Tag `pod-bestellweg-manuell`), `groessentabelle` bei 760, 140, 214, 378, `uebersetzung_luecken` bei 683. Die Hoodie-Auswahl (146) hat 99 von höchstens 100 Varianten.

**Gegenproben** (`beispiele/gegenproben/`, alle erwartungsgemäss gesperrt): 505 Aufkleberbogen (nur 2 lesbare Bilder), 464 Hoodie 407 g/m² (keine CH-Rate, keine bestellbare Variante), 83 Kissen (steckt schon in einem heutigen Produkt, keine Übersetzungsdatei), 861 Kerze (keine bestellbare Variante, Wörter «Scented, Soy» nicht im Glossar), 574 Herrenschuh (Klasse UNGEEIGNET, Wörter «Slip-On, Shoes»).

## Hochrechnung auf alle 577 Modelle (GEMESSEN am Trockenlauf, `ALLE`, Stufen 1 und 2)

- 10 Modelle UNGEEIGNET, 567 gestaltbar: 437 Stufe 1 (289 FLACH, 148 FLACH_MIT_HINWEIS), 130 PANEL (Stufe 2).
- **119 mit harter Datensperre:** keine bestellbare Variante und damit keine Marge 74, keine CH-Rate 34, steckt schon in einem heutigen Produkt 44 (41 nur deshalb), Editor-Karte zu gross 3, Zoll/oz im Text 2 (Mehrfachgründe möglich).
- **448 ohne harte Sperre** (335 Stufe 1, 113 Stufe 2), zusammen 6 505 Varianten, also 3 Chargen-Tage zu je höchstens 3 000 (Rechnung).
- Davon haben 179 einen automatisch erzeugten Titel, **269 brauchen Glossar- oder `TITEL_FEST`-Ergänzungen** (häufigste Lücken: «kein Nomen erkannt» 52, «2.0» 15, Paper 10, with 9, Bikini 9, zweites Nomen «shirt» 8). Das ist die Hauptarbeit vor einer Massenanlage.
- Alle 448 brauchen noch eine Übersetzungsdatei (13 von 577 liegen vor) und eine Bildmessung (3 050 Adressen, 114 gemessen).
- 273 der 448 haben einen unsicheren Bestellweg (Tag `pod-bestellweg-manuell`: der Auftrag bleibt bei Printful Entwurf, bis jemand ihn bestätigt), 228 mindestens eine Variante mit Herkunft ausserhalb der EU (Zoll und Laufzeit nicht im Preis, Tag `pod-uebersee`).

## Prüfung

- **544 Prüfungen ohne Netz, alle bestanden:** glossar 59, beschreibung 66, plan 161, tore 88, charge 21, bildmass 18, anlegen 93, pod_modell 38. `anlegen_test` und `pod_modell_test` laufen die ganze Kette gegen die Attrappe (Anlegen, Idempotenz, Wiederaufnahme nach Netzfehler, Tageslimit, Budget, Lauf-Grenze, Rücknahme-Schutz, Abweichung eines eigenen Produkts); `plan_test` prüft jedes Testmodell auf alle Zahlenregeln.
- **Mutationsprobe:** `mutation.mjs` baut absichtliche Fehler in eine Kopie ein (92 Mutanten, GEMESSEN am 05.11.2026: 92 von 92 erkannt, 0 überlebt, 0 nicht anwendbar) und verlangt einen roten Test. Steht «?» in der Ausgabe, passt ein Muster nicht mehr zum Code.
- **Schema:** die GraphQL-Texte (productSet, metafieldsSet, productUpdate, productVariantAppendMedia, productDelete, productByIdentifier, productVariants) wurden mit `graphql_schema` (nur lesen) gegen das Admin-Schema 2026-01 geprüft.
- Die Attrappe verhält sich wie die Wegwerf-Probe vom 28.10. (`dropship/pod-auswahl/README.md`): Handle eindeutig, jede Variante nennt zu jeder Option einen vorhandenen Wert, Medien erst nach Verarbeitung READY, Variantenbild nur an READY-Medien.

## Offene Annahmen (alles ungemessen, bis es jemand misst)

1. **Editor v6 im echten Shop:** Mounten auf einem angelegten Entwurf, Normalisierung des eingebetteten JSON durch Shopify, Wirkung von `data-variant`. `LSPOD_EDITOR_URL` gibt es erst, wenn v6 als Theme-Datei liegt (Entscheid Besitzer/Editor-Strom); ohne https-Adresse verweigert `LIVE=1`.
2. **Versandrate:** eine Rate je Modell (die der gemessenen Variante) gilt für alle Varianten; ob grosse Grössen mehr kosten, ist ungemessen. Die Tage von Printful gelten als Werktage (Hypothese).
3. **Kostenschätzung:** ohne Schätzung steckt der Aufschlag 1.26 im Kostenboden (grösste gemessene Abweichung, `preisformel.mjs`); ein Preis kann dadurch zu hoch, nicht zu tief sein.
4. **Übersee-Zoll** ist in keinem Preis.
5. **Titel und Beschreibung** sind maschinell nach Glossar und Beleg erzeugt und von keinem Muttersprachler gelesen: vor LIVE die Tabelle lesen und Titel stichprobenweise prüfen.
6. **Bildinhalt:** das Tor `bildinhalt` bleibt immer ungeprüft; Printful-Bilder können Fremdmarken zeigen. Sichtprüfung im Entwurf, bevor ein Produkt veröffentlicht wird.
7. **SKU-Suche:** die Kollisionsprüfung nutzt `productVariants(query: "sku:…")`; echte Treffer mit Platzhalter (`sku:9100403_*`) sind nur in der Attrappe getestet.
8. **Variantenlimit:** Grundlast 6 500 ist eine Setzung (Limit rund 9 500 neue Varianten in 24 Stunden laut Auftrag; das Ledger der Auswahl-Läufe rechnet mit 9 000). Vor jedem Lauf die echte Zahl der letzten 24 Stunden einsetzen: im Trockenlauf als `VERBRAUCHT24H`, im LIVE als `VARIANT_BUDGET` (Limit minus Verbrauch). Das Verhalten am erreichten Limit ist ungemessen (Exit 4 und Aufräumen sind nur in der Attrappe belegt).
9. **Merchant Center:** jedes neue Produkt zählt Varianten gegen die Quote (150 000 je Bereich, das Schaufenster hält 90 000, `dropship/GMC-SCHAUFENSTER-2810.md`). 448 Produkte mit 6 505 Varianten passen, aber nur, wenn sie ins Schaufenster aufgenommen werden; das entscheidet der Besitzer beim Veröffentlichen.
10. **Rückgabetext:** wörtlich wie auf den Live-Seiten («Rückgabe aus Meinungsänderung ausgeschlossen»); die offene «30 Tage Rückgabe»-Frage des Besitzers ändert daran nichts.

## Live-Plan (Reihenfolge und Rücknahme)

Voraussetzungen, die nicht die Fabrik erfüllt: (a) Besitzer gibt das Anlegen als ENTWURF frei (Auftrag vom 05.11. «Selbst gestalten 100 % fertig»), (b) Editor v6 liegt als Theme-Datei, `LSPOD_EDITOR_URL` bekannt, (c) CI-Eintrag (siehe oben).

1. **Daten erneuern** (höchstens 72 Stunden alt, sonst verweigert `LIVE=1`): `werkzeuge/katalog_holen.mjs`, Versandraten, `kosten_schaetzung_alle.mjs`, `matrix.json` und `katalog_abgleich.json` frisch aus dem Shop. Nur lesen.
2. **Bilder messen:** `bilder_messen.mjs` für die Zielmodelle (150 ms Pause, höchstens 400 Adressen je Lauf, nur lesen).
3. **Trockenlauf** für die Zielmodelle, `tabelle.md` lesen: jedes Tor «bestanden», Titel und Hinweise ansehen, Plan-Hash notieren. Fehlende Glossarwörter und Übersetzungsdateien zuerst ergänzen (Tor `titel_uebersetzt`, `beschreibung_belegt`).
4. **Canary:** ein Produkt, am besten die Tasse 403 (11 Varianten): `LIVE=1 ONLY=keramik-tasse-farbige-innenseite-selbst-gestalten …`. Das Produkt ist Entwurf; im Admin die Vorschau öffnen, den Editor v6 laden lassen, eine Variante wechseln, Warenkorb-Eigenschaften ansehen. Rücklesen meldet die Abweichungen schon im Lauf.
5. **Charge 1:** die restlichen 11 Beispiele (zusammen 327 Varianten). **Folgechargen:** höchstens 3 000 Varianten je Lauf und Tag, davor `VERBRAUCHT24H` (Trockenlauf) und `VARIANT_BUDGET` (LIVE) setzen; bei Exit 2 am nächsten Tag mit demselben Ledger weitermachen (Wiederaufnahme überspringt fertige Produkte).
6. **Veröffentlichen** (Kanäle, Sammlung, Schaufenster) macht die Fabrik nie; das ist ein eigener Entscheid je Produkt nach der Sichtprüfung.

**Rücknahme:** `ZURUECK=1 LIVE=1 LEDGER=<Pfad> node automation/pod_modell/pod_modell.mjs`, optional mit `ONLY=`. Gelöscht wird nur ein Ledger-Produkt, dessen ID stimmt, das noch DRAFT ist, den Tag `sg-fabrik` trägt und in keinem Kanal steht; alles andere bleibt, mit Grund im Protokoll (Exit 5). Ein Wiederholen nach Abbruch ist sicher: vor jedem Anlegen wird der Handle gelesen, ein eigenes, abweichendes Produkt wird nie überschrieben.
