# Modell-Fabrik «Selbst gestalten» (Strom 2)

Stand 05.11.2026 abends, nach den Funden zweier unabhängiger Gegenleser. **Nichts live.** Die Fabrik hat nichts bei Shopify, im Theme, bei Printful (keine Aufträge, keine Entwürfe) oder bei CJ geschrieben. Gelesen wurde bei Shopify (Kategorien, Schema, Metafelder der heutigen Produkte), bei Printful (Preisauskünfte `POST /shipping/rates`, eine Anfrage je Modell) und auf printful.com (eine Seite). Der Schreibweg (`LIVE=1`) ist nur gegen eine Attrappe getestet, nie gegen den echten Shop.

Aus einer Printful-Modellkarte (`../werkzeuge/modellkarte.mjs`) wird der PLAN für ein Shopify-Produkt «… selbst gestalten» erzeugt. Nur mit `LIVE=1`, einem geprüften Plan, frischen Daten, Ledger und Editor-Adresse legt `pod_modell.mjs` das Produkt als ENTWURF an (DRAFT, in keinem Verkaufskanal). Veröffentlichen tut die Fabrik nie.

## Was die Gegenleser fanden und was daraus wurde

Beide Gegenleser: «freigabefähig mit Änderungen», kein Blocker für das Anlegen der Tasse als Entwurf. Jeder Fund wurde nachgestellt, dann behoben (Test und Mutant halten es fest) oder begründet verworfen.

| Fund | Stand | Was geändert wurde |
|---|---|---|
| Lieferzeit der Seite zu kurz, widerspricht dem Shop (G1-1, G2-W1) | behoben | Die Seite nennt nicht mehr die Versandtage der Rate. Es gilt die Angabe der 26 heutigen Produkte (7 bis 14 Werktage, Metafeld genau `{"ch":"7–14","tier":"pod","weg":"Druck auf Bestellung"}`); reichen Versandtage plus Fertigung (2 bis 5 Werktage) darüber hinaus, steht die berechnete, längere Spanne (Hinweis `lieferzeit_laenger`). Wortlaut der Box wie auf den Live-Seiten, ohne «laut Printful» und ohne «Datum in der Kasse». |
| Printful-Tage enthalten die Fertigung (G2-W1) | **verworfen** | Gemessen (printful.com/shipping, gelesen 05.11.2026): «The estimates don't include the time it takes to create your products», Fertigung «2–5 business days». Gegenleser 1 hat recht, Gegenleser 2 nicht. |
| Rate stammt von einer Variante ausserhalb der Auswahl (G2-W1, G2-K6) | behoben | Neues Blocker-Tor `rate_variante` und Werkzeug `versand_messen.mjs` (misst die Rate für die erste Farbe, grösste Grösse der Auswahl). Beim Nachmessen zeigte sich mehr: bei 25 Modellen, die die erste Fassung als anlegbar führte, kann Printful die gewählten Varianten gar nicht in die Schweiz liefern («ships to Australia, New Zealand only», Japan, Brasilien, USA nur). Sie sind jetzt gesperrt. |
| Waisen-Entwurf, wenn die Antwort auf `productSet` verloren geht (G1-2, G2-W2) | behoben | Ledger-Zeile `VERSUCH` vor dem Senden, Zeitlimit 120 s für `productSet` (Hoodie: 99 Varianten, 15 Bilder), nach einem Fehler wird der Handle gelesen und ein EIGENES Produkt (Tag, DRAFT, kein Kanal, nur Plan-SKUs) mit seiner ID als `BEGONNEN` eingetragen; scheitert auch das, übernimmt der nächste Lauf es über `VERSUCH`. Die Rücknahme löst `VERSUCH`/`FEHLER` ohne ID über den Handle auf (SKU-Präfix aus der Modellnummer des Ledgers) und meldet ein umbenanntes Produkt (`UMBENANNT`, Exit 5), statt es als «weg» zu verbuchen. |
| `bilder_messen.mjs` kommt nie über 400 Adressen hinaus (G1-3) | behoben | Erst filtern, dann begrenzen (`MAX_PRO_LAUF`, Vorgabe 400); schon Gemessenes zählt nicht, früher Gescheitertes kommt nach den nie Versuchten. Weiterleitungen werden nicht verfolgt (G1-10). |
| Eckdaten «Druckdatei» bei mehreren Druckdateien irreführend (G1-4, G2-W3) | behoben | Die Zeile entfällt, wenn die Grundfläche mehr als eine Druckdatei hat (Poster, Leinwand, Kissen, Decke, Aufkleber, Tasse). |
| Poster (in) neben dem aktiven Poster (cm); Grössenliste ungeordnet (G1-5, G2-K4) | behoben | `modell_neu` kennt jetzt Geschwister in der anderen Masseinheit (Modell 1 gegen das heutige 268, GEMESSEN: nur 1/268 und 2/304 betroffen). Grössen nach Fläche aufsteigend, Masse einheitlich «21 × 30 cm» mit Komma. **Poster 1 ist deshalb kein Beispiel mehr, sondern eine Gegenprobe.** |
| Google-Felder und Kategorie fehlen (G1-9, G2-W4) | behoben für 12 Produkttypen | `kategorien.mjs`: `google_product_category`, `gender`, `age_group` und die Shopify-Kategorie (`ProductSetInput.category`, im Schema 2026-01 gemessen). Nur belegte Zuordnungen; für alle anderen Typen bleibt das Feld leer und das Hinweis-Tor `kategorie` meldet es. Gewicht fehlt weiter (siehe «Vor dem Veröffentlichen»). |
| `LIVE` verlangt Bestand und Abgleich nicht; Alter nur für Katalog und Versand (G1-8, G2-W5) | behoben | `ABGLEICH` und `BESTAND` sind im LIVE Pflicht UND im geprüften Plan vermerkt; das Alter (72 h) wird für Katalog, Versand, Abgleich, Bestand, Kostenschätzung, Bildmessung und Versand je Variante geprüft, die Meldung nennt die alte Datei. |
| Auto-Titel teils kein gutes Deutsch (G2-W6) | teilweise | Regel gegen «gestrickte Strickjacke» (jetzt «Strickjacke», «Strickpullover», «Strickmütze»), feste Titel für 616 («Schlanke Leinwand») und 1411, neue Datei `titel.md` (englisch, deutsch, Herkunft, Auffälligkeit) zur Sichtung, Hinweis `titel_automatisch`. Die übrigen 457 Glossar-Titel (bleiben Hinweis, nicht Blocker) muss ein Mensch ansehen. |
| Sprachfehler, Superlative in den Übersetzungen (G1-6, G2-K1) | behoben | «geripptem Rundhalsausschnitt», «32 singles» weg, «Gewinn für den Tragekomfort», «ultimativ», «unvergleichlich», «perfekte Wahl» weg (belegte Teilsätze), «bei Printful» wurde «Originalbezeichnung». Das Tor `VERBOTEN` kennt jetzt Superlative. |
| Löcher in den Text-Toren (G1-7) | behoben | ASCII-Zoll, `°F`, `12 in`, Minuszeichen, Ziffernstrich, Querstrich, « - »; «Fußball» ist kein Fuss mehr. Das Tor `titel_belegt` zählt nur noch die Printful-BESCHREIBUNG als Beleg (der englische Titel enthält das Wort «Eco» ja immer), «Eco» ist eine geprüfte Behauptung. |
| Farben: «Kelly Green», «Helljeansblau» (G2-K2) | behoben | Zusammensetzung («Hellblau») nur mit einfachen Grundfarben, sonst «Helles Königsblau»; Kelly ist «Grün». |
| Meldung «keine bestellbare Variante» falsch (G2-K3) | behoben | Der Grund nennt jetzt «in keiner Region auf Lager» oder die nicht übersetzten Farben. «Custom» (Strickwaren) ist keine Farbe mehr. |
| «Printful» im Kundentext (G2-K5) | behoben | Lieferbox und Übersetzungen. |
| Live-Plan-Befehl unvollständig, Hash der 577 nicht reproduzierbar (G2-K7, G2-K8, G1-8) | behoben | Alle Eingaben stehen im Befehl; `beispiele/PLAN-HASH.txt` nennt Einstellung und Prüfsummen der Eingaben. Der alte Hash `d5d05f85…` ergab sich mit genau diesen Eingaben und dem alten Code wieder. |
| Temp-Ordner (G2-K9) | behoben, Altlast offen | Tests und Mutationsprobe legen ihre Ordner jetzt über `wegwerfOrdner()` an, die beim Ende des Prozesses (auch bei Absturz) verschwinden; die Mutationsprobe setzt `TMPDIR` in ihre Kopie. Die rund 4 330 alten Ordner (`fabrik-*`, `pm-*`, `bm-*`) im gemeinsamen `/tmp` hat die Sitzung nicht gelöscht (Sperre der Umgebung, nicht umgangen). |
| Zwei Läufe gleichzeitig (G1-10, G2-K10) | behoben | `<Ledger>.lock` (`sperre.mjs`): `LIVE` und `ZURUECK` verweigern einen zweiten Lauf; veraltet nach 6 Stunden oder wenn der Prozess nicht mehr lebt. |
| `editorKarte` ist eine Kopie (G2-K11) | behoben | `plan.mjs` ruft `karteFuerEditor` aus `pod/v6/werkzeug/karte_fuer_editor.mjs` und passt nur Titel, Varianten, Farben und `shop` an. Eine Quelle, keine Kopie; `EDITOR_HINWEIS_CODES` kommt aus dieser Quelle. |
| Grössentabelle der Leinwand wiederholt nur die Grösse (G2-K4) | behoben | Eine Tabelle, deren Zellen nur die Zahlen der Grössenbezeichnung wiederholen, entfällt. |
| Rückgabetext «ersetzen wir es selbstverständlich» ist eine Zusage (G1-10) | **offen, Entscheid Besitzer** | Er steht wörtlich so auf den Live-Seiten (mit Gedankenstrich), die Fabrik übernimmt ihn bis auf den Strich. |
| Hoodie und Tragetasche tragen `sg-typ-t-shirt` (G1-10) | verworfen | Der Typ kommt aus dem Printful-Katalog, der Tag wird nur gelesen (Filter), nichts hängt daran. |
| Aufkleber 673 kostet CHF 20.90 für 7,6 cm (G1-10) | offen, Marktfrage | Der Versand (10.39 USD) dominiert; Preisformel unverändert. |
| SEO-Titel der Cap ohne Marke, Länge 62 (G1-10) | offen, bei Canary 2 messen | Wie Shopify ihn zurückgibt, ist ungemessen (Canary: Tasse, danach Cap 140). |

## Dateien

Code in `automation/pod_modell/` (Node 22, `/opt/node22/bin/node`), 15 Dateien ohne Test (davon `testhilfe.mjs` und `mutation.mjs`) und 10 Testdateien:

| Datei | Aufgabe |
|---|---|
| `glossar.mjs` | Wörterbuch Englisch nach Deutsch: Titel (Genus, Beugung, Strickteile), Handle (höchstens 50 Zeichen), Farben (Komposition nur mit einfachen Grundfarben, Farbrang), Fremdmarken, Familien (Masseinheit) |
| `kategorien.mjs` | Google- und Shopify-Kategorie, `gender`, `age_group` aus dem englischen Handelsnamen (12 Typen, alles andere bleibt leer) |
| `beschreibung.mjs` | Beschreibung aus der Printful-Beschreibung: Belegpflicht je Satz, Grössentabelle in cm, Lieferbox (Wortlaut der Live-Seiten), Rückgabehinweis, Editor-Container |
| `plan.mjs` | `planeModell()`: Varianten-Auswahl (höchstens 100), Optionen, SKU, Preis, Lieferzeit, Bilder, Tags, Metafelder, Editor-Karte (über `karteFuerEditor`), Plan-Hash |
| `tore.mjs` | 17 Blocker-Tore und 12 Hinweis-Tore |
| `charge.mjs` | Chargenplan: höchstens 3 000 neue Varianten je Lauf, Tageslimit, Grundlast |
| `anlegen.mjs` | Schreibweg: VERSUCH, productSet (120 s), Wiederherstellung nach verlorener Antwort, Metafelder, Medien, Variantenbilder, Beschreibung, Rücklesen, Ledger, Rücknahme |
| `sperre.mjs` | Sperrdatei neben dem Ledger |
| `pod_modell.mjs` | Kommandozeile (Trockenlauf Vorgabe, `LIVE=1`, `ZURUECK=1`) |
| `versand_messen.mjs` | NUR LESEN: Versandrate (Preisauskunft) für eine Variante der Auswahl |
| `bilder_messen.mjs`, `bildmass.mjs` | Pixelgrösse von Bildadressen messen (nur lesen, Range-Anfragen, Host-Liste, keine Weiterleitungen) |
| `fake_shopify.mjs`, `testhilfe.mjs` | Attrappe des Shopify-GraphQL (auch «Antwort verloren») und Testwerkzeug |
| `*_test.mjs` (10 Dateien: glossar, beschreibung, plan, tore, charge, bildmass, anlegen, pod_modell, sperre, versand_messen), `mutation.mjs` | Tests und Mutationsprobe |

Geändert ausserhalb des Ordners: `automation/lib/pod_auswahl_gql.mjs` (dritter Parameter `{timeoutMs}` für lange Mutationen, rückwärtsverträglich) mit einem Test in `pod_auswahl_gql_test.mjs`.

Daten hier: `uebersetzungen/` (13 Dateien, jeder Satz `{de, beleg}`, der Beleg steht wörtlich im Printful-Text), `beispiele/` (11 Pläne, `tabelle.md`, `titel.md`, `chargen.json`, `PLAN-HASH.txt`, `gegenproben/` mit 6 Plänen).

## Befehle

Eingaben (aus Strom 1, alles Dateien): `KATALOG_DIR` (`<id>.json`), `VERSAND` (`versand_alle.json`), `SCHAETZUNG` (`schaetzung_alle.json`), `ABGLEICH` (`katalog_abgleich.json`), `BESTAND` (`matrix.json`), `BILDER` (`bilder_masse.json`), optional `VERSAND_VARIANTEN` (`{Printful-Variante: Versand USD}`).

```
# 1. Trockenlauf (Vorgabe, schreibt nur nach OUT: Plan je Modell, plan.json, tabelle.md, titel.md, chargen.json)
KATALOG_DIR=… VERSAND=… SCHAETZUNG=… ABGLEICH=… BESTAND=… BILDER=… STUFEN=1,2 START=2026-11-06 OUT=<Ordner> [MODELLE=760,403,… | alle] node automation/pod_modell/pod_modell.mjs
# 2. Rate für eine Variante der Auswahl messen (NUR LESEN; ändert nur die Versanddatei), danach 1. wiederholen
PLAENE=<OUT> VERSAND=<versand_alle.json> PRINTFUL_API_KEY=… PRINTFUL_STORE_ID=… node automation/pod_modell/versand_messen.mjs
# 3. Bildgrössen messen (nur lesen, nur files.cdn.printful.com, mehrmals ausführen, bis nichts mehr offen ist)
PLAENE=<OUT> OUT=<bilder_masse.json> node automation/pod_modell/bilder_messen.mjs
# 4. Anlegen als ENTWURF: DIESELBEN Eingaben wie im Trockenlauf (sonst weicht der Plan-Hash ab, Exit 3), dazu:
LIVE=1 PLAN=<OUT>/plan.json LEDGER=<Pfad> LSPOD_EDITOR_URL=<https-Adresse> [ONLY=<handle,…>] [VARIANT_BUDGET=<Zahl>] KATALOG_DIR=… VERSAND=… SCHAETZUNG=… ABGLEICH=… BESTAND=… BILDER=… STUFEN=1,2 [MODELLE=…] node automation/pod_modell/pod_modell.mjs
# Rücknahme (nur Ledger-Produkte, die noch Entwurf, in keinem Kanal und mit Marker-Tag sind)
ZURUECK=1 LIVE=1 LEDGER=<Pfad> [ONLY=<handle,…>] node automation/pod_modell/pod_modell.mjs
# Tests (KATALOG_DIR prüft die Übersetzungen zusätzlich gegen die echten Kataloge) und Mutationsprobe
for t in glossar beschreibung plan tore charge bildmass anlegen pod_modell sperre versand_messen; do node automation/pod_modell/${t}_test.mjs; done
node automation/pod_modell/mutation.mjs
```

Exit: 0 ok, 1 Fehler (auch: Sperre gehalten, Daten zu alt, Pflichteingabe fehlt), 2 Lauf-Grenze (Rest morgen), 3 Abweichung (Plan oder Zustand), 4 Tageslimit für neue Varianten, 5 Produkt gesperrt (Tor nicht bestanden) oder Rücknahme verweigert.

CI: der Hauptlauf muss `automation/pod_modell/**` in `.github/workflows/luxestyle-automation-tests.yml` an ZWEI Stellen eintragen, unter `paths:` UND im `sparse-checkout` (Lehre vom 04.11.), dazu `dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen/`, `dropship/selbst-gestalten-fertig-0511/werkzeuge/` und **`pod/v6/werkzeug/karte_fuer_editor.mjs`: seit dieser Fassung ein harter Import von `plan.mjs`, kein übersprungener Vertragstest mehr**. Fehlt die Datei, bricht `plan.mjs` beim Laden ab.

## Was ein Plan festlegt

- **Titel:** Glossar, Muster «<deutscher Name> selbst gestalten». Marke, Handelsname («Staple», «Heavy Blend») und Modellnummer fallen weg. Eine Behauptung im Titel («Bio», «Eco», «recycelt») muss in der Printful-BESCHREIBUNG stehen (nicht im englischen Titel). Unbekannte Wörter blockieren das Anlegen (Tor `titel_uebersetzt`), es wird nie geraten. `TITEL_FEST` in `glossar.mjs` hat Vorrang (7 Modelle); alle anderen Titel sind Glossar-Titel und stehen in `titel.md` zur Sichtung (Hinweis `titel_automatisch`).
- **Handle:** `<slug>-selbst-gestalten`, nur a-z 0-9 und Bindestrich, höchstens 50 Zeichen (Grenze der Google-Feed-ID), gekürzt an der Wortgrenze, nie auf einem Füllwort. Kollision: Modellnummer einsetzen, sonst kein Handle (nie ein vorhandener).
- **Beschreibung:** Lieferbox («Lieferzeit Schweiz: 7 bis 14 Werktage · Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein», Wortlaut der Live-Seiten ohne Gedankenstrich), Editor-Container, dann die übersetzten Sätze mit Beleg, Eckdaten (Druckverfahren; Druckdatei in Pixeln und cm nur bei EINER Druckdatei), Grössentabelle in cm (nicht, wenn sie nur die Grösse wiederholt), Rückgabehinweis im Wortlaut der Live-Seiten. Zoll, oz, lb werden umgerechnet oder weggelassen, Gedankenstriche gibt es nicht.
- **Lieferzeit:** `lieferzeitAus()` = Versandtage der Rate (Standard) plus Fertigung 2 bis 5 Werktage (QUELLE printful.com/shipping, gelesen 05.11.2026). Liegt das innerhalb von 7 bis 14 Werktagen (Angabe der 26 heutigen Produkte, GEMESSEN), gilt diese; sonst die berechnete Spanne, untere Grenze mindestens 7 (z. B. Versand 14 bis 16 → «16 bis 21»). Ob die Tage von Printful Werktage sind, ist Hypothese.
- **Optionen:** Farbe (deutsch) und Grösse (cm, ml, EU, einheitlich «21 × 30 cm»), bei Handyhüllen «Modell» und «Oberfläche». Grössen nach Fläche aufsteigend, wenn alle eine Fläche haben, sonst nach dem Katalog. Über 100 Varianten: deterministische Auswahl der gängigsten Farben (Farbrang: reine Grundfarben vor veränderten wie «Schwarz meliert»), die Liste der ausgelassenen Farben mit Grund steht im Plan (`auswahl.farbenAusgelassen`). «Custom» ist keine Farbe.
- **SKU:** `<9100000 + Modellnummer>_<Printful-Variantennummer>`. Der Teil nach dem Unterstrich bestimmt `printful_sync` (`variantFromSku`).
- **Preis:** `../werkzeuge/preisformel.mjs` (Kurs 0.90, Gewinn nach MWST und Gebühr mindestens CHF 4.00 in JEDER Variante, Preise auf X.90), gerechnet mit der Versandrate EINER Variante der Auswahl (grösste Grösse der ersten Farbe). Ohne Printful-Kostenschätzung rechnet der Kostenboden mit Katalogpreis mal 1.26. Die CHF 4.00 gelten für die gemessene Rate; ob andere Grössen mehr Versand kosten, zeigt der Hinweis `versand_je_groesse`.
- **Bilder:** Produktbild und je Farbe ein Bild aus den Printful-Bildern, höchstens 20, ohne zu kleine (kürzere Seite unter 600 px). Produkte ohne Farbwahl zeigen höchstens 6 Bilder: Varianten ohne eigenes Bild (Hinweis `variantenbild`) zeigen das erste. Variantenbild über den Alt-Text (die Lehre vom 04.11.: `mediaSrc` im Bulk-Update wird ignoriert).
- **Tags:** `wunschdesign`, `selbst-gestalten`, `printful_personalized_product`, `sg-fabrik` (Marker für die Rücknahme), `sg-<gruppe>`, `sg-modell-N`, `sg-klasse-…`, `sg-typ-…`, bei Übersee-Herkunft `pod-uebersee`, bei unsicherem Bestellweg `pod-bestellweg-manuell`.
- **Kategorie:** `category` im `productSet` (Shopify-Taxonomie, GEMESSEN: Mugs `hg-11-10-5-5`, Posters `hg-3-4-2-1`, Throw Pillows `hg-3-64`, Shopping Totes `lb-11` usw.) und `mm-google-shopping.google_product_category` im Wortlaut der heutigen Produkte; `gender`/`age_group` aus der Zielgruppe im Titel (Damen, Herren, Kinder, Jugend, Baby, Kleinkind, sonst unisex/adult).
- **Metafelder:** `luxe_sg.karte` (kompakte Prüfkarte, Schema `lspod-karte/1`, ohne Variantenliste, höchstens 10 240 Byte), `luxe_sg.modell`, `luxe_sg.klasse`, `luxe_sg.quelle`, `mm-google-shopping.condition`, `custom_product`, `google_product_category`, `gender`, `age_group`, `custom.lieferzeit` (nur `ch`, `tier`, `weg`: das Theme liest diese Schlüssel).

## Editor-Schnittstelle (Vertrag mit `pod/v6/`)

GEMESSEN am Quelltext von `pod/v6/lspod-designer-v6.js` (Kopf, Zeilen 11 bis 24) und `pod/v6/werkzeug/karte_fuer_editor.mjs`:

```
<div class="lspod-designer-v6" data-variant="<Shopify-Variante>"><script type="application/json" id="lspod-karte">{ Karte }</script></div>
<script src="<LSPOD_EDITOR_URL>" defer></script>
```

- **Eigene Klasse `lspod-designer-v6`, nicht `lspod-designer`.** Der live wirksame Editor v5 (`assets/lspod-designer-v5-safe.js`) sucht nur `lspod-designer`; mit dieser Klasse würde v5 ohne Bilder mounten.
- **Karte** = Ausgabe von `karteFuerEditor(katalog, {panelErlauben: true})` (die Funktion des Editor-Strom, keine Kopie), aber `varianten` und `farben` nur für die gewählten Varianten und der deutsche Titel als `titelDe` statt `titelEn` (kein englischer Katalogtitel mit Fremdmarke). `plan_test.mjs` vergleicht sie bei 6 Modellen mit dieser Quelle.
- **`shop.varianten`** (Shopify-Variantennummer zu Printful-Variante) kennt erst das Anlegen: im Plan steht der Platzhalter `"__SHOP_VARIANTEN__"`, `anlegen.mjs` trägt die Abbildung aus den frisch gelesenen Varianten ein (Schritt «Editor-Baustein»), `vergleiche()` prüft sie danach.
- **Grösse:** Metafeld-Karte höchstens 10 240 Byte (Vorgabe). Die Editor-Karte samt Abbildung höchstens 24 576 Byte (Setzung, `editorKartenMaxBytes`): GEMESSEN an 577 Modellen Median 3,2 KB, 90 % unter 6,7 KB, Poster 17 KB, Maximum 35,8 KB; über 24 KB sind 2 Modelle (1564, 3).
- **Ungemessen:** ob der Editor v6 im echten Shop auf einem so angelegten Entwurf mountet. Dass Shopify ein Skript in der Produktbeschreibung behält, belegt der heutige Stand (`pod/live/README.md`: v5 steht in der Beschreibung), die Normalisierung des neu eingebetteten JSON ist ungemessen; `vergleiche()` liest nach dem Anlegen frisch und meldet jede Abweichung als Exit 3. Zusätzlich lehnt der Editor eine Warenkorb-Eigenschaft `_pod_karte` über 255 Zeichen ab (`kartenWarnungen` im Editor-Werkzeug): die Fabrik prüft das nicht; bei Modellen mit vielen Platzierungen im Canary ansehen.

## Tore

Blocker (alle müssen «bestanden» sein, «ungeprüft» zählt nicht): `klasse` (FLACH, FLACH_MIT_HINWEIS, PANEL in Stufe 2; UNGEEIGNET nie), `modell_neu` (nicht in den heutigen Produkten, auch nicht in der anderen Masseinheit), `ch_rate`, `rate_variante` (Rate für eine Variante der Auswahl), `lieferangabe`, `varianten` (1 bis 100, mit Preis; die Meldung nennt den Grund), `sku_eindeutig`, `option_namen`, `marge` (mindestens CHF 4.00 in jeder Variante, X.90), `bilder` (mindestens 3 lesbare, kürzere Seite 600 px, gemessen), `titel_uebersetzt`, `titel_belegt` (nur die Printful-Beschreibung belegt), `handle_frei`, `masse_einheiten` (kein Zoll, oz, lb, °F), `gedankenstrich`, `beschreibung_belegt`, `karte` (Grösse, bestellbare Fläche).
Hinweise (blockieren nicht, stehen in der Tabelle): `bestellweg`, `lieferzeit_laenger`, `versand_je_groesse`, `variantenbild`, `kategorie`, `titel_automatisch`, `lieferherkunft`, `bildinhalt` (Fremdmarken auf Printful-Bildern: bleibt immer Sichtprüfung), `farben`, `kostenschaetzung`, `groessentabelle`, `uebersetzung_luecken`.

## Beispiele (11 Pläne, GEMESSEN am Trockenlauf 05.11.2026 abends)

`beispiele/*.json` (ein Plan je Modell), `beispiele/tabelle.md`, `beispiele/titel.md`, `beispiele/chargen.json`, `beispiele/PLAN-HASH.txt`. **11 von 11 anlegbar (alle 17 Blocker-Tore bestanden)**, Charge 1 (06.11.): 11 Produkte, 297 von 3 000 Varianten.

| Modell | Titel | Klasse | Varianten | Preis CHF | Netto min CHF |
|---|---|---|---|---|---|
| 760 | Unisex Eco T-Shirt selbst gestalten | FLACH | 21 | 32.90 bis 37.90 | 4.31 |
| 403 | Keramik-Tasse mit farbiger Innenseite selbst gestalten | FLACH | 11 | 26.90 bis 27.90 | 4.50 |
| 140 | Strukturierte Cap mit geschlossener Rückseite selbst gestalten | FLACH_MIT_HINWEIS | 22 | 45.90 | 4.02 |
| 683 | Snap-Hülle für iPhone selbst gestalten | FLACH | 54 | 28.90 | 4.07 |
| 146 | Unisex Hoodie 271 g/m² selbst gestalten | FLACH | 99 | 46.90 bis 63.90 | 5.59 |
| 214 | Premium Kissen mit Allover-Druck selbst gestalten | PANEL (Stufe 2) | 5 | 41.90 bis 48.90 | 4.05 |
| 378 | Grosse Eco Tragetasche selbst gestalten | FLACH_MIT_HINWEIS | 2 | 39.90 | 4.72 |
| 616 | Schlanke Leinwand selbst gestalten | FLACH | 13 | 33.90 bis 111.90 | 4.24 |
| 673 | Kiss-Cut holografische Aufkleber selbst gestalten | FLACH | 3 | 20.90 bis 21.90 | 4.25 |
| 711 | Sherpa-Decke selbst gestalten | FLACH | 2 | 61.90 bis 74.90 | 6.95 |
| 411 | Unisex Premium Sweatshirt selbst gestalten | FLACH | 65 | 50.90 bis 59.90 | 6.99 |

Preise und Margen blieben trotz neuer Versandraten (Hoodie 146 jetzt 11.39 statt 10.39 USD, gemessen für 5XL) gleich: der Kostenboden mit Aufschlag 1.26 und die X.90-Rundung fangen es auf. Alle 11 zeigen «7 bis 14 Werktage» (Versand 3 bis 9 Werktage). Hinweise der Beispiele: `kostenschaetzung` bei allen (Einkauf aus dem Katalogpreis mal 1.26), `titel_automatisch` bei 146, 378, 411, 673, 711, 760, `bestellweg` bei 140, 214, `versand_je_groesse` bei 214, 403, 616, 673, 711, `groessentabelle` bei 140, 214, 378, 760, `uebersetzung_luecken` bei 683 und 760.

**Gegenproben** (`beispiele/gegenproben/`, alle erwartungsgemäss gesperrt): **1 Poster (in)** (neu: steckt als Poster (cm) 268 schon im Shop; Bilder ungemessen), 83 Kissen (steckt schon im Shop, keine Übersetzungsdatei), 464 Hoodie 407 g/m² (keine bestellbare Variante, Rate fremd), 505 Aufkleberbogen (nur 2 lesbare Bilder), 574 Herrenschuh (Klasse UNGEEIGNET, Wörter «Slip-On, Shoes»), 861 Kerze (Farbwörter «Apple Harvest», «Christmas Warmth» fehlen im Glossar, Rate fremd).

## Hochrechnung auf alle 577 Modelle (GEMESSEN am Trockenlauf, alle Modelle, Stufen 1 und 2, Hash in `PLAN-HASH.txt`)

- 10 Modelle UNGEEIGNET, 567 gestaltbar: 437 Stufe 1 (289 FLACH, 148 FLACH_MIT_HINWEIS), 130 PANEL (Stufe 2).
- **104 mit harter Datensperre** (Mehrfachgründe möglich): steckt schon in einem heutigen Produkt oder in dessen anderer Masseinheit 46, keine CH-Rate 30 (die Rate der Variante ist «ships to … only» oder fehlt), Rate nur für eine fremde Variante 26 (bei 25 davon kann Printful die gewählten Varianten gar nicht liefern), keine Variante mit Preis 56 (Ursache: Farben nicht übersetzt 25, in keiner Region auf Lager 3, keine CH-Rate 28), Editor-Karte zu gross 3, Zoll/oz im Text 2. Die Zahl 74 «keine bestellbare Variante» der ersten Fassung überzählte: 71 davon waren bestellbar.
- **463 ohne harte Sperre** (350 Stufe 1, 113 Stufe 2), zusammen 6 573 Varianten, also 3 Chargen-Tage zu je höchstens 3 000 (Rechnung). Erste Fassung: 448 (mit 25 Modellen, die sich nicht in die Schweiz liefern lassen, und ohne die 15, die «Custom» und die Nachmessung freigab).
- Davon haben 191 einen automatisch erzeugten, vom Tor akzeptierten Titel (6 davon von Hand fest), **272 brauchen Glossar- oder `TITEL_FEST`-Ergänzungen**. Alle 457 Glossar-Titel gehören in `titel.md` gelesen.
- Alle 463 brauchen noch eine Übersetzungsdatei (13 von 577 liegen vor) und eine Bildmessung (2 596 Adressen der 463, 114 gemessen).
- 289 der 463 haben einen unsicheren Bestellweg (Tag `pod-bestellweg-manuell`: der Auftrag bleibt bei Printful Entwurf, bis jemand ihn bestätigt), 245 mindestens eine Variante von ausserhalb der EU (Tag `pod-uebersee`, Zoll und Einfuhr-MWST ungemessen).
- **Lieferzeit:** 275 der 463 zeigen «7 bis 14 Werktage» (Versand höchstens 9 Werktage), **188 eine berechnete, längere Spanne** (Versand 12 bis 25 Werktage: 11 bis 17 bei 41, 16 bis 21 bei 36, 8 bis 20 bei 65, 11 bis 21 bei 15, 12 bis 20 bei 16, 22 bis 30 bei 15; Hinweis `lieferzeit_laenger`). Das sind die Übersee-Modelle: ein Produkt mit «22 bis 30 Werktage» sollte der Besitzer vor dem Veröffentlichen bewusst entscheiden.
- 234 der 463 haben keine Kategorie (Hinweis `kategorie`): `kategorien.mjs` kennt nur 12 Typen.

## Prüfung

- **Ohne Netz, alle bestanden:** glossar 68, beschreibung 98 (111 mit `KATALOG_DIR`: dann werden alle 13 Übersetzungen gegen die echten Kataloge geprüft), plan 187, tore 130, charge 21, bildmass 24, anlegen 117, pod_modell 51, sperre 12, versand_messen 19 (zusammen 727 beziehungsweise 740 mit Katalogen), dazu `automation/lib/pod_auswahl_gql_test.mjs` 31. Erste Fassung: 544. `anlegen_test` und `pod_modell_test` laufen die ganze Kette gegen die Attrappe (Anlegen, Idempotenz, Wiederaufnahme nach Netzfehler, verlorene Antwort, Tageslimit, Budget, Lauf-Grenze, Rücknahme-Schutz, Sperre, Alter jeder Eingabe, Pflichteingaben).
- **Mutationsprobe:** `mutation.mjs` baut absichtliche Fehler in eine Kopie ein und verlangt einen roten Test (143 Mutanten, 10 Testdateien). Ergebnis siehe unten («Mutationsprobe, Ergebnis»). Steht «?» in der Ausgabe, passt ein Muster nicht mehr zum Code. `NUR=teil1|teil2` fährt nur Mutanten, deren Name einen dieser Teile enthält (schnelle Nachprobe nach einer Reparatur); die volle Probe läuft ohne `NUR`.
- **Schema:** die GraphQL-Texte (productSet mit `category`, metafieldsSet, productUpdate, productVariantAppendMedia, productDelete, productByIdentifier mit `category{id}`, `product(id:)`, productVariants) wurden gegen das Admin-Schema 2026-01 geprüft (Eingabefelder von `ProductSetInput`, `ProductVariantSetInput`, `InventoryItemInput` per Introspektion gelesen). Die Taxonomie-Kategorien wurden mit `taxonomy { categories(search:) }` gelesen.
- Die Attrappe verhält sich wie die Wegwerf-Probe vom 28.10. (`dropship/pod-auswahl/README.md`): Handle eindeutig, jede Variante nennt zu jeder Option einen vorhandenen Wert, Medien erst nach Verarbeitung READY, Variantenbild nur an READY-Medien; neu: eine Mutation, die ausgeführt wird, aber ihre Antwort verliert.

## Offene Annahmen (alles ungemessen, bis es jemand misst)

1. **Editor v6 im echten Shop:** Mounten auf einem angelegten Entwurf, Normalisierung des eingebetteten JSON durch Shopify, Wirkung von `data-variant`. `LSPOD_EDITOR_URL` gibt es erst, wenn v6 als Theme-Datei liegt; ohne https-Adresse verweigert `LIVE=1`.
2. **Versandrate:** eine Rate je Modell (grösste Grösse der ersten Farbe) gilt für alle Varianten; ob andere Grössen anders kosten, ist ungemessen (Hinweis `versand_je_groesse`, Abhilfe `VERSAND_VARIANTEN`). Die Tage von Printful gelten als Werktage (Hypothese).
3. **Kostenschätzung:** ohne Schätzung steckt der Aufschlag 1.26 im Kostenboden (grösste gemessene Abweichung, `preisformel.mjs`); ein Preis kann dadurch zu hoch, nicht zu tief sein. Die Schätzung liegt nur für die Varianten der 38 heutigen Produkte vor.
4. **Übersee-Zoll** ist in keinem Preis.
5. **Titel und Beschreibung** sind maschinell nach Glossar und Beleg erzeugt und von keinem Muttersprachler gelesen: vor LIVE `titel.md` und `tabelle.md` lesen, die Beispieltexte stichprobenweise.
6. **Bildinhalt:** das Tor `bildinhalt` bleibt immer ungeprüft; Printful-Bilder können Fremdmarken zeigen. Sichtprüfung im Entwurf, bevor ein Produkt veröffentlicht wird.
7. **SKU-Suche:** die Kollisionsprüfung nutzt `productVariants(query: "sku:9100403_*")`; mit Unterstrich und Stern **echt gegen den Shop gelesen** (beide Gegenleser, 05.11.2026): sie liefert Treffer, kein Typkonflikt, keine Kollision mit vorhandenen Präfixen.
8. **Variantenlimit:** Grundlast 6 500 ist eine Setzung (Limit rund 9 500 neue Varianten in 24 Stunden laut Auftrag; das Ledger der Auswahl-Läufe rechnet mit 9 000). Vor jedem Lauf die echte Zahl der letzten 24 Stunden einsetzen: im Trockenlauf als `VERBRAUCHT24H`, im LIVE als `VARIANT_BUDGET` (Limit minus Verbrauch). Das Verhalten am erreichten Limit ist ungemessen (Exit 4 und Aufräumen sind nur in der Attrappe belegt); ein halb angelegtes Produkt fängt jetzt die Wiederherstellung ab.
9. **Merchant Center:** jedes neue Produkt zählt Varianten gegen die Quote (150 000 je Bereich, das Schaufenster hält 90 000, `dropship/GMC-SCHAUFENSTER-2810.md`). 463 Produkte mit 6 573 Varianten passen, aber nur, wenn sie ins Schaufenster aufgenommen werden; das entscheidet der Besitzer beim Veröffentlichen.
10. **Rückgabetext:** wörtlich wie auf den Live-Seiten («Rückgabe aus Meinungsänderung ausgeschlossen», «ersetzen wir es selbstverständlich» ist eine Zusage); die offene «30 Tage Rückgabe»-Frage des Besitzers ändert daran nichts.
11. **`productSet` mit Zeitlimit 120 s:** ob 99 Varianten und 15 Bilder darin sicher fertig werden, ist ungemessen (der Canary hat nur 11 Varianten); bei Charge 1 den Hoodie 146 (99 Varianten) zuerst einzeln anlegen.
12. **Englische Wörter in Optionswerten:** die Tore prüfen Titel, Beschreibung und Farben, nicht jeden Grössen- oder Zusatzwert; bei einzelnen Modellen (z. B. 516) kann ein englisches Wort in einem Optionswert stehen bleiben. Beim Lesen von `tabelle.md` auf Optionswerte achten (nicht flächendeckend gemessen).

## Vor dem Veröffentlichen (die Fabrik veröffentlicht nie; das ist die Liste für den Besitzer oder die Sitzung, die es tut)

1. **Kategorie:** nur die 12 Typen in `kategorien.mjs` haben Google- und Shopify-Kategorie; sonst Hinweis `kategorie` abarbeiten, vorher kein Schaufenster. Die Google-Pfade stehen so auf den heutigen Produkten (GEMESSEN).
2. **Gewicht:** der Printful-Katalog liefert keins, die heutigen Produkte tragen eines (z. B. T-Shirt 3,6 oz). Ohne Gewicht arbeiten gewichtsabhängige Versandraten und das Merchant-Feld falsch; `ProductVariantSetInput.inventoryItem.measurement.weight` existiert im Schema 2026-01. Gewichte aus einer belegten Quelle eintragen, nicht raten.
3. **Lieferzeit** der Seite lesen (Hinweis `lieferzeit_laenger`), besonders bei 16 bis 30 Werktagen.
4. **Bilder** ansehen (Fremdmarken, Logos), **Titel** und **Beschreibung** lesen.
5. **Ausführungen ohne eigenes Bild** (Hinweis `variantenbild`) und Grössentabellen prüfen.
6. Kanäle, Sammlung und Schaufenster-Aufnahme je Produkt entscheiden.

## Live-Plan (Reihenfolge und Rücknahme)

Voraussetzungen, die nicht die Fabrik erfüllt: (a) Besitzer gibt das Anlegen als ENTWURF frei (Auftrag vom 05.11. «Selbst gestalten 100 % fertig»), (b) Editor v6 liegt als Theme-Datei, `LSPOD_EDITOR_URL` bekannt, (c) CI-Eintrag (siehe oben), (d) Titelsichtung (`titel.md`) für alle Modelle ausser den 7 festen, bevor eine Charge über die Beispiele hinausgeht.

1. **Daten erneuern** (jede Datei höchstens 72 Stunden alt, sonst verweigert `LIVE=1` und nennt die alte): `werkzeuge/katalog_holen.mjs`, Versandraten (`versand_alle.json`), `kosten_schaetzung_alle.mjs`, `matrix.json` und `katalog_abgleich.json` frisch aus dem Shop. Nur lesen. Danach Trockenlauf, `versand_messen.mjs` (Rate für eine Variante der Auswahl, mit `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`), Trockenlauf wieder.
2. **Bilder messen:** `bilder_messen.mjs` mit `PLAENE=<OUT>` so oft, bis die Ausgabe nichts mehr offen meldet (400 Adressen je Lauf), dann Trockenlauf mit `BILDER=`.
3. **Trockenlauf** für die Zielmodelle, `tabelle.md` und `titel.md` lesen: jedes Tor «bestanden», Hinweise ansehen, Plan-Hash notieren. Fehlende Glossarwörter und Übersetzungsdateien zuerst ergänzen.
4. **Canary 1:** die Tasse 403 (11 Varianten) mit EXAKT denselben Eingaben wie der Trockenlauf plus `ONLY=keramik-tasse-farbige-innenseite-selbst-gestalten`: `LIVE=1 PLAN=<OUT>/plan.json LEDGER=<Pfad> LSPOD_EDITOR_URL=<https-Adresse> KATALOG_DIR=… VERSAND=… SCHAETZUNG=… ABGLEICH=… BESTAND=… BILDER=… STUFEN=1,2 MODELLE=… ONLY=… node automation/pod_modell/pod_modell.mjs`. Das Produkt ist Entwurf; im Admin die Vorschau öffnen, den Editor v6 laden lassen, eine Variante wechseln, Warenkorb-Eigenschaften ansehen. Rücklesen meldet die Abweichungen schon im Lauf. **Canary 2:** die Cap 140 (langer Titel, Stickerei, SEO-Titel ohne Marke) und den Hoodie 146 (99 Varianten, Zeitlimit).
5. **Charge 1:** die übrigen Beispiele (zusammen 297 Varianten). **Folgechargen:** höchstens 3 000 Varianten je Lauf und Tag, davor `VERBRAUCHT24H` (Trockenlauf) und `VARIANT_BUDGET` (LIVE) setzen; bei Exit 2 am nächsten Tag mit demselben Ledger weitermachen (Wiederaufnahme überspringt fertige Produkte). Exit 1 mit «Sperre»: läuft kein anderer Lauf mehr, `<Ledger>.lock` von Hand löschen.
6. **Veröffentlichen** (Kanäle, Sammlung, Schaufenster) macht die Fabrik nie; Liste «Vor dem Veröffentlichen».

**Rücknahme:** `ZURUECK=1 LIVE=1 LEDGER=<Pfad> node automation/pod_modell/pod_modell.mjs`, optional mit `ONLY=`. Gelöscht wird nur ein Ledger-Produkt, dessen ID stimmt (bei `VERSUCH` ohne ID: dessen SKUs alle `<9100000 + Modellnummer>_…` heissen), das noch DRAFT ist, den Tag `sg-fabrik` trägt und in keinem Kanal steht; alles andere bleibt, mit Grund im Protokoll (Exit 5). Ein Wiederholen nach Abbruch ist sicher: vor jedem Anlegen wird der Handle gelesen, ein eigenes, abweichendes Produkt wird nie überschrieben, ein fremdes nie angefasst.

## Mutationsprobe, Ergebnis

(wird nach dem Lauf eingetragen)
