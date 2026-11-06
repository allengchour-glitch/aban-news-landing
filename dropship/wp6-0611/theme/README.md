# WP6 Teil C: Warenkorb-Miniatur aus `_vorschau` im Theme (06.11.2026)

**Stand: gebaut und getestet, NICHT eingespielt.** Kein Theme-Schreibzugriff, nichts in einen Warenkorb des Live-Shops gelegt. Eingespielt wird erst nach dem Ja des Besitzers (Schritt L6 im Bauplan, Abschnitt «Einspielen»).
Betroffen ist **eine** Theme-Datei: `snippets/cart-products.liquid` (MAIN-Theme 213013037447, «LuxeStyle – Schrift und Banner 02.11.2026»).

## Kurzfassung

* Liegt in einer Warenkorb-Zeile die Eigenschaft `_vorschau` mit einer gültigen Cloudinary-Adresse, zeigt die Miniatur der Zeile (Seite `/cart` und Schublade) dieses Bild statt des Variantenbildes. Jede andere Zeile, auch jede mit ungültiger Adresse, rendert **Byte für Byte wie heute** (Nachweis unten).
* Eigenschaften mit führendem Unterstrich (`_vorschau`, `_pod_karte`, und künftig `_Druckdatei (…)`) gibt das Theme **schon heute nicht aus**; die Zeile «🎨 Design (…)» bleibt sichtbar; die Druckdatei der alten Schreibweise erscheint **schon heute** als kleines Bild mit «Dein Entwurf ansehen», nie als lange Adresse. Für (b) ist deshalb **keine Änderung nötig**; das Paket belegt es mit Tests.
* Rückfall: lädt die Vorschau nicht (Adresse tot, Cloudinary gestört), tauscht das Bild sich selbst gegen das Variantenbild (`onerror`).

## Befund am Theme (GEMESSEN am Abbild vom 06.11.2026 14:55 UTC; Live-Prüfsumme gleich dem Abbild)

| Frage | Befund |
|---|---|
| Wer rendert Warenkorb-Zeilen? | Genau ein Snippet: `snippets/cart-products.liquid`. Die Seite `/cart` holt es über den Block `blocks/_cart-products.liquid` (Abschnitt `main-cart`, auch als `<template>` für den leeren Warenkorb), die Schublade über `snippets/header-actions.liquid` (zweimal: `force_empty` und normal). `templates/cart.lux-chlager.liquid` gibt nur JSON ohne Bilder aus. Keine Theme-Vorlagen für Kundenkonto oder Bestellstatus (`templates/customers/` fehlt). |
| Zeilenbild | `item.image \| image_url: width: 250 \| image_tag` (Variantenbild), Zeile 159, im Link `a.cart-items__media-container` mit `--ratio` (Block-Einstellung `adapt`, `portrait`, sonst 1). Zeilen ohne Bild haben eine leere Bildzelle. |
| Eigenschaften | Zeilen 221–254: eine Eigenschaft erscheint nur, wenn der Wert nicht leer ist **und der Name nicht mit `_` beginnt**. Enthält der Wert `res.cloudinary.com/` und `/image/upload/`, steht dort ein 72-px-Bild mit «Dein Entwurf ansehen» (seit 19.10.2026, «Spähtrupp KW-3») statt der Adresse. |
| Weitere Leser von `item.properties` | `snippets/cart-summary.liquid` (Designzwang, Zeilen 284–307): eine POD-Zeile ohne nichtleere Eigenschaft, deren Name «Design», «Druckdatei» oder «Print file» enthält, sperrt die Kasse. `_vorschau` und `_pod_karte` enthalten nichts davon (eine Zeile nur mit ihnen bleibt gesperrt, richtig); `_Druckdatei (front)` (Editor 6.2.1) enthält «Druckdatei» und genügt. Mit echtem Liquid für beide Schreibweisen geprüft («Vertragsprobe» im Test). |
| Live-Datei | `snippets/cart-products.liquid`: md5 `86a84bf9ff1862b97025bd1a841b8080`, 30 195 Byte, zuletzt geändert 02.11.2026 06:13 UTC. Abbild und Live gleich (Trockenlauf von `apply.mjs`, 06.11.2026, nur lesend). |

## Was der Patch ändert (`patches.mjs`, vier Stellen, je genau einmal im Ausgangsstand)

1. Direkt hinter `{% for item in cart.items %}` (ohne Zeilenumbruch dazwischen, damit die Ausgabe gleich bleibt) ein `{% liquid %}`-Block, der aus `item.properties['_vorschau']` die Variable `lx_vs_url` ableitet: leer, ausser die Adresse besteht **alle** Prüfungen.
2. `{% if item.image -%}` wird `{% if item.image or lx_vs_url != '' -%}` (eine Zeile ohne Variantenbild, aber mit Vorschau, bekommt trotzdem eine Miniatur).
3. Im bestehenden `{% liquid %}` der Miniatur: bei gesetzter `lx_vs_url` ist das Seitenverhältnis 1 (die Vorschau ist 800 × 800).
4. Die Bildausgabe: bei gesetzter `lx_vs_url` ein `<img>` (Klassen wie das Variantenbild plus `cart-items__media-image--vorschau`, `data-lx-vorschau="1"`, `width/height 800`, `loading=lazy`, Rahmen aus denselben Theme-Einstellungen, `alt` = Produkttitel maskiert, `data-lx-fallback` und `onerror` nur, wenn es ein Variantenbild gibt), sonst **genau** die bisherige Ausgabe.

Neue Größe 33 535 Byte (+3 340), 1 002 Zeilen (+61); md5 des Soll-Textes `704f5b7ceaf7a7f5188961c56ec5e1d3`, mit fester Cloud (siehe unten) `419d3170dff6bfa7794ab2f5a1f37bbf`. Kein CSS, kein Skript, keine zweite Datei: die Miniatur nutzt die vorhandenen Klassen (`.cart-items__media-image`: `object-fit: cover`, Breite 100 %).

### Welche Adresse gilt (alles muss stimmen, sonst bleibt das Variantenbild)

| Regel | Warum |
|---|---|
| beginnt mit `https:` + `//` + `res.cloudinary.com` + `/` (Gross-/Kleinschreibung genau so) | nur https, nur dieser Host. Geprüft über die Teile der Adresse (`split: '/'`), darum greifen `https://res.cloudinary.com@evil…`, `….evil.example`, `:443`, `https:/evil…/res.cloudinary.com/…` und `https:///…` nicht |
| danach `<Cloud>/image/upload/<Datei>` (mindestens 7 Teile) | ein hochgeladenes Bild; `image/fetch/<Fremdadresse>` (Cloudinary holt ein fremdes Bild), `video/`, `raw/` fallen weg |
| höchstens 300 Zeichen | echte Adressen haben rund 80 bis 120 (Beispiel im README von `pod/v6`: 76) |
| nur `A–Z a–z 0–9 - _ . ~ : , /`, kein `..` | Erlaubnisliste statt Verbotsliste: kein Anführungszeichen, `<`, `>`, Leerzeichen, Zeilenumbruch, Rückstrich, `%` (versteckte `..`), `?`, `#`, `&`, `=`; Kommas bleiben erlaubt (Umwandlungen wie `c_limit,w_800`) |
| Ausgabe zusätzlich mit `escape` | zweite Schicht; wirkt nur, wenn die Zeichenprüfung einmal versagt |

**Strenger als der Auftrag («nur https und nur Host res.cloudinary.com»):** `/image/upload/`, die Längengrenze und die Erlaubnisliste kommen dazu. Begründung: der Editor 6.2.1 schreibt die `secure_url` eines `auto/upload` (Konto `dwyi6kkrl`), die immer diese Form hat; jede Abweichung ist ein Zeichen für eine von Hand gebaute Adresse. Ein Fehlalarm kostet nur das Variantenbild (Zustand von heute).

**Offene Entscheidung (Hartung, Vorgabe aus):** der Host `res.cloudinary.com` gehört allen Cloudinary-Kunden. Wer einen Link mit vorbereiteter Eigenschaft baut (`GET /cart/add?…&properties[_vorschau]=…` ist, soweit bekannt, möglich; ungemessen), könnte ein Bild aus **seiner** Cloud als Miniatur im Warenkorb eines Besuchers zeigen (Bild-Einschleusung, kein Skript). Mit `VORSCHAU_CLOUD=dwyi6kkrl LIVE=1 node dropship/wp6-0611/theme/apply.mjs` gilt nur noch diese Cloud (Test: andere Clouds fallen weg, `..`-Umleitungen ebenso). Der Preis: ein Wechsel des Cloudinary-Kontos braucht dann ein neues Einspielen. **Empfehlung: mit fester Cloud einspielen.** Die Rücknahme liest die Wahl aus der Merkliste.

## Messwerte (GEMESSEN 06.11.2026, diese Maschine)

| Prüfung | Ergebnis |
|---|---|
| `liquid_test.mjs`, Ruby-Liquid 5.14.0 (strikt, `strict_filters`) + LiquidJS 10.30.1 + Chromium 153 | **2 972 Prüfungen, 0 Fehler** (102 Fälle × 3 Fassungen je Engine) |
| dasselbe wie in der CI (nur LiquidJS, ohne Browser, leere Umgebung, schlanke Kopie des Repos) | 1 489 Prüfungen, 0 Fehler |
| Render-Vergleich alt gegen neu | **81 Fälle ohne gültige Vorschau: Ausgabe Byte für Byte gleich** (in beiden Engines, Seite und Schublade, mit/ohne `_pod_karte`, alte und neue Druckdatei-Schlüssel, falsche Schlüssel `_Vorschau`/`vorschau`/`__vorschau`/…, 59 abgelehnte Adressen und Angriffe, leerer Warenkorb, Zeile ohne Bild) |
| Fälle mit gültiger Vorschau (18 Einzelzeilen, 3 Warenkörbe mit mehreren Zeilen) | genau eine Miniatur je Zeile; ausserhalb der Bildzelle alles gleich alt; Seitenverhältnis 1 bei `adapt`, `portrait`, `square`; Rückfall-Adresse = Variantenbild; Produkttitel mit `"`, `<`, `&`, `'` maskiert; 40 Zeilen (jede zweite mit Vorschau): jede Zeile richtig |
| Ruby-Liquid und LiquidJS | entscheiden bei allen 102 Fällen **gleich** (auch mit fester Cloud); Miniatur-Markup gleich |
| Eigenschaften | `_vorschau`, `_pod_karte`, `_Druckdatei` stehen in keiner Ausgabe; die Cloudinary-Adresse nur im `src` der Miniatur; die alte Druckdatei als Bild mit «Dein Entwurf ansehen», **keine Adresse im sichtbaren Text** |
| Browser (Chromium) | Ladefehler der Vorschau: `src` wird das Variantenbild, Marke weg, 0 Seitenfehler; ladende Vorschau bleibt; in einer 120-px-Zelle belegen Variantenbild und Vorschau **denselben Platz** (Behälter `[0,0,120,120]`, Bild `[0,0,120,120]`) |
| Aufwand (nur Anzeige, Ruby-Prozess mitgerechnet, 100 Zeilen) | alt rund 78 ms, neu rund 97 ms; kein Mass für Shopifys Renderer |
| `liquid_mutation.mjs` (68 Mutanten des Patches) | Ausgangslage grün; **65 erkannt, 3 gleichwertig (begründet), 0 überlebt**. Die erste Runde liess 7 überleben: 4 echte Lücken im Test (Angriff `https:/evil…/res.cloudinary.com/…`, Tilde, Grossbuchstaben, Leerraum im Link), jetzt geschlossen; 3 gleichwertige (zweite Schicht `escape` auf `src` und Stil, Schleife ohne `break`), begründet in `liquid_mutation.mjs` |
| `apply_test.mjs` (Einspielskript gegen Attrappen der Theme-API und der Storefront) | **204 Prüfungen, 0 Fehler**; 8 Läufe gleichzeitig ohne Zufallsfehler (die Zustandsdatei der Attrappe wird atomar geschrieben, das war die erste Fehlerquelle) |
| `apply_mutation.mjs` (73 Mutanten des Skripts) | Ausgangslage grün; **73 erkannt, 0 gleichwertig, 0 überlebt, 0 unklar** (die erste Runde: 2 überlebt, 2 gleichwertig, nach Ergänzung der Prüfungen 0) |
| Trockenlauf gegen das echte MAIN-Theme (nur lesend) | `snippets/cart-products.liquid` md5 `86a84bf9ff1862b97025bd1a841b8080`, 30 195 Byte: «Ausgangsstand: Prüfsumme GLEICH dem Abbild (MD5_VOR)». Seiten (nur GET, `PRUEFEN=1`): `/` HTTP 200, 1 049 210 Byte; `/cart` 200, 932 642; `/fr` 200, 999 198; eine Produktseite 200, 987 640; Hüllen des Warenkorbs (`cart-items__wrapper`) je Seite 2 |

## Einspielen und Rücknahme (`apply.mjs`)

```
node dropship/wp6-0611/theme/apply.mjs                                    # Trockenlauf (Vorgabe): liest nur, meldet die Prüfsumme
PRUEFEN=1 node dropship/wp6-0611/theme/apply.mjs                          # dazu die Ausgangswerte der Seiten (nur GET)
VORSCHAU_CLOUD=dwyi6kkrl LIVE=1 node dropship/wp6-0611/theme/apply.mjs    # einspielen (empfohlen mit fester Cloud)
LIVE=1 node dropship/wp6-0611/theme/apply.mjs                             # einspielen, jede Cloud unter res.cloudinary.com
ZURUECK=1 LIVE=1 node dropship/wp6-0611/theme/apply.mjs                   # Rücknahme (schreibt die Sicherung zurück)
```

Ablauf: Sicherung im Repo gleich `MD5_VOR`? → Live-Datei lesen, Prüfsumme gleich `MD5_VOR`? (sonst Exit 4, **nie** ein Überschreiben einer fremd veränderten Datei) → Seiten messen → Datei **nochmals** lesen (hat der Theme-Editor in der Zwischenzeit gespeichert: Exit 4) → Merkliste `sicherung/eingespielt.json` → ein `themeFilesUpsert` → warten, bis die API-Prüfsumme gleich dem Soll ist (höchstens 150 s; sie hinkt rund eine Minute) → Seiten in zwei Runden messen (HTTP 200, kein neuer «Liquid error», gleiche Zahl Hüllen). Bei **jedem** Fehler nach dem Schreiben (Rücklesen, Seiten, Ausnahme, Signal) schreibt das Skript die Sicherung selbst zurück, wartet auf die Prüfsumme und misst die Seiten; ein Stand, der weder Ausgangsstand noch Soll ist, wird vorher als `sicherung/fremd-<md5>.vor` festgehalten.

| Exit | Bedeutung |
|---|---|
| 0 | ok |
| 1 | Eingaben, Token, Aufruf ungültig (auch `FREMD_UEBERSCHREIBEN` beim Einspielen) |
| 3 | schon eingespielt / Rücknahme nicht möglich (Datei nach dem Einspielen fremd verändert) |
| 4 | Ausgangsstand, Sicherung oder Merkliste weicht ab; Seiten oder Warenkorb-Probe schon vorher fehlerhaft; Datei zwischen Lesen und Schreiben geändert |
| 5 | `userErrors` beim Schreiben (Liquid-Syntax abgelehnt; nichts geschrieben) |
| 6 / 7 / 8 | Rücklesen weicht ab / Seitenprüfung / Ausnahme nach dem Schreiben: **zurückgeschrieben und bestätigt** |
| 9 | Rückweg nicht bestätigt (oder Datei zurück, aber Seiten auffällig): von Hand prüfen |
| 130 | Signal (nach dem Schreiben zurückgeschrieben und bestätigt) |

Rücknahme von Hand, falls das Skript nicht läuft: `sicherung/snippets__cart-products.liquid.vor` (md5 = `MD5_VOR`) per `themeFilesUpsert` nach `snippets/cart-products.liquid` schreiben. Schalter: `VORSCHAU_CLOUD`, `FREMD_UEBERSCHREIBEN=1` (**nur** bei `ZURUECK=1`), `VORFEHLER_OK=1`, `PRUEF_PRODUKTE`, `PRUEF_RUNDEN`, `STOREFRONT`, `APPLY_ZEIT` (Details im Kopf von `apply.mjs`).

### Warenkorb-Probe (optional, `PRUEF_WARENKORB=1`; nicht ausgeführt)

Die leere Seite `/cart` und die Schublade rendern nur den **Leer-Zweig**; die Zeilenschleife, die der Patch ändert, läuft erst bei Artikeln im Warenkorb. Liquid-**Syntax**fehler meldet `themeFilesUpsert` selbst (`userErrors`, Exit 5), Laufzeitfehler in einer Zeile zeigt nur ein echter Warenkorb. Darum kann das Skript vor und nach dem Schreiben einen **anonymen Wegwerf-Warenkorb** mit eigenen Cookies füllen (`POST /cart/add.js` mit `PRUEF_VARIANTE=<ID eines verkäuflichen Artikels>` und den Eigenschaften «🎨 Design (front)», `_pod_karte`, `_vorschau` = `PRUEF_VORSCHAU`, Vorgabe die Beispielbild-Adresse der Cloudinary-Demo-Cloud), `GET /cart` auswerten (HTTP 200, kein Liquid-Fehler, vorher 0, nachher genau 1 Miniatur, kein Name einer Unterstrich-Eigenschaft und keine Cloudinary-Adresse im sichtbaren Text, Zeile «Design» da) und mit `POST /cart/clear.js` leeren (auch bei Fehlern). Es entsteht keine Bestellung; Shopify kann den Aufruf als Besuch mit Warenkorb zählen. **Das ist ein Eingriff in den Live-Shop und braucht das Ja des Besitzers.** Geht `/cart/add.js` nicht (z. B. Bot-Schutz), bricht die Probe vor dem Schreiben ab (Exit 4).

## Zusammenspiel mit den anderen Paketen

* **Editor 6.2.1** (`pod/v6`): schreibt `_vorschau` (die `secure_url` des Vorschau-JPEG, höchstens 80 KB, nur wenn die Vorschau gelang; sonst fehlt der Schlüssel und die Zeile zeigt das Variantenbild) und künftig `_Druckdatei (<ID>)` statt `🖼️ Druckdatei (<ID>)`. Das Theme versteckt den neuen Schlüssel ohne Änderung; die Zeile «🎨 Design (<ID>)» bleibt. Alte Warenkörbe mit der alten Schreibweise zeigen weiter das Entwurfs-Bild mit «Dein Entwurf ansehen».
* **Parser der Bestellstrecke:** liest `_vorschau` nicht (der Schlüssel enthält weder «Druckdatei» noch «Print file»); nichts zu tun.
* **Reihenfolge beim Einspielen (L6):** das Theme kann **vor** dem Editor 6.2.1 eingespielt werden (ohne `_vorschau` ändert sich nichts) und auch danach; die Rücknahme des Themes lässt `_vorschau` einfach unbenutzt.

## Ungemessen und Annahmen

* **Kasse und Bestätigungsmail:** ob Shopify `_vorschau`, `_pod_karte` und `_Druckdatei (…)` dort wirklich ausblendet (QUELLE: Shopify-Entwicklerdokumentation, Eigenschaften mit führendem Unterstrich), wurde nicht gemessen. Das Theme betrifft die Kasse nicht (sie ist von Shopify); die Kassen-Miniatur bleibt das Variantenbild. Messung: Schritt L7, Probekauf bis zum Zahlungsschritt, vorher und nachher festhalten.
* **Echter Shopify-Renderer:** getestet mit Ruby-Liquid 5.14.0 und LiquidJS 10.30.1; Shopifys eigener Renderer ist eine Abwandlung. Ungemessen: `split: ''` (Zeichen einzeln), Indexzugriff `lx_vs_teile[n]`, `#`-Kommentare im `liquid`-Tag (Shopify-Dokumentation nennt sie), `item.properties` mit Unterstrich-Schlüsseln (das bestehende Snippet filtert sie bereits, also sind sie in der Liste). Wirkt ein Fehler, zeigt Shopify «Liquid error» in der Zeile; für Syntaxfehler lehnt `themeFilesUpsert` ab (Exit 5), für Laufzeitfehler gibt es die Warenkorb-Probe.
* **Safari, iOS, Android:** nur Chromium geprüft (`onerror`, `loading=lazy`, `decoding=async`, `aspect-ratio` sind dort Standard; echtes Gerät ungemessen). **Theme-Editor-Vorschau** und **Schublade im echten Seitenkontext** (Skript `morph.js` ersetzt Teile der Seite) ungemessen.
* **Gewicht:** die Vorschau (800 × 800, höchstens 80 KB laut Editor) wird ohne Cloudinary-Umwandlung geladen, in der Zelle von höchstens 7,5 rem. Eine Umwandlung (`c_limit,w_250,q_auto`) wäre möglich, setzt aber voraus, dass das Konto Umwandlungen auf Abruf erlaubt (ungemessen); nicht eingebaut.
* **Grenze der Eigenschaftswerte** (255 Zeichen je Wert laut zwei Drittquellen) betrifft `_vorschau` nicht (Adresse unter 255 Zeichen im Test des Editors).
* **Bild-Einschleusung** über andere Cloudinary-Konten: siehe «Offene Entscheidung»; ohne feste Cloud bleibt sie möglich. Ein Skript kann nicht eingeschleust werden (Erlaubnisliste).
* Die Annahme «ein Wert `null` oder eine Zahl ist möglich» ist nur für die Tests gemacht (Eigenschaftswerte sind in Shopify Zeichenketten); beide Fälle fallen auf das Variantenbild zurück.

## Dateien

| Datei | Zweck |
|---|---|
| `patches.mjs` | der Patch (`anwenden`, `zuruecknehmen`, `MD5_VOR`, `MARKE`), rein, ohne Netz |
| `apply.mjs` | Einspielen / Rücknahme (Trockenlauf Vorgabe) |
| `sicherung/snippets__cart-products.liquid.vor` | Ausgangsstand (md5 = `MD5_VOR`), Quelle der Rücknahme; `sicherung/eingespielt.json` (Merkliste) entsteht beim Einspielen; `sicherung/fremd-*.vor` nur bei einem fremden Stand |
| `liquid_render.rb` | Ruby-Liquid-Renderer mit Attrappen der Shopify-Filter |
| `liquid_test.mjs` | Liquid-Fälle (siehe oben), Browser |
| `liquid_mutation.mjs` | Mutationsprobe des Patches (`--pruefen`: nur Fundstellen, für die CI) |
| `apply_test.mjs` | `apply.mjs` gegen Attrappen der Theme-API und der Storefront |
| `apply_mutation.mjs` | Mutationsprobe des Skripts (`--pruefen`: nur Fundstellen) |

## Testbefehle

```
export NODE_PATH=$(npm root -g)                      # nur für den Browserteil
node dropship/wp6-0611/theme/liquid_test.mjs         # LIQUIDJS_DIR / RUBY_LIQUID_GEMS setzen, OHNE_BROWSER=1 / OHNE_LIQUID=1 zum Auslassen
node dropship/wp6-0611/theme/apply_test.mjs
node dropship/wp6-0611/theme/liquid_mutation.mjs     # rund 80 s
node dropship/wp6-0611/theme/apply_mutation.mjs      # rund 3 min
```

CI: Job `warenkorb-miniatur` in `.github/workflows/luxestyle-automation-tests.yml` (LiquidJS, ohne Ruby und Browser; `apply_test`; die Fundstellen beider Mutationsproben).
