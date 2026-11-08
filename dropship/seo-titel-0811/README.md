# Artikel-Titel und -Beschreibungen kürzen (08.11.2026 abends)

Teil von «mach die webseite fix fertig mit 0 fehler». Anlass (GEMESSEN mit eigenem Crawl am 08.11.2026, 339 deutsche Ratgeber-/Magazin-Artikel):
- **Titel:** Shopify kürzt `page_title` bei 70 Zeichen hart, mitten im Wort («…Lautstärke — worauf es a – LuxeStyle»). Bei **121 von 339 Artikeln** (36 %) war der `<title>` damit 71 bis 82 Zeichen lang (21 Artikel genau 82, also hart gekürzt), bei 268 (79 %) über 60 Zeichen.
- **Beschreibung:** bei **225 von 339 Artikeln** (66 %) war die Meta-Beschreibung länger als 160 Zeichen (bis 320, Auszug aus dem Seitentext).
- Andere Seitentypen (Crawl-Stichprobe, deutsche Seiten): Sammlungen 340 Seiten, 1 Titel über 70 Zeichen, 0 Beschreibungen über 160; Seiten 105, 1 Titel über 70, 7 Beschreibungen über 160; Produkte 299, 6 Titel über 70, 0 Beschreibungen über 160. Dort besteht kein flächiger Fehler, daher nicht angefasst.

## Umsetzung (LIVE 08.11.2026 abends, MAIN-Theme, nur `snippets/meta-tags.liquid`)
Zwei Liquid-Blöcke, **nur für Artikelseiten** (`request.page_type == 'article'`):
1. `titel_block.liquid`: hat der Artikel **keinen eigenen SEO-Titel** (`article.metafields.global.title_tag` leer), wird `article.title` auf höchstens 58 Zeichen an einer Wortgrenze gekürzt, Satzzeichen am Ende (`: , & - – | ( + — · /`) fallen weg; mit « – LuxeStyle» (12 Zeichen) sind das höchstens 70. `<title>` und `og:title` nutzen den Wert.
2. `beschreibung_block.liquid`: Beschreibungen über 160 Zeichen werden an einer Wortgrenze auf höchstens 155 Zeichen gekürzt, danach «…».
Alle anderen Seitentypen laufen unverändert durch (`lx_title = page_title`, `lx_md` = bisheriger Ausdruck).

- Test `test.mjs` (LiquidJS, 13 Prüfungen: langer Titel, Gedankenstrich am Ende, kurzer Titel, genau 58 Zeichen, ein einziges langes Wort, Produktseite unverändert, Artikel mit eigenem SEO-Titel unverändert, Beschreibung lang/kurz/Produktseite, Entities).
- `apply.mjs` (Trockenlauf Vorgabe, `LIVE=1` sichert die Live-Datei nach `sicherung/meta-tags.liquid.vor`, schreibt, liest zurück; `ERSETZEN=1 LIVE=1` legt eine neue Fassung der Blöcke über den eingespielten Stand; `ZURUECK=1 LIVE=1` stellt die Sicherung wieder her, nur wenn die Live-Datei dem eingespielten Stand gleicht).
- Erste Fassung kürzte «… — worauf es ankommt» zu «… Lautstärke — – LuxeStyle» (Gedankenstrich blieb stehen): Live gemessen, behoben (`—`, `·`, `/` in die Liste), erneut eingespielt (`ERSETZEN=1`).

## Nach dem Einspielen gemessen
Siehe Zeile im Stand-Block von `CLAUDE.md` (Nachmessung aller 342 Artikel: Titel über 70 Zeichen, Beschreibung über 160, Artikel mit eigenem SEO-Titel unverändert, Liquid-Fehler).

## Grenzen
- Shopify-Liquid selbst wurde nicht lokal ausgeführt (nur LiquidJS und die echte Seite nach dem Einspielen); die Filter (`truncate`, `slice` auf Zeichenketten und Listen, `split`, `join`, `remove_last`) sind Standard.
- Wirkung auf Rankings unbekannt (Hypothese: sauberere Snippets, weniger abgeschnittene Titel). Google schreibt Titel teils selbst um.
- Die 14 Seitentitel (`/pages/…`) und 16 Sammlungstitel über 60 Zeichen sind NICHT angefasst (eigene SEO-Titel, im Admin pflegbar).
