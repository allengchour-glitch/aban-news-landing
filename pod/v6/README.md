# Editor v6 «Selbst gestalten» mit echter Druckfläche (Entwurf 05.11.2026, NICHT live)

Stand: gebaut und getestet, **nichts im Shop, im Theme, bei Printful oder bei CJ geschrieben**. Der live wirksame Editor (`pod/live/lspod-designer-v5-safe.js`,
51 378 Byte, SHA-256 beginnt mit `70140421381326aff999`) ist **unverändert** (ein Test prüft Grösse und Prüfsumme). Die 38 bestehenden Produkte ändern sich nicht:
v6 sucht nur Container der Klasse `lspod-designer-v6` und fasst `.lspod-designer` nie an.

Kennzeichnung der Zahlen: GEMESSEN (in dieser Sitzung am 05.11.2026 gemessen), QUELLE (aus Dritt- oder Repo-Angabe, nicht selbst nachgemessen), Hypothese.

## Dateien

| Datei | Zweck |
|---|---|
| `lspod-designer-v6.js` | Der Editor, **unminifiziert** lesbar (2 083 Zeilen, 129 537 Byte; v5 hat 51 378 Byte in 5 Zeilen). Eine Datei, keine Abhängigkeiten. |
| `werkzeug/karte_fuer_editor.mjs` | Baut aus einer Printful-Katalogdatei (`katalog/<id>.json`) die **schlanke Karte** für den Editor (T-Shirt: 10,5 KB statt 196,7 KB der vollen Modellkarte, GEMESSEN). Kommandozeile und Modul. |
| `werkzeug/eigenschaften_lesen.mjs` | Liest die Warenkorb-Eigenschaften einer Bestellposition (v6 und v5). **Vorschlag** als Ersatz für `pickFiles()` in `automation/printful_sync.mjs`, siehe «Auftragsabwicklung». |
| `test/unit_test.mjs` | 149 Prüfungen ohne Browser (127 ohne Katalogordner): reine Funktionen, Karten, Kartenbau, Eigenschaften, v5 unverändert. |
| `test/editor_test.mjs` | 216 Prüfungen im Browser (Playwright/Chromium) in 23 Szenarien. |
| `test/mutationsprobe.mjs` | 32 absichtliche Fehler in einer Kopie des Editors; alle 32 werden von den Tests erkannt. |
| `test/mock.html`, `test/lib.mjs` | Mock-Produktseite (Varianten-Radios, Warenkorb-Formular, v5/v6-Container) und Hilfen (lokaler Server, Netzattrappen, PNG-Lesen). |
| `test/testdaten/<id>.karte.json` | Die fünf Test-Karten aus echten Katalogdaten (71 T-Shirt, 19 Tasse, 268 Poster, 206 Dad-Cap, 388 Allover-Hoodie), 36 KB. |
| `test/karten_erzeugen.mjs` | Erzeugt sie aus dem Katalogordner neu (`--pruefen` vergleicht nur). |
| `test/aufnahmen.mjs` | Bildschirmfotos (deviceScaleFactor 1) in einen Ordner; 18 Aufnahmen liegen in `scratchpad/sg/v6shots/` (siehe unten). |

Aufruf aller Tests (Node 22, Playwright global installiert):

```
cd pod/v6/test
V6_KATALOG=<Ordner mit katalog/<id>.json> node unit_test.mjs       # Katalog nur für den Vergleich der Test-Karten mit einem frischen Bau
V6_BILDCACHE=<Ordner mit Vorlagenbildern> node editor_test.mjs     # Bildcache nur für schönere Aufnahmen; ohne ihn gibt es Attrappen
node mutationsprobe.mjs                                            # Mutationsprobe (rund 6 Minuten)
```

## Einbindung

```html
<div class="lspod-designer-v6" data-variant="<Shopify-Variante>">
  <script type="application/json" id="lspod-karte">{ …schlanke Karte… }</script>
</div>
<script src="https://cdn.shopify.com/s/files/…/lspod-designer-v6.js?v=…" defer></script>
```

Alternativen für die Karte (erste gültige gewinnt): `data-karte="…JSON…"` am Container oder `data-karte-url="…"` (Adresse einer JSON-Datei, per `fetch` geholt; Plan B, falls Shopify
Skript-Tags mit JSON in Beschreibungen filtert, siehe «Nicht gemessen»).
Weitere Attribute, alle optional: `data-pf-variant` (Printful-Variante, wenn keine Zuordnung in der Karte steht), `data-max-px` (Obergrenze der Druckdatei in Pixeln, `0` = keine), und
für den Rückfall `data-img-front`, `data-img-back`, `data-ratio`, `data-ref`, `data-img-map` wie bei v5.

**Zusammenspiel mit v5 (GEMESSEN, Test «v5-und-v6-nebeneinander», mit dem echten v5 aus `pod/live` auf derselben Seite):**
v5 sucht `document.querySelectorAll('.lspod-designer')`, das ist ein Klassenvergleich auf ganze Wörter, `lspod-designer-v6` trifft ihn nicht. Beide Skripte haben eigene Guards
(`__lspodDesignerLoaded` bei v5, `__lspodDesignerV6Loaded` bei v6; v6 setzt den von v5 nie) und eigene versteckte Formularfelder (v5 `data-lspod="1"`, v6 `data-lspod6="1"`): keiner löscht
die Felder des anderen. Doppeltes Einbinden von v6 ergibt weiter genau einen Editor. **Änderung an v5 ist nicht nötig, v5 wurde nicht angefasst.** Auf einer Produktseite gehört nur EIN Editor
(sonst gäbe es zwei Sätze Eigenschaften im selben Formular).

Heutige Beschreibungen (QUELLE: Live-Seite `unisex-t-shirt-selbst-gestalten` vom 05.11.2026) tragen `<div class="lspod-designer" data-img-front=… data-variant=…>` und `<script src=…lspod-designer-v5.js defer>`. Dieses Skript bleibt laut `pod/live/README.md` wegen des Guards wirkungslos, weil das Theme `lspod-designer-v5-safe.js` zuerst lädt. Bei einem umgestellten Produkt wird der Block ersetzt (Live-Plan Schritt 5); bliebe das alte Skript-Tag stehen, wäre es harmlos, weil es keinen `.lspod-designer`-Container mehr findet.

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

* **Reiter je Platzierung** (Vorne, Vorne gross, Hinten, Ärmel, Etiketten; bei Allover die Schnittteile; eine einzelne Platzierung zeigt keine Reiter). Tastatur: Pfeile, Pos1, Ende. Eine Punktmarke zeigt, wo Ebenen liegen.
* **Bühne** im Seitenverhältnis der Druckfläche: T-Shirt-Vorderseite 0,75 (1800:2400), Dad-Cap 2,75, Tasse 2,57. Die Vorlage liegt darunter, die Druckfläche ist gestrichelt hervorgehoben und mit ihrer Grösse in cm beschriftet,
  ausserhalb liegt ein heller Vorhang («wird nicht gedruckt»). Ansicht «Auf Druckfläche zoomen» (Standard, 10 % Rand) oder «Ganze Vorlage zeigen».
* **Druckdatei in der echten Pixelgrösse des Printfiles**: T-Shirt vorne 1800×2400, vorne gross 2250×2700, Tasse 2700×1050 (je Variante die Gruppe der Variante), Dad-Cap 1650×600. Gemessen am IHDR des hochgeladenen PNG, und der Text liegt in der Datei
  dort, wo er auf der Bühne liegt (Abweichung unter 3 %).
  **Obergrenze `MAX_PIXEL` = 16 777 216 Pixel** (QUELLE: allgemein bekannte Grenze von Safari auf dem iPhone, hier nicht auf einem iPhone gemessen). Darüber wird gleichmässig verkleinert: Hoodie-Teile 6000×6000 werden 4096×4096, das Poster 9933×7016 wird
  auf unter 16,7 Mpx gebracht. Der Editor sagt es dem Kunden («Die Druckdatei wird auf … begrenzt») und `_pod_karte.px` trägt die tatsächliche Grösse. **Mit `data-max-px="0"` entsteht auch das Poster in 9933×7016 (69,7 Mpx), GEMESSEN in Chromium;**
  ob Printful eine kleinere Datei akzeptiert und selbst hochskaliert, ist Hypothese (nicht gemessen), siehe «Offene Punkte».
* **dpi**: Anzeige der Druckdatei («1800 × 2400 px · 150 dpi», Fläche «30,5 × 40,6 cm») und für ein gewähltes Foto die Auflösung auf dem Produkt (Pixel des Ausschnitts durch gedruckte Breite in Zoll, nie mehr als die Pixeldichte der Druckdatei).
  Warnung unter dem Mindest-dpi der Karte, nie gegen 1200 px gemessen: ein 300-px-Foto auf dem T-Shirt ergibt ca. 50 dpi und warnt (Minimum 75), auf dem Poster warnt schon ein 1000-px-Foto (ca. 60 dpi, Minimum 150), das nach der v5-Regel (420 px) genügte.
* **Sperren** (`conflicting_placements`): trägt eine Platzierung Ebenen, sind ihre Konfliktpartner gesperrt (gestrichelt, `aria-disabled`, Titel nennt den Grund); ein Tipp darauf erklärt es direkt unter den Reitern. Konflikte gelten in beide Richtungen,
  auch wenn der Katalog nur eine nennt. Nach Rückgängig/Wiederholen wird die aktive Platzierung neu geprüft.
* **Aufpreise** je Platzierung am Reiter («Aufpreis + CHF 6.10»), dazu eine Summe für alle Platzierungen mit Motiv. **Angezeigt, nicht abgerechnet**, siehe «Offene Punkte».
* **Hinweise** der Karte (Stickerei: wenige Farben, keine Verläufe/Fotos; Kappe; Rundum-Druck), mit Foto auf einer Stickerei-Fläche zusätzlich eine Warnung.
* **Masse nur in cm und mm**: Zahlenfelder X und Y in cm, Breite eines Fotos in cm, Schrifthöhe in mm, Drehung in Grad, Deckkraft in %. Kein Zoll irgendwo in der Oberfläche (Test sucht nach «Zoll», «inch», ″ und Anführungszeichen hinter Zahlen).
  Ohne belastbare dpi (Strick, v5-Modus) gelten Prozentfelder wie bei v5. Englische Ausgabe mit Dezimalpunkt.
* **Aus v5 übernommen**: Text (5 Schriften, Farben, fett/kursiv, Ausrichtung, Abstand, Kontur, Zeilenhöhe), Sticker (Index und Rückfall unverändert), Fotos (Upload, Zuschneiden, Spiegeln, 90°, Freistellen, Rahmen, Filter), Ebenenliste, Rückgängig/Wiederholen
  (60 Schritte, Strg+Z/Y), Pfeiltasten, Ziehen/Skalieren/Drehen/Zwei-Finger-Geste mit Einrasten in der Mitte, Druck-Vorschau, Fehlerabsicherung (leerer Entwurf, leerer Text, Foto über 10 MB, Upload-Fehler, Warenkorb-Fehler: Meldung, Knopf wieder frei, kein Warenkorb-Aufruf).
  Cloudinary-Parameter (Cloud `dwyi6kkrl`, Preset `pigto8ba`), Sticker-Adressen und die Warenkorb-Adresse sind unverändert.
* **Zwei Verbesserungen gegen Fehler von v5, beide mit Test:** (1) nach einer Fotobearbeitung gilt die Ebene sofort als «lädt hoch» und die alte Adresse ist verworfen (v5 markierte erst nach dem Rechnen, die Kasse konnte in dieser Zeit den Stand vor der Bearbeitung nehmen);
  (2) fehlt die Adresse einer Fotoebene (Rückgängig vor dem Upload), rechnet die Kasse das Foto aus dem Original in voller Grösse nach, statt eine Vorschau zu nehmen. Neue Fotos und Sticker werden auf höchstens 90 % der Druckfläche eingepasst (sonst ragt ein quadratisches Foto über die niedrige Dad-Cap-Fläche).

## Warenkorb-Eigenschaften

| Schlüssel | Wert |
|---|---|
| `🖼️ Druckdatei (<Platzierungs-ID>)`, z. B. `(front)`, `(back)`, `(sleeve_left)`, `(embroidery_front_large)` | https-Adresse der Druckdatei bei Cloudinary, eine je Platzierung mit Motiv |
| `🎨 Design (<Platzierungs-ID>)` | Beschreibung für Menschen, z. B. `Text: "Hallo" · Sticker: heart-red` |
| `_pod_karte` (beginnt mit `_`, für den Kunden unsichtbar) | Kompaktes JSON, höchstens 255 Zeichen (Test mit vier Platzierungen) |

`_pod_karte` = `{"v":6,"s":1,"m":<Printful-Produkt>,"pv":<Printful-Variante|null>,"sv":"<Shopify-Variante>","pl":["front","back"],"dt":{"front":"default"},"px":["1800x2400","1800x2400"],"ap":6.1}`:
`dt` nennt den Dateityp des Printful-Auftrags nur dort, wo er von der ID abweicht (die Vorderseite heisst im Katalog `default`), `px` die tatsächliche Pixelgrösse (bei Verkleinerung durch die Obergrenze kleiner als das Printfile), `ap` den angezeigten Aufpreis in CHF.
Die Schlüssel sind immer deutsch, auch in der englischen Ausgabe (stabiler Vertrag für die Auftragsabwicklung). Im v5-Modus gelten die Schlüssel von v5 (`Vorne · 🖼️ Druckdatei` usw.) und es gibt kein `_pod_karte`.

### Auftragsabwicklung (VOR dem ersten v6-Produkt anpassen)

`automation/printful_sync.mjs` liest nur «vorne/hinten»: `pickFiles()` setzt `back`, wenn der Schlüssel «Hinten» oder «Back» enthält, **alles andere wird `front`** (Zeile 85–86). Mit den Schlüsseln von v6 würde eine Datei für `sleeve_left`
als Vorderseite gedruckt, `label_inside` ebenso (aus dem Code gelesen, nicht ausgeführt; kein Auftrag ausgelöst). `werkzeug/eigenschaften_lesen.mjs` liefert stattdessen `{platzierung, dateiTyp, url}` je Datei und meldet Unstimmigkeiten (http statt https, Datei ohne Eintrag in `_pod_karte`,
Platzierung ohne Datei, doppelte Platzierung). `platzierungenFuerDateien` müsste die Platzierung dann nicht mehr aus der Seite ableiten, sondern `dateiTyp` übernehmen und gegen die Dateiliste des Produkts (`lib/printful_platzierung.mjs`) prüfen. Das ist eine Änderung an Geld-Code (Aufträge kosten Geld) und wurde nicht gemacht; Test zuerst gegen eine Attrappe, wie bei `printful_sync_test.mjs`.

## Rückfall ohne Karte (v5-Modus)

Fehlt die Karte oder ist sie unbrauchbar (kein JSON, Schema ≠ 1, keine zeichenbare Platzierung, Adresse nicht ladbar), baut v6 aus den Attributen des Containers eine Karte, die sich wie v5 verhält: Vorne/Hinten, Leinwand 1200 × 1200·`data-ratio`,
Hintergrund je Variante aus `data-img-map`, Prozentfelder, keine Druckfläche, keine Aufpreise, v5-Schlüssel, kein `_pod_karte`. Die Meldung steht in der Konsole (`[lspod6] …`). GEMESSEN (Test «v5-gleichheit», das echte v5 und v6 im Rückfall auf je einer Seite, dieselben Eingaben):
gleiche Eigenschaftsschlüssel, gleiche Beschreibung, gleiche Variante und Menge, gleiche Pixelgrösse der Druckdatei (1200 × 1440). Auch drei beschädigte Karten (abgeschnittenes JSON, Schema 2, leer) landen im Rückfall ohne Seitenfehler.
Der Editor sieht dabei neuer aus als v5 (eigene Oberfläche), verhält sich aber gleich.

## Tests und Messungen

* `unit_test.mjs`: 149 Prüfungen bestanden (mit `V6_KATALOG`; 127 ohne). Aufpreise gegen `preisformel.mjs` (3 001 Werte), Zahlenformat gegen `schweizer_masse.mjs` (12 000 Werte), Pixelgrösse und Obergrenze, Sichtfenster (auch Fläche über dem Rand: Hoodie, oben −14),
  Karten prüfen (ungültige, Schema, verworfene Platzierungen, einseitige Konflikte, Mindest-dpi), Geometrie je Variante (Tasse, Poster), dpi, v5-Modus, Kartenbau, Eigenschaften lesen, v5 unverändert.
* `editor_test.mjs`: 216 Prüfungen bestanden. Fünf Modelle, Rechner 1440 und Handy 390; Bühne und Seitenverhältnis, Zahlenfelder in cm, Warenkorb mit echter Pixelgrösse und Inhalt der Datei, Platzierungen, Sperren, Aufpreise, Rückgängig über Platzierungen, dpi-Warnungen,
  Stickerei, Schnittteile, Obergrenze und 69,7-Mpx-Poster, Variantenwechsel (Tasse, Farbe), Ziehen/Skalieren/Tastatur, Fehlerfälle, Druck-Vorschau, Formularfelder, Mobil (kein seitliches Scrollen, Tippflächen mindestens 42 px für Schaltflächen und Reiter),
  Kontrast (16 Elemente mindestens 4,5:1, berechnet), Namen und Rollen, v5-Gleichheit, Rückfall, v5 und v6 nebeneinander, Englisch, Fotobearbeitung.
* **Mutationsprobe: 32 von 32 erkannt.** Der erste Lauf erkannte 26 von 32: fünf überlebende Mutanten (einseitige Konflikte, Bearbeitung ohne «lädt hoch»-Markierung, Rückgängig ohne Prüfung der aktiven Platzierung, interne Hinweistexte, Foto-Einpassen) führten zu neuen Prüfungen, bei einem Mutanten stimmte das Suchmuster nicht (nach einer Bereinigung des Quelltextes behoben). Der zweite Lauf erkannte 31 von 32; der letzte Überlebende (interne Hinweistexte) war mit den vorhandenen Testkarten nicht erreichbar, eine Testkarte mit einer Einschränkung ohne Text macht ihn erkennbar (einzeln erneut gelaufen: erkannt).
* In den Szenarien wird auf Seitenfehler und Konsolenfehler geprüft (`pageerror`, `console.error`), es traten keine auf.

### Bildschirmfotos (deviceScaleFactor 1, Chromium)

`/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/v6shots/` (18 Dateien, erzeugt mit `node test/aufnahmen.mjs <Ordner>`):
01/02 T-Shirt Rechner Start, 03 Text gewählt mit cm-Feldern, 04 ganze Vorlage, 05 Rückseite mit Sperre und Aufpreisbox, 06 Ärmel, 07 Druck-Vorschau, 08 Auflösungswarnung, 09/10 T-Shirt Handy, 11/12 Tasse 11 oz und 15 oz (andere Druckdatei),
13 Poster, 14/15 Dad-Cap Rechner und Handy (Stickerhinweise, Foto), 16/17 Hoodie Rechner (Schnittteil Kapuze) und Handy, 18 v5-Modus. Die Vorlagenbilder kommen vom Printful-CDN (Cache), wo sie fehlen, steht eine Attrappe.

## Grenzen und NICHT gemessen

* Nur **Chromium** (headless, Version 153, Touch- und 390-px-Emulation). Nicht auf echtem iPhone/Safari, Firefox oder Android. Insbesondere die 16,7-Mpx-Grenze von iOS ist QUELLE, nicht gemessen; `ctx.filter` (Fotofilter) und `ctx.letterSpacing` (Textabstand in der Druckdatei) fehlen in älteren Safari-Versionen, wie schon bei v5.
* **Nicht auf der echten Produktseite** des Themes: Variantenwahl, Warenkorb-Formular, Beschreibung und Theme-Skripte sind in `mock.html` nachgebaut. Die Formularsuche ist wie bei v5 `document.querySelector('form[action*="/cart/add"]')`, das erste passende Formular.
  Ob Shopify ein `<script type="application/json">` in der Produktbeschreibung stehen lässt, ist ungeprüft (QUELLE: die Live-Seite vom 05.11. trägt in der Beschreibung ein `<script src=… defer>`, ein Inline-Skript mit JSON ist nicht belegt). Plan B: Karte als Datei hochladen und `data-karte-url` setzen.
* Cloudinary, Printful-CDN, Sticker-Index und `/cart/add.js` sind Attrappen; es wurde nie ein echter Upload gemacht und nie etwas in einen echten Warenkorb gelegt.
* Die **Variantenfarbe** der Vorlage ist eine Näherung (Farbfläche unter dem Schattenbild des Katalogs), kein Foto der Variante; Muster- oder Heather-Farben erscheinen als Einzelfarbe.
* **Rechte an den Vorlagenbildern** (`files.cdn.printful.com`, Einbetten auf der eigenen Seite): nicht geprüft.
* Stickerei: die einmalige Digitalisierungsgebühr (6.50 USD je Motiv laut Hinweis der Modellkarte) ist nicht modelliert. Etiketten-Platzierungen (innen/aussen, mit Aufpreis) werden angeboten, weil sie in der Karte stehen; ob der Besitzer sie anbieten will, ist offen (einfach: im Kartenbauer die Platzierungen mit `art: 'etikett'` weglassen).
* Allover (Hoodie): die Vorlage der Schnittteile ist eine Zeichnung, keine Vorschau am fertigen Kleidungsstück; es gibt keine Hilfe «Motiv auf alle Teile».
* Sprachen: Deutsch und Englisch wie v5 (Französisch fällt auf Deutsch).
* Stickerei und Kappen-Hinweise («klein halten») sind Erfahrungswerte der Modellkarte (`quelle: 'annahme'`), nicht von Printful gemessen.

## Offene Punkte (Entscheide des Besitzers)

1. **Aufpreis abrechnen.** Der Editor zeigt «Rückseite + CHF 6.10», aber der Preis der Shopify-Variante enthält ihn nicht, und im Warenkorb kommt er nicht automatisch dazu. Bevor ein Produkt mit Aufpreis-Platzierungen live geht, braucht es eine Regel:
   Preis der Variante anheben, ein Zusatzprodukt «Zusatzdruck» mit eigener Variante je Aufpreisstufe (der Editor könnte es als zweite Position in `/cart/add.js` legen, nicht gebaut) oder die Platzierungen mit Aufpreis nicht anbieten (Karte ohne sie bauen).
2. **printful_sync anpassen** (siehe oben), vor dem ersten v6-Produkt.
3. **Obergrenze der Druckdatei**: 16,7 Mpx für alle Geräte (Hoodie und Poster verkleinert) oder `data-max-px="0"` für Produkte, bei denen die volle Grösse wichtig ist (Rechner, nicht iPhone). Dazu eine Messung: nimmt Printful eine 4096×4096-Datei für ein 6000×6000-Teil an (Hypothese: ja, wird hochskaliert)?
4. **Etiketten** und **Platzierungen mit Aufpreis** überhaupt anbieten? (Kartenbauer: Filter.)
5. Vorschlag für `modellkarte.mjs`: `minDpi` und `farben` aus dem Katalog mitführen, damit der Kartenbauer nicht am Katalog vorbei rechnen muss.

## Live-Plan (ein Mensch, in dieser Reihenfolge, jeder Schritt mit Rücknahme)

Grundsatz: **nichts ins Theme.** v6 liegt als Shopify-Datei und wird je Produkt per Skript-Tag in der Beschreibung eingebunden. v5 bleibt im Theme unverändert wirksam, alle anderen Produkte bleiben, wie sie sind.

1. **Vorbedingungen** (Entscheide 1 bis 3 oben). Ohne angepasstes `printful_sync` kein Produkt umstellen, das mehr als Vorderseite/Rückseite anbietet; Tasse und Poster (nur `default`) wären ohne Anpassung am wenigsten riskant: `🖼️ Druckdatei (default)` enthält weder «Hinten» noch «Back», der alte Code läse sie als `front` und `lib/printful_platzierung.mjs` bildet eine einzige druckbare Platzierung auf `default` ab (aus dem Kommentar dieser Datei gelesen, nicht ausgeführt; zuerst mit der Attrappe prüfen).
2. **Dateien hochladen** (Shopify Files, Sicherung der Dateinamen im Journal): `lspod-designer-v6.js` unter einem Namen mit Version (`lspod-designer-v6-6.0.0.js`, Typ JavaScript). Die Adresse (CDN-URL mit `?v=`) lesen und notieren. Nicht ins Theme.
3. **Karten erzeugen:** je Produkt `node pod/v6/werkzeug/karte_fuer_editor.mjs <katalog/ID.json> <shop-varianten.json>`. `shop-varianten.json` ist `{"<Shopify-Variante>": <Printful-Variante>}`; die Printful-Variante steht am Ende der SKU (`/_(\d+)\s*$/`, wie `variantFromSku` in `printful_sync.mjs`; Hypothese: das ist die Katalog-Variante der Karte, vor dem Einsatz an einem Produkt gegen `varianten[]` der Karte prüfen). Ergebnis lesen und mit dem Katalog vergleichen.
4. **Pilot auf einem neuen Entwurfsprodukt** (Status DRAFT, nicht veröffentlicht, nicht in Kollektionen), Beschreibung = Container + JSON + Skript-Tag. Prüfen mit Playwright gegen die Produkt-Vorschau (normale Chrome-Kennung, Adresse ohne Query): (a) der Editor baut sich (`data-init-v6="1"`), (b) bleibt das Inline-JSON in der Beschreibung stehen? Falls nein: Plan B `data-karte-url` auf eine hochgeladene JSON-Datei,
   (c) 0 Konsolenfehler, Desktop und Handy, (d) Text setzen, «In den Warenkorb»: die Eigenschaften im Warenkorb (`/cart.js`) stimmen mit der Tabelle oben überein und die Druckdatei hat die erwartete Grösse (herunterladen und messen), (e) Testwarenkorb wieder leeren. **Keine Bestellung, keine Zahlung, kein Printful-Auftrag.**
5. **Umstellen je Produkt**, von einfach nach schwierig: Tasse, Poster, T-Shirt, Hoodie, Dad-Cap. Vor jedem Schreiben die alte Beschreibung (`descriptionHtml`) in eine Sicherungsdatei schreiben; den Block `<div class="lspod-designer" …>` samt `<script src=…lspod-designer-v5.js…>` durch den v6-Block ersetzen (der Rest der Beschreibung bleibt); danach frisch lesen und gegen die Sicherung vergleichen (nur dieser Block ändert sich) und denselben Browsertest wie im Pilot fahren, Rechner und Handy.
6. **Nachkontrolle:** erste echte Bestellung eines umgestellten Produkts: Eigenschaften der Position lesen (`dateienAusEigenschaften`), `printful_sync` im Trockenlauf (`DRY`), erst dann den Auftrag auslösen.
7. **Rücknahme:** je Produkt die gesicherte Beschreibung zurückschreiben (v5 übernimmt sofort wieder, es wurde nie verändert); die hochgeladene Datei kann liegen bleiben. Gesamt: alle umgestellten Produkte zurückschreiben, Datei löschen. Das Theme wurde nie angefasst, dort gibt es nichts zurückzunehmen.

Wirkung auf Verkäufe: unbekannt (Hypothese: echte Druckfläche, Aufpreis-Transparenz und Auflösungswarnung senken Rückfragen und Fehldrucke; nicht gemessen).
