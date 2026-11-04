# Seitengewicht: Kopfzeile, Filter und Karten verdichtet (LIVE 04.11.2026 abends)

Auslöser: Besitzer «weiter kunden suchen und sachen verbessern». Anlass ist die Index-Analyse vom 02.11. (`dropship/INDEX-ANALYSE-0311.md`): nur 31 % der 735 Menü-Kategorien sind bei Google indexiert, Kategorieseiten waren 2,4–2,8 MB gross.

## Befund (GEMESSEN 04.11.2026 17:38 UTC, rohes HTML, unkomprimiert)
- Googlebot liest laut Google-Blog (3/2026) nur die **ersten 2 MiB (2 097 152 Byte)** des unkomprimierten HTML (QUELLE, von uns nicht selbst geprüft).
- Kategorieseiten: uhren 2 423 661, damen-schuhe 2 396 490, spielzeug 2 623 294, kissen 2 588 143, viral-hits 2 831 703, fr-geschenke 2 388 302 Byte. **Auf jeder Seite stehen die Filter (zwei Kopien: Desktop-Leiste und mobiler Dialog, 419–707 KB) VOR dem ersten Produkt.** Folge für Googlebot (gerechnet, Analyst «rest-der-seite»): bei `spielzeug` erreichen die ersten 2 MiB nur **4 von 24** Produktkarten, bei `kissen` 7, bei `uhren` 15, bei `damen-schuhe` 16; der Fuss mit den Links fehlt überall.
- Der grösste Einzelposten war das mobile Menü `<header-drawer>`: 858 KB auf JEDER Seite, davon 56 % reiner Leerraum (Einrückung der Liquid-Vorlagen).

## Was geändert wurde (nur Leerraum, Inhalt und Darstellung gleich)
1. **Stufe 1, 18:36–18:40 UTC:** `snippets/header-drawer.liquid` fängt das Menü mit `capture` ein und verdichtet den Leerraum (Zeilenumbruch → Leerzeichen, dann Leerzeichenfolgen 32, 32, 8, 4, 2, 2 → eines; rechnerisch fallen alle Folgen bis 5 000 auf eines). Schutzregel: nur wenn der Zeilenumbruch-Baustein 1–2 Zeichen lang ist und der Teil kein `<script>`, `<style>`, `<textarea>`, `<pre>` enthält, sonst Rohausgabe. −483 KB je Seite. Werkzeug `apply.mjs`, Rechnung `patches.mjs`, Test `patches_test.mjs` (34, mit echter Seite 39).
2. **Stufe 2, 18:50–18:55 UTC:** neues Snippet `snippets/lx-verdichten.liquid` (dieselbe Kette, Modus `filter` = nur leere `<script src>`-Tags erlaubt, Modus `karten` = nur `<script type="application/json">`, bei unbekanntem Modus Rohausgabe) und `sections/main-collection.liquid` ruft es für den Filterblock und für die 24 Produktkarten auf. −152 bis −215 KB (Filter) und −51 KB (Karten) je Kategorieseite. Werkzeug `apply2.mjs`, Rechnung `patches2.mjs`, Test `patches2_test.mjs` (35, mit echten Bereichen 100).

## Ergebnis (GEMESSEN live 04.11.2026, curl, Byte)
| Seite | vorher | nach Stufe 1 | nach Stufe 2 |
|---|---|---|---|
| Startseite | 1 523 422 | 1 043 902 | 1 043 905 |
| /collections/uhren | 2 423 723 | 1 944 141 | **1 740 842** |
| /collections/damen-schuhe | 2 396 490 | 1 916 899 | **1 731 978** |
| /collections/spielzeug | 2 623 464 | 2 143 873 | **1 877 906** |
| /collections/viral-hits | 2 831 765 | 2 352 174 | **2 033 565** |
| /collections/kissen-wohntextilien | (2 588 143) | 2 108 794 | **1 861 080** |
| /fr/collections/kleine-geschenke-mitbringsel | (2 388 302) | 1 908 711 | **1 700 619** |
| Produktseite Rizinusöl | 1 574 845 | 1 094 156 | 1 094 159 |
Alle gemessenen Kategorieseiten liegen unter 2 097 152 Byte, alle 24 Karten und der Fuss stehen im lesbaren Teil. Reserve bei `viral-hits` nur 64 KB (die grösste Seite), sonst 160–400 KB.

## Wie geprüft
- **Echtes Liquid:** Ruby-Referenz-Liquid 5.14.0 (strict parse, strict variables/filters) rendert das Snippet auf 10 echten Bereichen (5 Seiten × Filter/Karten) Byte für Byte wie die JS-Nachbildung des Tests; 6–10 ms je Aufruf. Stufe 1: Analyst «liquid-audit» (Kette, Wächter, `capture`-Grenzen: Shopify veröffentlicht KEINE Speichergrenze für `capture`, darum Seitenprüfung nach dem Einspielen mit automatischem Rückweg).
- **Browser, Stufe 1:** zwei unabhängige Messungen (Agenten «aequivalenz» und «liquid-audit»): DOM-Elemente, Rechtecke aller Elemente (3 375 × vier Breiten), Barrierefreiheitsbaum, Pixel, Text: **0 Abweichung** (Gegenprobe: ein absichtlicher Teststeg wurde erkannt).
- **Browser, Stufe 2** (`equiv.cjs`, Scratch): dieselbe gespeicherte Seite einmal unverändert (zweimal, Messrauschen) und einmal mit verdichteten Bereichen, über `page.route` auf der Live-Adresse ausgeliefert (Assets live). Verglichen je Zustand (normal, alle Filter aufgeklappt, mobiler Filter-Dialog offen): Elementzahl, Rechtecke ALLER Elemente im Ergebnisbereich (5 142–6 231), `innerText`, FormData der Filter-Formulare, Bildquellen, Seitenhöhe, Bildschirmfotos. Läufe: uhren 1440 und 390 (zweimal), spielzeug 1440, kissen 390: **0 abweichende Rechtecke**, Text, Formulare, Bilder, Höhe gleich, Pixel 0 abweichend. Eine einzelne Aufnahme (uhren 390, Dialog) wich im ersten Lauf um 2 712 von rund 350 000 Pixeln ab, im Wiederholungslauf 0: einmalige Messabweichung, keine Rechteckabweichung dabei.
- **Seitenprüfung im Skript** vor und nach dem Einspielen (10 Adressen, normale Chrome-Kennung, sequentiell): kein «Liquid error», genau ein Drawer (Stufe 1), 24 Karten und Filter vorhanden, Seite kleiner; bei JEDEM Fehler schreibt das Skript die Sicherung selbst zurück (Exit 7).
- **Renderzeit (Server-Timing `render;dur`, je 8 Abrufe nach den Änderungen):** uhren rund 210–350 ms, spielzeug 190–275 ms, Startseite 130–240 ms; die Werte VOR den Änderungen (Analyst, n = 5–6): uhren Median 429, spielzeug 308, Startseite 255. Keine Verschlechterung, das Rauschen ist aber so gross wie der Effekt (Hypothese: die kleinere Antwort gleicht die Kette aus).

## Restrisiko und Grenzen
- Die Kette fasst auch Leerzeichenfolgen OHNE Zeilenumbruch zusammen: enthielte ein Filterwert zwei Leerzeichen hintereinander (`value="a  b"`), würde der Wert zu `a b` und der Filter träfe nichts. Gemessen: in den fünf gespeicherten Seiten tragen nur `class`/`style` Umbrüche oder Doppel, kein anderes Attribut; im ganzen Katalog ungemessen. Bei einer Beschwerde über einen Filter zuerst Stufe 2 zurücknehmen.
- Die Wirkung auf die Indexierung ist **ungemessen** und eine Hypothese (Google crawlt grosse Seiten langsamer, liest nur die ersten 2 MiB). Sichtbar wird sie frühestens in Tagen: gleiche 735 Adressen nach 7 und 14 Tagen messen (Index-Analyse, Plan Punkt 3). Die Search-Console-Anträge laufen unabhängig davon (`INDEX-LISTE-0411.md`).
- Nicht angefasst, aber gross: `<head>` (Judge.me 48 KB, Web-Pixel 38 KB, `ShopifyAnalytics.meta` 22–102 KB, per Theme nicht änderbar), Desktop-Menü 157 KB (801 Links), Karten-`srcset` mit 10 Breiten, 25 KB statische Skripte am Seitenende. Weitere Posten mit Ersparnis und Risiko stehen im Bericht des Analysten (Workflow `wf_f6f6db81-f63`, Journal).
- Die Seiten werden bei Änderungen der Menüs/Filterwerte wieder grösser (Filter «Kategorie» mit 97 Werten bei `spielzeug` allein 140 KB je Kopie): `viral-hits` hat nur 64 KB Reserve.

## Rücknahme
- Stufe 2: `ZURUECK=1 LIVE=1 node dropship/seo-kopf-0411/apply2.mjs` (nur wenn die Section noch exakt dem eingespielten Stand entspricht; löscht danach das Snippet).
- Stufe 1: `ZURUECK=1 LIVE=1 node dropship/seo-kopf-0411/apply.mjs`. Reihenfolge: 2 vor 1.
- Sicherungen der Ausgangsdateien: `sicherung/snippets__header-drawer.liquid.vor` (md5 8e1f8fc1…), `sicherung/sections__main-collection.liquid.vor` (md5 08668990…). `header-drawer.slim2.liquid` ist die vom Prüfer gebaute Referenz von Stufe 1 (Test: `anwenden()` ergibt sie Byte für Byte).

## Lehren
1. Die Leerraum-Kette gehört NIE auf Bereiche mit Inline-Skript (`//`-Kommentar bis Zeilenende würde nach Umbruch→Leerzeichen den Rest der Zeile auskommentieren): der Wächter fragt `<script` nach Art des Bereichs; bei den Filtern darf nur `<script src=…></script>` ohne Inhalt vorkommen (Zahl `<script` gleich Zahl `></script>`), bei den Karten nur JSON.
2. Die Bereichsgrenze zählt: mein erster Auszug «Karten» enthielt das Raster-Skript aus dem `product-grid`-Snippet (steht im `<ul>` VOR dem ersten `<li>`), der Wächter lehnte zu Recht ab; im Liquid wird nur die `children`-Erfassung verdichtet.
3. Ein Messgerät gegenprüfen: der erste Äquivalenztest zeigte bei einer Aufnahme 2 712 abweichende Pixel; erst der Wiederholungslauf (0) und die Rechteckmessung (0) erlaubten, das als Rauschen zu werten.
4. Nebeneffekte immer messen: beide Stufen wurden mit Seitenprüfung und automatischem Rückweg eingespielt; die Sicherungen liegen im Repo.

## Index-Stichprobe als Basis für die Nachmessung (GEMESSEN 04.11.2026, Analyst «crawl-audit»)
- 37 zufällige Produkt-URLs aus 9 der 57 deutschen Produkt-Sitemaps (Liste: `index_stichprobe_urls.txt`), geprüft mit `inspect_urls`: **14 «Submitted and indexed» (37,8 %), 4 «Discovered – currently not indexed», 2 «Crawled – currently not indexed», 17 «URL is unknown to Google» (45,9 %)**. Ältere Produkt-IDs (Sitemaps 1–28): 10 von 20 indexiert; neuere (36–57): 4 von 17 indexiert, 12 unbekannt. n ist klein, die Unsicherheit gross.
- Weitere Befunde des Analysten (Hypothesen, nicht umgesetzt): Produkte sind intern kaum verlinkt (Entdeckung fast nur per Sitemap; im HTML der Produktseite fehlen Links auf andere Produkte, weil «Ähnliche Produkte» per `/recommendations/products` nachgeladen wird und dieser Pfad in `robots.txt` gesperrt ist); Kopf trägt 1 492 Links (755 verschiedene) auf jeder Seite; `lastmod` aller Produkte ist «heute» (Massenschreiben, Signal wertlos); 10 Sammlungspaare mit vertauschter Wortfolge (z. B. `herren-uhren`/`uhren-herren`); Tag-Seiten `/collections/<handle>/<tag>` kanonisieren auf sich selbst.
- **NICHT bestätigt (Messgerät-Falle):** der Analyst meldete «56 500 FR-Produktadressen leiten per 302 auf Deutsch um». Eigene Gegenprobe: 24 von 24 FR-Produktadressen aus fünf FR-Sitemaps antworten 200. Die 302 entstehen nur, wenn die Anfrage einen deutschen `Accept-Language`-Kopf trägt (`de-CH,de;q=0.9`: Shopify leitet nach Browsersprache um); Googlebot sendet keinen. Kein Handlungsbedarf, aber: **Abrufe von `/fr/...` immer ohne `Accept-Language` messen.**
- Nachmessung: eine Woche nach dem Eingriff (11.11.2026) dieselben 37 URLs und 80 zufällige Zeilen aus `dropship/index-analyse-0311/index_menue_0311.csv`, dazu die Seitengrössen von Start, uhren, spielzeug, viral-hits, kissen-wohntextilien (erwartet 1,04 / 1,74 / 1,88 / 2,03 / 1,86 MB).
