# Editor v6 «Selbst gestalten» mit echter Druckfläche (Entwurf 05.11.2026, Korrekturrunde nach zwei Gegenlesern, NICHT live)

Stand: gebaut und getestet, **nichts im Shop, im Theme, bei Printful oder bei CJ geschrieben**. Der live wirksame Editor (`pod/live/lspod-designer-v5-safe.js`,
51 378 Byte, SHA-256 beginnt mit `70140421381326aff999`) ist **unverändert** (ein Test prüft Grösse und Prüfsumme). Die 38 bestehenden Produkte ändern sich nicht:
v6 sucht nur Container der Klasse `lspod-designer-v6` und fasst `.lspod-designer` nie an.

**Version 6.1.0** (vorher 6.0.0). Zwei unabhängige Gegenleser fanden einen Blocker im Plan (ein Shop-Produkt besteht oft aus mehreren Printful-Modellen) und mehrere wichtige Fehler; jeder Fund wurde mit der alten Fassung nachgestellt und ist behoben, begründet verworfen oder
als Besitzer-Entscheid offen (Abschnitt «Funde der Gegenleser»). Neu: **Kartenbündel** (eine Karte je Modell, gewählt nach der Variante), Sperre statt stiller Standardgeometrie, Variante wird beim Klick eingefroren, Rennen bei Foto-Bearbeitung behoben, Dateigrösse und Zeitlimit des Uploads,
kurze `_pod_karte`, Sprungziel `#lspod-start`, aktiver Reiter im Sichtfeld. Das Werkzeug `werkzeug/eigenschaften_lesen.mjs` ist gestrichen (der Parser der Bestellstrecke ist der Vertrag).

Kennzeichnung der Zahlen: GEMESSEN (in dieser Sitzung am 05.11.2026 gemessen), QUELLE (aus Dritt- oder Repo-Angabe, nicht selbst nachgemessen), Hypothese.

## Dateien

| Datei | Zweck |
|---|---|
| `lspod-designer-v6.js` | Der Editor, **unminifiziert** lesbar (2 370 Zeilen, 150 254 Byte; v5 hat 51 378 Byte in 5 Zeilen). Eine Datei, keine Abhängigkeiten. |
| `werkzeug/karte_fuer_editor.mjs` | Baut aus Printful-Katalogdateien (`katalog/<id>.json`) die **schlanke Karte** (ein Modell) oder das **Kartenbündel** (mehrere Modelle) für den Editor (T-Shirt-Modell 71: 10,5 KB statt 196,7 KB der vollen Modellkarte, GEMESSEN). Prüft die Zuordnung Shopify → Printful gegen den Katalog (bricht bei Unsinn ab), Filter `--ohne-aufpreis`, `--ohne-etiketten`, lehnt Rundum-Druck (PANEL) ohne `--panel` ab, warnt bei zu langer `_pod_karte`. Kommandozeile und Modul. |
| `test/unit_test.mjs` | 169 Prüfungen ohne Browser (197 mit Katalogordner): reine Funktionen, Karten, Bündel, Kartenbau mit den Test-Katalogen im Repo, Vertrag mit dem Parser der Bestellstrecke (`automation/lib/printful_bestellweg.mjs`, nur importiert), v5 unverändert. |
| `test/editor_test.mjs` | 294 Prüfungen im Browser (Playwright/Chromium) in 37 Szenarien. |
| `test/mutationsprobe.mjs` | 72 absichtliche Fehler (60 im Editor, 12 im Kartenbauer) in Kopien; 72 von 72 erkannt. Läuft parallel (`PARALLEL=3`, Vorgabe), eigener Temp-Ordner je Lauf (`mkdtemp`); `--muster` prüft nur, ob jedes Suchmuster genau einmal vorkommt. |
| `test/mock.html`, `test/lib.mjs` | Mock-Produktseite (Varianten-Radios, Warenkorb-Formular, v5/v6-Container, Theme-Knopf «Zuerst dein Design gestalten», Bündel, Plan B) und Hilfen (lokaler Server, Netzattrappen mit Verzögerung, Hängen, Grenzen für Bytes und Pixel, PNG-Lesen und -Erzeugen, auch mit Rauschen). |
| `test/testdaten/<id>.karte.json` | Die sieben Test-Karten aus echten Katalogdaten (71 T-Shirt, 586 und 456 als zweites und drittes Modell des T-Shirt-Produkts, 19 Tasse, 268 Poster, 206 Dad-Cap, 388 Allover-Hoodie). |
| `test/karten_erzeugen.mjs` | Erzeugt sie aus dem Katalogordner neu (`--pruefen` vergleicht nur). |
| `test/aufnahmen.mjs` | Bildschirmfotos (deviceScaleFactor 1) in einen Ordner; 18 Aufnahmen liegen in `scratchpad/sg/v6shots/` (siehe unten, Stand vor der Korrekturrunde). |

Aufruf aller Tests (Node 22, Playwright global installiert):

```
cd pod/v6/test
V6_KATALOG=<Ordner mit katalog/<id>.json> node unit_test.mjs       # Katalog nur für den Vergleich der Test-Karten mit einem frischen Bau
V6_BILDCACHE=<Ordner mit Vorlagenbildern> node editor_test.mjs     # Bildcache nur für schönere Aufnahmen; ohne ihn gibt es Attrappen (rund 45 s)
node mutationsprobe.mjs                                            # Mutationsprobe (rund 25 Minuten bei PARALLEL=3)
V6_DATEI=<alte Fassung> node editor_test.mjs                       # dieselben Tests gegen eine andere Fassung (so wurden die Funde nachgestellt)
```

## Einbindung

Ein Modell (z. B. Tasse, Dad-Cap): Einzelkarte. Mehrere Modelle (T-Shirt = 71 + 456 + 586, Hoodie = 145 + 821, Poster = 3 + 171 + 268 + 304, iPhone-Hülle = 181 + 601 + 798, Samsung-Hülle = 267 + 684 + 686; GEMESSEN durch beide Gegenleser an den SKU-Enden gegen den Katalog): **Kartenbündel**.

```html
<div class="lspod-designer-v6" data-variant="<Shopify-Variante>" data-karte-url="https://cdn.shopify.com/s/files/…/luxe-karte-<produkt>.json?v=…"></div>
<script src="https://cdn.shopify.com/s/files/…/lspod-designer-v6-6.1.0.js?v=…" defer></script>
```

**Die Karte als Datei (`data-karte-url`) ist der Standard**, nicht Plan B: Shopify entfernt in Liquid-Ausgaben mit `strip_html` Skript-Blöcke (QUELLE: Liquid-Quelltext, Gegenleser 2), also würden Feeds und Suchtexte, die die Beschreibung bereinigen, ein Inline-JSON verlieren oder mit Müll füllen (Google-, Pinterest- und Suchfeeds ungemessen), und der Rich-Text-Editor des Shopify-Admins zerstört ein Skript in der Beschreibung beim Speichern.
Eine JSON-Datei auf `cdn.shopify.com` liefert `access-control-allow-origin: *` (GEMESSEN 05.11. mit `curl -I -H "Origin: https://luxestyle.ch"` an `stk-index.json`, demselben Dateityp), das `fetch` des Editors geht also. Test: Szenario «buendel-tshirt» (Karte per Datei, kein Inline-JSON im Container).
Inline weiter möglich (erste gültige Karte gewinnt): `<script type="application/json" id="lspod-karte">…</script>` im Container oder `data-karte="…JSON…"`. **Die Beschreibung eines umgestellten Produkts nie im Rich-Text-Editor des Admins speichern**, nur per API oder im HTML-Modus.

Weitere Attribute, alle optional: `data-pf-variant` (Printful-Variante, wenn keine Zuordnung in der Karte steht; nur bei Einzelkarte), `data-max-px` (Obergrenze der Druckdatei in Pixeln; `0` heisst jetzt «nur die absolute Grenze von 25 Mpx», nicht mehr «keine»), `data-max-bytes` (Obergrenze der Dateigrösse vor dem Upload, Vorgabe 9 MB, `0` = nicht prüfen),
`data-upload-timeout` (Zeitlimit eines Uploads in ms, Vorgabe 90 000) und für den Rückfall `data-img-front`, `data-img-back`, `data-ratio`, `data-ref`, `data-img-map` wie bei v5.
Am Container setzt der Editor `data-init-v6="1"` (gilt auch im stillen Rückfall!) und `data-lspod6-modus="karte"` bzw. `"v5"`: **für die Prüfung «läuft mit Karte» zählt nur `data-lspod6-modus="karte"`** (oder `.lsp6[data-modus="karte"]`) plus `_pod_karte` im Warenkorb.

**Kartenbündel** = `{ "schema": 1, "modelle": { "71": <Modellkarte>, "586": <Modellkarte> }, "shop": { "varianten": { "<Shopify-Variante>": { "pv": <Printful-Variante>, "m": <Printful-Produkt> } } } }`, gebaut mit `node werkzeug/karte_fuer_editor.mjs katalog/71.json,katalog/586.json shop-varianten.json`.
Der Editor nimmt die Karte des Modells der gewählten Variante (`_pod_karte.m` und `.pv` gehören dann immer zusammen). Wechselt der Kunde die Ausführung und hat Motive auf einer Platzierung, die es im neuen Modell nicht gibt (z. B. «Vorderseite gross» nur bei Modell 71 und 456, nicht bei 586), bleibt die Platzierung als roter Reiter «hier nicht möglich» stehen,
ein dauerhafter Hinweis sagt, was zu tun ist, dort lässt sich nur entfernen, und **der Kauf ist gesperrt**, bis das Motiv entfernt ist oder eine passende Ausführung gewählt wird. Eine Variante ohne Eintrag in der Zuordnung sperrt den Kauf («Diese Ausführung ist im Editor noch nicht eingerichtet»); es wird nie still die Standardgeometrie genommen.
Dasselbe gilt für eine Einzelkarte mit mehreren Druckdateien (Tasse 11/15/20 oz, Poster 7 Formate) ohne Zuordnung und für eine Printful-Variante, die die Karte nicht kennt.

**Zusammenspiel mit v5 (GEMESSEN, Test «v5-und-v6-nebeneinander», mit dem echten v5 aus `pod/live` auf derselben Seite):**
v5 sucht `document.querySelectorAll('.lspod-designer')`, das ist ein Klassenvergleich auf ganze Wörter, `lspod-designer-v6` trifft ihn nicht. Beide Skripte haben eigene Guards
(`__lspodDesignerLoaded` bei v5, `__lspodDesignerV6Loaded` bei v6; v6 setzt den von v5 nie) und eigene versteckte Formularfelder (v5 `data-lspod="1"`, v6 `data-lspod6="1"`): keiner löscht
die Felder des anderen. Doppeltes Einbinden von v6 ergibt weiter genau einen Editor. **Änderung an v5 ist nicht nötig, v5 wurde nicht angefasst.** Auf einer Produktseite gehört nur EIN Editor
(sonst gäbe es zwei Sätze Eigenschaften im selben Formular).

**Theme-Knopf «Zuerst dein Design gestalten» (Fund des Gegenlesers 2, GEMESSEN auf der echten Produktseite):** das Theme (`blocks/buy-buttons.liquid`, Designzwang) versteckt den Kaufknopf und zeigt einen Link `href="#lspod-start"`; die Kennung `lspod-start` setzt es nur an `document.querySelector('.lspod-designer')`.
Ohne Gegenmassnahme bleibt der Klick bei einem v6-Produkt wirkungslos. v6 setzt die Kennung deshalb selbst an den Editor (`.lsp6`), wenn sie auf der Seite noch fehlt. Echte Produktseite `unisex-t-shirt-selbst-gestalten` (v6 nur im Browser eingesetzt, Netzdienste abgefangen): Klick springt, der Editor liegt danach 100 px unter dem Rand (vorher: Scroll bleibt 0).
Theme-Prüfungen auf `description contains 'lspod-designer'` (Designzwang, Rückgabetext, Laden von v5-safe) treffen auch `lspod-designer-v6` (Gegenleser 2).

Heutige Beschreibungen (QUELLE: Live-Seite `unisex-t-shirt-selbst-gestalten` vom 05.11.2026) tragen `<div class="lspod-designer" data-img-front=… data-variant=…>` und `<script src=…lspod-designer-v5.js defer>`. Dieses Skript bleibt laut `pod/live/README.md` wegen des Guards wirkungslos, weil das Theme `lspod-designer-v5-safe.js` zuerst lädt. Bei einem umgestellten Produkt wird der Block ersetzt (Live-Plan Schritt 6); bliebe das alte Skript-Tag stehen, wäre es harmlos, weil es keinen `.lspod-designer`-Container mehr findet.

## Schnittstelle zur Karte

Gelesen wird die Modellkarte Schema 1 (`dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs`), je Feld:

| Feld | Verwendung |
|---|---|
| `platzierungen[]` mit `id`, `dateiTyp`, `titelDe`/`titelEn`, `art`, `technik`, `printfile{breitePx,hoehePx,dpi}`, `vorlage{bildUrl,hintergrundUrl,hintergrundFarbe,vorlageBreite,vorlageHoehe,flaecheLinks,flaecheOben,flaecheBreite,flaecheHoehe}`, `aufpreisUsd`, `kollidiertMit` | Reiter, Bühne, Druckfläche, Pixelgrösse, Sperren, Aufpreise. Eine Platzierung ohne plausible Zahlen wird verworfen, der Rest bleibt. |
| `geometrien[]`, `druckdateien{}`, `druckdateiGruppen[]`, `varianten[].druckdateiGruppe` | Druckdatei und Vorlage **je Variante** (Tasse 11/15/20 oz, Poster 7 Formate). Ohne Zuordnung gilt der Standard. |
| `hinweise[]` | Einschränkungen (Stickerei, Kappe …) und Kundentexte, siehe unten. |
| `klasse` | `PANEL` zeigt den Hinweis «Rundum-Druck: Jedes Teil hat seine eigene Fläche». |

**Drei Felder, die `modellkarte.mjs` nicht liefert** (der Karten-Bauer ergänzt sie; Vorschlag: sie dort einbauen):

* `minDpi`: Mindestauflösung aus `katalog.templates.min_dpi` (GEMESSEN: T-Shirt 75, Poster 150, Dad-Cap 150). `modellkarte.mjs` wirft sie weg (`_intern` wird am Ende gelöscht). Fehlt sie, gilt 100.
* `aufpreisChf` je Platzierung aus `preisformel.aufpreisChf` (GEMESSEN: 5.95 USD = CHF 6.10, 2.49 = 2.60, 2.95 = 3.00, 0.99 = 1.00). Ohne das Feld rechnet der Editor selbst, mit denselben Setzungen (Kurs 0.90, MWST 8.1 %, Gebühr 3.4 %);
  ein Test vergleicht 3 001 Werte mit `preisformel.mjs` (0 Abweichungen).
* `shop.varianten` (Shopify-Variante → Printful-Variante) und `farben` (`{"#rrggbb": [Printful-Varianten]}`): damit zeigt die Vorlage die Farbe der gewählten Variante statt der Beispielfarbe des Katalogs.

Schlanke Karte: der Bauer lässt Grössentabellen, Beschreibung, Varianten (ausser bei mehreren Druckdatei-Gruppen), Kostenangaben und die internen Texte der Hinweise weg.
Die Kundentexte stehen im Editor (`HINWEIS_TEXTE`: Stickerei, gestrickt, Rundum-Einzeldatei, Kappe, Tasche, Rundumdruck); die Karte darf eigene mitbringen (`kundentext`, `kundentextEn`),
die Vorrang haben. Hinweise der Art `info` ohne Eintrag in der Tabelle und Einschränkungen ohne Text erscheinen nie (Test).

## Verhalten (alles GEMESSEN in Chromium, soweit nicht anders vermerkt)

* **Reiter je Platzierung** (Vorne, Vorne gross, Hinten, Ärmel, Etiketten; bei Allover die Schnittteile; eine einzelne Platzierung zeigt keine Reiter). Tastatur: Pfeile, Pos1, Ende. Eine Punktmarke zeigt, wo Ebenen liegen. **Der gewählte Reiter wird in die sichtbare Leiste gerückt** (vorher lag er bei 8 und mehr Reitern am Rechner ausserhalb, `offsetLeft` bezog sich auf `body`; jetzt echte Rechtecke und `position:relative`).
* **Bühne** im Seitenverhältnis der Druckfläche: T-Shirt-Vorderseite 0,75 (1800:2400), Dad-Cap 2,75, Tasse 2,57. Die Vorlage liegt darunter, die Druckfläche ist gestrichelt hervorgehoben und mit ihrer Grösse in cm beschriftet,
  ausserhalb liegt ein heller Vorhang («wird nicht gedruckt»). Ansicht «Auf Druckfläche zoomen» (Standard, 10 % Rand) oder «Ganze Vorlage zeigen». **Rundum-Druck (PANEL)** nennt die Masse «Druckbogen» (es sind die der Druckdatei, nicht die des Schnittteils, Fund F8); der Kartenbauer lehnt PANEL ohne `--panel` ab.
* **Druckdatei in der echten Pixelgrösse des Printfiles**: T-Shirt vorne 1800×2400, vorne gross 2250×2700, Tasse 2700×1050 (je Variante die Gruppe der Variante), Dad-Cap 1650×600. Gemessen am IHDR des hochgeladenen PNG, und der Text liegt in der Datei
  dort, wo er auf der Bühne liegt (Abweichung unter 3 %).
  **Obergrenze `MAX_PIXEL` = 16 777 216 Pixel** (QUELLE: allgemein bekannte Grenze von Safari auf dem iPhone, hier nicht auf einem iPhone gemessen). Darüber wird gleichmässig verkleinert: Hoodie-Teile 6000×6000 werden 4096×4096, das Poster 9933×7016 wird
  auf unter 16,7 Mpx gebracht. Der Editor sagt es dem Kunden («Die Druckdatei wird auf … begrenzt») und `_pod_karte.px` trägt die tatsächliche Grösse. **`data-max-px="0"` heisst nicht mehr «keine Grenze»:** es gilt die absolute Grenze von 25 Mpx (QUELLE: Cloudinary-Preisvergleich, Gegenleser 1: höchstens 25 Megapixel bei Free und Plus, 50 bei Advanced; nicht am Konto gemessen).
  Das Poster 9933×7016 (69,7 Mpx) wird so auf höchstens 25 Mpx verkleinert (GEMESSEN). Ob Printful eine kleinere Datei annimmt und selbst hochskaliert, ist Hypothese (nicht gemessen), siehe «Offene Punkte».
* **Dateigrösse und Cloudinary (Fund 2/F6, GEMESSEN mit einem Rausch-Foto, also einem ungünstigen Fall):** die Druckdatei als PNG ist bei Vollbild-Fotos gross: T-Shirt vorne 7,95 MB, Hoodie-Teil (4096²) 37,2 MB, Poster 49,3 MB (Foto 1500×1100, Massstab 2). QUELLE (Gegenleser 1): Cloudinary erlaubt Bilddateien bis 10 MB (Free), 20 MB (Plus), 40 MB (Advanced); der Plan des Kontos `dwyi6kkrl` ist ungemessen.
  Jetzt: Ist die Datei grösser als `data-max-bytes` (Vorgabe 9 MB), rechnet der Editor sie gleichmässig kleiner (Seitenverhältnis und Lage der Motive bleiben) und lädt erst dann hoch; lehnt Cloudinary sie trotzdem als zu gross ab (HTTP 413 oder Text mit «size/large/megapixel/dimension»), wird mit 0,7× wiederholt, höchstens vier Mal,
  danach steht «Die Druckdatei ist zu gross für den Upload. Nimm ein kleineres Foto oder weniger Motive.» (vorher: nur «konnte nicht erstellt werden», ohne Ausweg). Der Kunde sieht die tatsächliche Grösse («Die Druckdatei wurde auf … px verkleinert»), `_pod_karte.px` trägt sie. Kleinere Dateien kosten Druckschärfe nur dort, wo das Foto ohnehin weniger Pixel hat.
* **dpi**: Anzeige der Druckdatei («1800 × 2400 px · 150 dpi», Fläche «30,5 × 40,6 cm») und für ein gewähltes Foto die Auflösung auf dem Produkt (Pixel des Ausschnitts durch gedruckte Breite in Zoll, nie mehr als die Pixeldichte der Druckdatei).
  Warnung unter dem Mindest-dpi der Karte, nie gegen 1200 px gemessen: ein 300-px-Foto auf dem T-Shirt ergibt ca. 50 dpi und warnt (Minimum 75), auf dem Poster warnt schon ein 1000-px-Foto (ca. 60 dpi, Minimum 150), das nach der v5-Regel (420 px) genügte.
  Die Warnung bleibt nach Rückgängig/Wiederholen eines frischen Fotos erhalten (Originalgrösse im Zwischenspeicher je Ebene).
* **Sperren** (`conflicting_placements`): trägt eine Platzierung Ebenen, sind ihre Konfliktpartner gesperrt (gestrichelt, `aria-disabled`, Titel nennt den Grund); ein Tipp darauf erklärt es direkt unter den Reitern. Konflikte gelten in beide Richtungen,
  auch wenn der Katalog nur eine nennt. Nach Rückgängig/Wiederholen wird die aktive Platzierung neu geprüft.
* **Aufpreise** je Platzierung am Reiter («Aufpreis + CHF 6.10»), dazu eine Summe für alle Platzierungen mit Motiv. **Angezeigt, nicht abgerechnet**, siehe «Offene Punkte»; bis zur Entscheidung die Karten mit `--ohne-aufpreis` bauen.
* **Hinweise** der Karte (Stickerei: wenige Farben, keine Verläufe/Fotos; Kappe; Rundum-Druck), mit Foto auf einer Stickerei-Fläche zusätzlich eine Warnung. Der Stickerei-Hinweis verspricht keine Garnfarben-Wahl mehr (der Editor kann sie noch nicht anbieten, Fund 10).
* **Masse nur in cm und mm**: Zahlenfelder X und Y in cm, Breite eines Fotos in cm, Schrifthöhe in mm, Drehung in Grad, Deckkraft in %. Kein Zoll irgendwo in der Oberfläche (Test sucht nach «Zoll», «inch», ″ und Anführungszeichen hinter Zahlen).
  Ohne belastbare dpi (Strick, v5-Modus) gelten Prozentfelder wie bei v5. Englische Ausgabe mit Dezimalpunkt. Kein Gedankenstrich in einem Kundentext (Test).
* **Aus v5 übernommen**: Text (5 Schriften, Farben, fett/kursiv, Ausrichtung, Abstand, Kontur, Zeilenhöhe), Sticker (Index und Rückfall unverändert), Fotos (Upload, Zuschneiden, Spiegeln, 90°, Freistellen, Rahmen, Filter), Ebenenliste, Rückgängig/Wiederholen
  (60 Schritte, Strg+Z/Y), Pfeiltasten, Ziehen/Skalieren/Drehen/Zwei-Finger-Geste mit Einrasten in der Mitte, Druck-Vorschau, Fehlerabsicherung (leerer Entwurf, leerer Text, Foto über 10 MB, Upload-Fehler, Warenkorb-Fehler: Meldung, Knopf wieder frei, kein Warenkorb-Aufruf).
  Cloudinary-Parameter (Cloud `dwyi6kkrl`, Preset `pigto8ba`), Sticker-Adressen und die Warenkorb-Adresse sind unverändert.
* **Verbesserungen gegen Fehler von v5 und der ersten v6-Fassung, alle mit Test:** (1) nach einer Fotobearbeitung gilt die Ebene sofort als «lädt hoch» und die alte Adresse ist verworfen; **jede Bearbeitung hat eine Nummer, nur die letzte darf ihr Ergebnis eintragen** (zwei schnelle Bearbeitungen: ein langsamer älterer Upload überschrieb die neuere Datei, oder die Ebene galt zu früh als fertig; das gilt auch für den Upload des Originals);
  (2) fehlt die Adresse einer Fotoebene (Rückgängig vor dem Upload), rechnet die Kasse das Foto aus dem Original in voller Grösse nach, statt eine Vorschau zu nehmen; (3) **beim Klick auf «In den Warenkorb» werden Variante und Geometrie eingefroren**, die Eingaben im Editor sind bis zum Ende gesperrt (`inert`, in Safari erst ab 15.5, ungemessen), und vor dem Warenkorb-Aufruf wird verglichen: hat die Seite die Variante inzwischen gewechselt, bricht der Editor mit «Du hast die Variante gewechselt» ab, statt `id`, Datei und `_pod_karte` zu mischen;
  (4) Zeitlimit für jeden Upload (Vorgabe 90 s, danach Meldung und Knopf wieder frei), Leinwände werden nach Gebrauch freigegeben (`width = 0`; für iOS ungemessen); (5) nach einem Fehler und bei jeder Änderung werden alte Druckdatei-Adressen aus den versteckten Formularfeldern entfernt; (6) die Tippfläche der Griffe zum Skalieren und Löschen ist 44 px gross (sichtbar 30 px); (7) Texte mit Emoji werden nicht mitten im Zeichenpaar gekürzt.
  Neue Fotos und Sticker werden auf höchstens 90 % der Druckfläche eingepasst (sonst ragt ein quadratisches Foto über die niedrige Dad-Cap-Fläche).

## Warenkorb-Eigenschaften

| Schlüssel | Wert |
|---|---|
| `🖼️ Druckdatei (<Platzierungs-ID>)`, z. B. `(front)`, `(back)`, `(sleeve_left)`, `(embroidery_front_large)` | https-Adresse der Druckdatei bei Cloudinary, eine je Platzierung mit Motiv |
| `🎨 Design (<Platzierungs-ID>)` | Beschreibung für Menschen, z. B. `Text: "Hallo" · Sticker: heart-red` |
| `_pod_karte` (beginnt mit `_`, für den Kunden unsichtbar) | Kompaktes JSON, **höchstens 255 Zeichen** (längere Werte lehnt der Editor ab: «Zu viele Druckflächen auf einmal», vorher wird nichts hochgeladen) |

`_pod_karte` = `{"v":6,"m":<Printful-Produkt des gewählten Modells>,"pv":<Printful-Variante|null>,"sv":"<Shopify-Variante>","pl":["front","back"],"dt":{"front":"default"},"px":["1200x1600","1800x2400"],"ap":6.1}`:
`dt` nennt den Dateityp des Printful-Auftrags nur dort, wo er von der ID abweicht (die Vorderseite heisst im Katalog `default`), **`px` steht nur, wenn eine Druckdatei kleiner als das Printfile ist** (Obergrenze oder Verkleinerung vor dem Upload; dann für alle Platzierungen, parallel zu `pl`), `ap` den angezeigten Aufpreis in CHF.
Das Schemafeld `s` entfällt (die Bestellstrecke liest es nicht). Die Schlüssel sind immer deutsch, auch in der englischen Ausgabe (stabiler Vertrag für die Auftragsabwicklung). Im v5-Modus gelten die Schlüssel von v5 (`Vorne · 🖼️ Druckdatei` usw.) und es gibt kein `_pod_karte`.
**Länge (Fund 5/F7, GEMESSEN):** gerechnet mit 14-stelliger Shopify-Variante, 6-stelliger Printful-Variante und ALLEN Platzierungen belegt, ergibt `podKarteGroesstmoeglich` über alle 577 Katalogmodelle: bei den 191 Modellen der Klassen FLACH und FLACH_MIT_HINWEIS höchstens 252 Zeichen (Modell 77), keines über 255; über 255 liegen nur Modelle, die ohnehin nicht über v6 laufen (Rundum-Druck/PANEL, 74 Modelle, und die UNGEEIGNET-Klasse, z. B. Modell 1558 mit 25 Platzierungen: 610).
Ob Shopify bei 255 Zeichen abschneidet, ist QUELLE (zwei Dritt-Anleitungen: Schlüssel 100, Wert 255), nicht an Shopify gemessen; die Grenze wird vorsichtshalber eingehalten und bei Überschreitung abgelehnt (ein abgeschnittenes JSON würde den Dateityp verlieren).

### Auftragsabwicklung: der Vertrag ist der Parser der Bestellstrecke

`werkzeug/eigenschaften_lesen.mjs` ist **gestrichen** (beide Gegenleser: veralteter Doppelgänger; er akzeptierte Fremdhosts und ordnete Schlüssel mit unerwarteter ID still der Vorderseite zu). `automation/printful_sync.mjs` hat keine Funktion `pickFiles` mehr; `automation/lib/printful_bestellweg.mjs`
(`dateienAusEigenschaften`) liest die v6-Schlüssel, prüft die Hosts (`res.cloudinary.com`, `cdn.shopify.com`), meldet gemischte v5/v6-Schlüssel als harten Befund und übernimmt `dt` aus `_pod_karte`. **Die Tests lesen mit genau diesem Parser** (nur importiert, nichts dort geändert): Szenario «vertrag-bestellweg» liest die Eigenschaften, die der Editor wirklich in den Warenkorb schreibt (Vorderseite gross, Rückseite, Ärmel links: drei Dateien ohne Befund, Vorderseite = `front`/`default`), und `unit_test.mjs` prüft, dass der Parser weder `s` noch `px` braucht.
Ändert die Bestellstrecke den Vertrag, werden diese Tests rot. **Stickerei:** die Bestellstrecke verlangt für Stickerei-Platzierungen die Option «Garnfarben» (`⚙️ Option (thread_colors_…)`); der Editor schreibt sie noch nicht, jeder Stickerei-Auftrag bliebe ein Entwurf. **Darum gehört das Dad-Cap nicht in den Live-Plan, bis der Editor Garnfarben anbietet und die Bestellstrecke sie liest.**

## Rückfall ohne Karte (v5-Modus)

Fehlt die Karte oder ist sie unbrauchbar (kein JSON, Schema ≠ 1, keine zeichenbare Platzierung, Adresse nicht ladbar), baut v6 aus den Attributen des Containers eine Karte, die sich wie v5 verhält: Vorne/Hinten, Leinwand 1200 × 1200·`data-ratio`,
Hintergrund je Variante aus `data-img-map`, Prozentfelder, keine Druckfläche, keine Aufpreise, v5-Schlüssel, kein `_pod_karte`. Die Meldung steht in der Konsole (`[lspod6] …`). GEMESSEN (Test «v5-gleichheit», das echte v5 und v6 im Rückfall auf je einer Seite, dieselben Eingaben):
gleiche Eigenschaftsschlüssel, gleiche Beschreibung, gleiche Variante und Menge, gleiche Pixelgrösse der Druckdatei (1200 × 1440). Auch drei beschädigte Karten (abgeschnittenes JSON, Schema 2, leer) landen im Rückfall ohne Seitenfehler.
Der Editor sieht dabei neuer aus als v5 (eigene Oberfläche), verhält sich aber gleich.

## Tests und Messungen

* `unit_test.mjs`: 169 Prüfungen bestanden (197 mit `V6_KATALOG`). Aufpreise gegen `preisformel.mjs` (3 001 Werte), Zahlenformat gegen `schweizer_masse.mjs` (12 000 Werte), Pixelgrösse und Obergrenze, Sichtfenster (auch Fläche über dem Rand: Hoodie, oben −14),
  Karten prüfen (ungültige, Schema, verworfene Platzierungen, einseitige Konflikte, Mindest-dpi), **Kartenbündel** (gültig, ohne Modell, ohne Zuordnung, unbrauchbares Modell, Schlüssel gegen Produkt-ID, Bündel im Bündel, Konflikte je Modell), Geometrie je Variante (Tasse, Poster), dpi, v5-Modus,
  **Kartenbau mit den Test-Katalogen im Repo** (Printful-Variante eines anderen Modells und Tippfehler brechen ab, GID-Schlüssel, `ohneAufpreis`, `ohneEtiketten`, leere Karte bricht ab, PANEL bricht ab, Bündel aus zwei Katalogen, doppelte Modelle und Varianten, nicht verkaufte Modelle fallen heraus, Länge der `_pod_karte`), Vertrag mit dem Parser der Bestellstrecke, v5 unverändert.
* `editor_test.mjs`: 294 Prüfungen bestanden (37 Szenarien, rund 45 s). Fünf Modelle plus zwei weitere T-Shirt-Modelle, Rechner 1440 und Handy 390; Bühne und Seitenverhältnis, Zahlenfelder in cm, Warenkorb mit echter Pixelgrösse und Inhalt der Datei, Platzierungen, Sperren, Aufpreise, Rückgängig über Platzierungen, dpi-Warnungen,
  Stickerei, Schnittteile (Druckbogen), Obergrenze und 25-Mpx-Poster, Variantenwechsel (Tasse, Farbe), Ziehen/Skalieren/Tastatur, Fehlerfälle, Druck-Vorschau, Formularfelder, Mobil (kein seitliches Scrollen, Tippflächen mindestens 42 px für Schaltflächen und Reiter, 44 px für die Griffe),
  Kontrast (16 Elemente mindestens 4,5:1, berechnet), Namen und Rollen, v5-Gleichheit, Rückfall, v5 und v6 nebeneinander, Englisch, Fotobearbeitung. **Neu für die Funde:** Bündel mit Modellwechsel, fremder Reiter und Kaufsperre, Ausführung ohne Zuordnung, Variantenwechsel während des Uploads (2 Fälle),
  Foto-Rennen (3 Fälle), dpi nach Rückgängig, Cloudinary-Grenzen (Bytes vor dem Upload, Ablehnung durch den Server, unlösbar, Pixel), Zeitlimit (Druckdatei und Foto), aktiver Reiter im Sichtfeld (8, 25 Reiter; Rechner, Handy), Sprung des Theme-Knopfes, Griffe 44 px, `_pod_karte` höchstens 255 Zeichen (25 Platzierungen werden abgelehnt), Formularfelder nach einem Fehler, Vertrag mit der Bestellstrecke, Kleinigkeiten (Emoji, Kennung, Hinweistext, Gedankenstrich).
* **Funde nachgestellt gegen die ALTE Fassung** (`V6_DATEI=` v6.0.0): 33 von 260 Prüfungen der neuen Tests schlagen dort fehl (alle Szenarien zu den Funden ausser «vertrag-bestellweg», der auch dort grün ist: die alten Schlüssel passten schon). Messwerte der alten Fassung (GEMESSEN, Chromium): Karte 71 auf einem Produkt mit Variante des Modells 586 bietet «Vorderseite gross» weiter an und schreibt `{"m":71,"pv":15124,"pl":["front_large"]}`;
  Tasse ohne Zuordnung, 20 oz: Datei 2700×1050 (die von 11 oz) und `pv:null`; Wechsel auf 20 oz während des Uploads: Warenkorb `id` 1001 (11 oz), `_pod_karte` `sv` 1003, `pv` 16586, `px` 3071x1205, hochgeladene Datei 2700×1050; Dad-Cap mit 4 Stickplätzen: `_pod_karte` 270 Zeichen; zwei schnelle Foto-Bearbeitungen: Adresse und Zustand der älteren Datei;
  aktiver Reiter bei 8 Reitern am Rechner bei x = 229 px, die Leiste beginnt bei 695 px (`scrollLeft` 478).
* **Echte Produktseite** (GEMESSEN 05.11. abends, `unisex-t-shirt-selbst-gestalten`, v6 nur im Browser eingesetzt, Upload und Warenkorb abgefangen, nichts geschrieben): Editor baut sich 560 px breit im Modus «karte», kein seitliches Scrollen; der Theme-Knopf springt (Editor 100 px unter dem Rand); «In den Warenkorb» schickt `id` = die echte Variante `55777948008833` mit `🎨 Design (front)`, `🖼️ Druckdatei (front)` und `_pod_karte`. Ein Seitenfehler stammte aus dem Web-Pixel des Shops (`web-pixel-…js`, `substring`), ausgelöst von meiner leeren Attrappen-Antwort des Warenkorbs, nicht vom Editor.
* **Mutationsprobe: 72 von 72 erkannt** (72 Mutanten: 32 aus der ersten Runde, 29 neue für die Funde, 12 für den Kartenbauer). Der erste Lauf erkannte 68 von 73; fünf Überlebende führten zu stärkeren Prüfungen: der Reiter-Test wechselt jetzt über die Schnittstelle (ein Playwright-Klick rückt den Reiter selbst ins Bild und verdeckte den fehlenden Rücksprung), ein Test für eine Printful-Variante in zwei Katalogen, und zwei Paare von Mutanten, die sich gegenseitig deckten (Einfrieren der Variante: Geometrie und Wächter; Zurücksetzen der Druckdatei-Adressen: nach Fehler und bei Änderung), wurden zu je einem kombinierten Mutanten (zusammen 72). Die fünf wurden danach einzeln erneut gefahren und erkannt; ein vollständiger zweiter Lauf aller 72 steht aus.
* In den Szenarien wird auf Seitenfehler und Konsolenfehler geprüft (`pageerror`, `console.error`), es traten keine auf.

### Bildschirmfotos (deviceScaleFactor 1, Chromium)

`/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/v6shots2/` (20 Dateien, erzeugt mit `node test/aufnahmen.mjs <Ordner>` nach der Korrekturrunde; die alten 18 liegen in `v6shots/`):
01/02 T-Shirt Rechner Start, 03 Text gewählt mit cm-Feldern, 04 ganze Vorlage, 05 Rückseite mit Sperre und Aufpreisbox, 06 Ärmel, 07 Druck-Vorschau, 08 Auflösungswarnung, 09/10 T-Shirt Handy, 11/12 Tasse 11 oz und 15 oz (andere Druckdatei),
13 Poster, 14/15 Dad-Cap Rechner und Handy (Stickerhinweise, Foto), 16/17 Hoodie Rechner (Schnittteil Kapuze) und Handy, 18 v5-Modus, 19 Kartenbündel (Motiv auf einer Platzierung, die es bei der gewählten Ausführung nicht gibt: roter Reiter, Hinweis, Kauf gesperrt), 20 T-Shirt mit dem letzten von acht Reitern im Sichtfeld. Die Vorlagenbilder kommen vom Printful-CDN (Cache), wo sie fehlen, steht eine Attrappe.

## Grenzen und NICHT gemessen

* Nur **Chromium** (headless, Version 153, Touch- und 390-px-Emulation). Nicht auf echtem iPhone/Safari, Firefox oder Android. Insbesondere die 16,7-Mpx-Grenze von iOS ist QUELLE, nicht gemessen; ob das Freigeben der Leinwände (`width = 0`) auf dem iPhone genügt, ist ungemessen; `inert` gibt es in Safari erst ab 15.5; `ctx.filter` (Fotofilter) und `ctx.letterSpacing` (Textabstand in der Druckdatei) fehlen in älteren Safari-Versionen, wie schon bei v5.
* **Echte Produktseite nur einmal und nur lesend** (siehe oben, `unisex-t-shirt-selbst-gestalten` mit der Karte des Modells 71): nicht mit einer echten Zuordnung der Varianten, nicht mit einer Produkt-Vorschau eines umgestellten Produkts, nicht mit Handy-Emulation auf der echten Seite. Die Mock-Seite bildet Variantenwahl und Formular nach; die Formularsuche ist wie bei v5 `document.querySelector('form[action*="/cart/add"]')`.
  Ob Shopify ein `<script type="application/json">` in der Produktbeschreibung stehen lässt und ob Feeds es bereinigen, ist ungeprüft; darum ist die Karte als Datei (`data-karte-url`) der Standard.
* Cloudinary, Printful-CDN, Sticker-Index und `/cart/add.js` sind Attrappen; es wurde nie ein echter Upload gemacht und nie etwas in einen echten Warenkorb gelegt. **Plan, Dateigrössen- und Pixelgrenze des Cloudinary-Kontos `dwyi6kkrl` sind ungemessen** (QUELLE nur der Preisvergleich); die echte Grenze lässt sich mit einem Wegwerf-Upload einer 15-MB-Datei am Preset `pigto8ba` messen (Schreiben bei Cloudinary, deshalb nicht getan).
* Die **Variantenfarbe** der Vorlage ist eine Näherung (Farbfläche unter dem Schattenbild des Katalogs), kein Foto der Variante; Muster- oder Heather-Farben erscheinen als Einzelfarbe. Die Vorlagenbilder von Printful tragen englische Beschriftungen («Safe Print Area», «Placement on product»); das lässt sich nicht ändern.
* **Rechte an den Vorlagenbildern** (`files.cdn.printful.com`, Einbetten auf der eigenen Seite): nicht geprüft.
* Stickerei: die einmalige Digitalisierungsgebühr (6.50 USD je Motiv laut Hinweis der Modellkarte) ist nicht modelliert; Garnfarben kann der Editor nicht wählen (siehe oben).
* Allover (Hoodie, PANEL): die Vorlage der Schnittteile ist eine Zeichnung, keine Vorschau am fertigen Kleidungsstück; die Masse sind die des Druckbogens, nicht die des Teils; ein neues Motiv startet in der Mitte des Bogens (laut Gegenleser 2 im Screenshot auf der Naht zwischen Teilen). Darum ist PANEL aus dem Kartenbau und dem Live-Plan ausgeschlossen.
* Sprachen: Deutsch und Englisch wie v5 (Französisch fällt auf Deutsch).
* Stickerei und Kappen-Hinweise («klein halten») sind Erfahrungswerte der Modellkarte (`quelle: 'annahme'`), nicht von Printful gemessen.

## Funde der Gegenleser (05.11.2026 abends): Stand

Jeder Fund wurde selbst nachgestellt (gegen die alte Fassung, `V6_DATEI`), dann behoben oder begründet nicht behoben. G1 = Gegenleser 1, G2 = Gegenleser 2.

| Fund | Stand | Was geändert wurde oder warum nicht |
|---|---|---|
| **G1-1 / G2-F1 Blocker:** ein Shop-Produkt aus mehreren Printful-Modellen, eine Karte je Produkt | **behoben** | Kartenbündel (Karte je Modell, gewählt nach der Variante), fremde Platzierungen sperren den Kauf, `_pod_karte.m` gehört immer zur Variante; der Kartenbauer prüft jede Printful-Variante gegen den Katalog und bricht ab. Nachgestellt: alte Fassung bot «Vorderseite gross» bei Modell 586 an und schrieb `m:71, pv:15124`. |
| **G1-2 / G2-F6:** Druckdatei über der Cloudinary-Grenze | **behoben im Editor, Plan des Kontos offen** | Grössenprüfung vor dem Upload (`data-max-bytes`, 9 MB), Neu-Rechnen und Wiederholen bei Ablehnung, klare Meldung, `data-max-px=0` gedeckelt auf 25 Mpx. Nachgestellt (Rausch-Foto): T-Shirt 7,95 MB, Hoodie-Teil 37 MB, Poster 49 MB. Offen: Plan und echte Grenzen von `dwyi6kkrl` (Besitzer/Messung). |
| **G1-3:** aktiver Reiter am Rechner ausserhalb der Leiste | **behoben** | Echte Rechtecke statt `offsetLeft`, `position:relative`. Nachgestellt: x = 229 px bei Leiste ab 695 px, `scrollLeft` 478 (wie vom Gegenleser berichtet). |
| **G1-4 / G2-F3:** Rennen bei zwei schnellen Foto-Bearbeitungen | **behoben** | Nummer je Bearbeitung, nur die letzte schreibt; gilt auch für den Upload des Originals. Beide Fälle (alter Upload langsam, alter Upload schnell) nachgestellt und getestet. |
| **G1-5 / G2-F7:** `_pod_karte` über 255 Zeichen | **behoben** | `s` gestrichen, `px` nur bei Abweichung; Dad-Cap mit 4 Plätzen von 270 auf unter 255; Ablehnung vor dem Upload, wenn doch zu lang. Ob Shopify bei 255 abschneidet: QUELLE Dritte, nicht gemessen. |
| **G1-6:** dpi-Warnung weg nach Rückgängig/Wiederholen | **behoben** | Originalgrösse je Ebene im Zwischenspeicher. |
| **G1-7:** Pilot-Prüfung `data-init-v6` gilt auch im Rückfall | **behoben (Plan + Code)** | Neues `data-lspod6-modus`; Plan prüft `.lsp6[data-modus="karte"]` und `_pod_karte`. |
| **G1-8:** Kartenbauer kannte `ohneAufpreis` nicht | **behoben** | Optionen `ohneAufpreis`, `ohneEtiketten`, `panelErlauben`, mit Tests. |
| **G1-9 / G2-F13:** Gedankenstrich im Kundentext | **behoben** | `…`; Test sucht «—» in der Oberfläche. |
| **G1-10:** Dad-Cap braucht Garnfarben, Hinweis verspricht sie | **teilweise behoben** | Hinweistext ohne Versprechen; Dad-Cap aus dem Live-Plan genommen, bis der Editor Garnfarben anbietet (Entscheid/Arbeit offen). |
| **G1-11 / G2-F10:** `eigenschaften_lesen.mjs` ist veralteter Doppelgänger | **behoben** | Datei gestrichen; Tests lesen mit dem Parser der Bestellstrecke (Vertragstest). |
| **G1-12:** Leinwände nicht freigegeben, Upload ohne Zeitlimit, Variante ändert sich beim Bauen | **behoben** | Freigabe (`width = 0`, auf iOS ungemessen), Zeitlimit 90 s (Test mit 700 ms), Einfrieren der Variante. |
| **G1-13:** Griffe 30 px | **behoben** | Tippfläche 44 px (Pseudo-Element), Test mit `elementFromPoint`. |
| **G2-F2:** Theme-Knopf springt bei v6 nicht | **behoben** | `lspod-start` am Editor; auf der echten Seite gemessen (Sprung auf 100 px). |
| **G2-F4:** Variantenwechsel während Bau und Upload | **behoben** | Einfrieren + Vergleich vor dem Warenkorb; zwei Fälle getestet (mit 300 ms Verzug und im selben Augenblick). |
| **G2-F5:** ohne Zuordnung still die Standardgeometrie | **behoben** | Sperre «nicht eingerichtet» bei Einzelkarte mit mehreren Druckdateien, Bündel, unbekannter Printful-Variante. |
| **G2-F8:** PANEL zeigt die Masse des Druckbogens | **entschärft** | Beschriftung «Druckbogen»; Kartenbauer lehnt PANEL ohne `--panel` ab; PANEL nicht im Live-Plan. Startposition im Teil und echte Teilmasse: offen (Muster nötig). |
| **G2-F9:** Aufpreis wird angezeigt, aber nicht kassiert | **offen (Besitzer-Entscheid 1)** | Nicht im Editor lösbar. Entschärft: Karten mit `--ohne-aufpreis` bauen, dann gibt es nichts anzuzeigen und nichts zu vergessen. |
| **G2-F11:** alte Druckdatei-Adressen im Formular nach Fehler | **behoben** | Zurücksetzen im Fehlerfall und bei jeder Änderung; Eingaben während des Bauens gesperrt. |
| **G2-F12:** Inline-JSON in der Beschreibung (`strip_html`, Rich-Text-Editor) | **behoben im Plan** | Karte als Datei ist Standard (CORS gemessen), Hinweis zum Rich-Text-Editor. |
| **G2-F13:** Mutationsprobe mit festem Temp-Ordner; «rund 6 KB»; Emoji-Zerschneiden; englische Beschriftung der Printful-Vorlagen | **behoben bzw. dokumentiert** | `mkdtemp` + Parallelbetrieb; Kommentar «rund 11 KB»; `Array.from`; Beschriftung der Vorlagenbilder nicht änderbar (Grenzen). |
| G1: «Etiketten und Aufpreis anbieten?» (Entscheid 4) | **offen (Besitzer)** | Schalter vorhanden (`--ohne-etiketten`, `--ohne-aufpreis`). |

## Offene Punkte (Entscheide des Besitzers)

1. **Aufpreis abrechnen.** Der Editor zeigt «Rückseite + CHF 6.10», aber der Preis der Shopify-Variante enthält ihn nicht, und im Warenkorb kommt er nicht automatisch dazu. Bevor ein Produkt mit Aufpreis-Platzierungen live geht, braucht es eine Regel:
   Preis der Variante anheben, ein Zusatzprodukt «Zusatzdruck» mit eigener Variante je Aufpreisstufe (der Editor könnte es als zweite Position in `/cart/add.js` legen, nicht gebaut) oder die Platzierungen mit Aufpreis nicht anbieten (`--ohne-aufpreis`, **bis zur Entscheidung Pflicht für T-Shirt, Hoodie und Dad-Cap**).
2. **Cloudinary-Plan des Kontos `dwyi6kkrl`** (Free: 10 MB und 25 Mpx, QUELLE) klären; danach `data-max-bytes` setzen. Ohne Klärung bleibt die Vorgabe 9 MB, die zu Free passt.
3. **Obergrenze der Druckdatei**: 16,7 Mpx für alle Geräte oder `data-max-px="0"` (jetzt höchstens 25 Mpx) für Produkte, bei denen die volle Grösse wichtig ist (Rechner, nicht iPhone). Dazu eine Messung: nimmt Printful eine 4096×4096-Datei für ein 6000×6000-Teil oder eine 4000-px-Datei für ein 300-dpi-Poster an (Hypothese: ja, wird hochskaliert)?
4. **Etiketten** und **Platzierungen mit Aufpreis** überhaupt anbieten? (Kartenbauer: `--ohne-etiketten`, `--ohne-aufpreis`.)
5. **Dad-Cap**: Garnfarben im Editor (Eigenschaft `⚙️ Option (thread_colors_…)`) und Digitalisierungsgebühr; bis dahin nicht umstellen.
6. **Rundum-Druck (PANEL)**: Masse des Teils statt des Bogens und Startposition im Teil, Muster nötig; bis dahin nicht anbieten.
7. Vorschlag für `modellkarte.mjs`: `minDpi` und `farben` aus dem Katalog mitführen, damit der Kartenbauer nicht am Katalog vorbei rechnen muss.

## Live-Plan (ein Mensch, in dieser Reihenfolge, jeder Schritt mit Rücknahme)

Grundsatz: **nichts ins Theme.** v6 liegt als Shopify-Datei und wird je Produkt in der Beschreibung eingebunden. v5 bleibt im Theme unverändert wirksam, alle anderen Produkte bleiben, wie sie sind. Reihenfolge ist neu: erst Einmodell-Produkte, Mehrmodell-Produkte erst mit Bündel; Dad-Cap und Rundum-Druck nicht.

1. **Vorbedingungen.** (a) Entscheid 1 (Aufpreis): bis dahin alle Karten mit `--ohne-aufpreis --ohne-etiketten` bauen. (b) Cloudinary-Plan klären (Entscheid 2); `data-max-bytes` danach anpassen. (c) **Bestellstrecke** (`automation/lib/printful_bestellweg.mjs`, `printful_sync.mjs`, Freigabedatei) laut ihrer eigenen Dokumentation bereit machen und mit einer Attrappen-Bestellung aus echten v6-Eigenschaften im Trockenlauf prüfen (die Eigenschaften eines Pilot-Warenkorbs lesen, nie eine Bestellung auslösen).
   (d) Die Zuordnung Shopify-Variante → Printful-Variante aus dem SKU-Ende lesen (`/_(\d+)\s*$/`; GEMESSEN durch Gegenleser 1: das SKU-Ende ist die Printful-Variante bei 335 von 335 Varianten) und **nie ungeprüft übernehmen**: der Kartenbauer bricht ab, wenn eine Variante nicht zum Katalog der angegebenen Modelle gehört.
2. **Datei hochladen** (Shopify Files, Sicherung der Dateinamen im Journal): `lspod-designer-v6.js` unter einem Namen mit Version (`lspod-designer-v6-6.1.0.js`, Typ JavaScript). Die Adresse (CDN-URL mit `?v=`) lesen und notieren. Nicht ins Theme.
3. **Karten erzeugen und als Datei hochladen:** Einmodell-Produkt `node pod/v6/werkzeug/karte_fuer_editor.mjs <katalog/ID.json> <shop-varianten.json> --ohne-aufpreis --ohne-etiketten > luxe-karte-<produkt>.json`; Mehrmodell-Produkt mit Komma-Liste der Katalogdateien (`katalog/71.json,katalog/456.json,katalog/586.json`). `shop-varianten.json` ist `{"<Shopify-Variante>": <Printful-Variante>}` für JEDE verkaufte Variante.
   Die Warnungen des Kartenbauers (Fehlerausgabe) lesen. Die JSON-Datei als Shopify-Datei hochladen und die Adresse für `data-karte-url` notieren.
4. **Pilot auf einem neuen Entwurfsprodukt** (Status DRAFT, nicht veröffentlicht, nicht in Kollektionen) mit der **Tasse** (`keramik-tasse`, Einmodell, nur Standardplatzierung, drei Druckdateien nach Grösse, also mit Zuordnung). Beschreibung = Container mit `data-karte-url` + Skript-Tag. Prüfen mit Playwright gegen die Produkt-Vorschau (normale Chrome-Kennung, Adresse ohne Query):
   (a) `.lsp6[data-modus="karte"]` und `data-lspod6-modus="karte"` am Container (**nicht** `data-init-v6`, das gilt auch im stillen Rückfall); (b) Karte aus der Datei geladen, 0 Konsolenfehler, Desktop und Handy; (c) der Theme-Knopf «Zuerst dein Design gestalten» springt zum Editor (Editor wenige Hundert Pixel unter dem Fensterrand); (d) Text setzen, Variante wechseln, «In den Warenkorb» (Upload und Warenkorb **nicht abfangen**, aber nur auf dem Entwurf): die Eigenschaften in `/cart.js` stimmen mit der Tabelle oben überein, `_pod_karte` hat höchstens 255 Zeichen und `sv`/`pv`/`m` passen zur gewählten Variante, die Druckdatei hat die erwartete Grösse (herunterladen und messen);
   (e) Variantenwechsel während des Uploads bricht ab; (f) die echte Grenze des Cloudinary-Kontos messen: ein Foto mit viel Rauschen als Vollbild (Druckdatei über 15 MB) hochladen, bei Ablehnung muss der Editor selbst verkleinern und `_pod_karte.px` die kleinere Grösse nennen (Plan des Kontos dann eintragen); (g) Testwarenkorb wieder leeren. **Keine Bestellung, keine Zahlung, kein Printful-Auftrag.**
5. **Einmodell-Produkt `shirt-zum-selbstgestalten`** wie Schritt 4, dann live.
6. **Mehrmodell-Produkte (T-Shirt, Hoodie, Poster, iPhone-Hülle, Samsung-Hülle)** erst nach den Schritten 4 und 5: Bündel bauen, Pilot als Entwurf (zusätzlich: Wechsel zwischen den Modellen mit Motiv auf einer Platzierung, die es nur in einem Modell gibt; Variante ausserhalb der Zuordnung muss sperren), dann je Produkt umstellen. Vor jedem Schreiben die alte Beschreibung (`descriptionHtml`) in eine Sicherungsdatei schreiben;
   den Block `<div class="lspod-designer" …>` samt `<script src=…lspod-designer-v5.js…>` durch den v6-Block ersetzen (der Rest der Beschreibung bleibt); danach frisch lesen und gegen die Sicherung vergleichen (nur dieser Block ändert sich) und denselben Browsertest wie im Pilot fahren, Rechner und Handy. Die Beschreibung danach nie im Rich-Text-Editor des Admins speichern.
7. **Nicht umstellen:** Dad-Cap (Garnfarben fehlen), Rundum-Druck/PANEL (Masse des Teils fehlen), Produkte mit Aufpreis-Platzierungen (Entscheid 1).
8. **Nachkontrolle:** erste echte Bestellung eines umgestellten Produkts: Eigenschaften der Position mit `dateienAusEigenschaften` (Bestellstrecke) lesen, `printful_sync` im Trockenlauf (`DRY`), erst dann den Auftrag auslösen.
9. **Rücknahme:** je Produkt die gesicherte Beschreibung zurückschreiben (v5 übernimmt sofort wieder, es wurde nie verändert); die hochgeladenen Dateien (Skript, Karten) können liegen bleiben. Gesamt: alle umgestellten Produkte zurückschreiben, Dateien löschen. Das Theme wurde nie angefasst, dort gibt es nichts zurückzunehmen.

Wirkung auf Verkäufe: unbekannt (Hypothese: echte Druckfläche, Aufpreis-Transparenz und Auflösungswarnung senken Rückfragen und Fehldrucke; nicht gemessen).
