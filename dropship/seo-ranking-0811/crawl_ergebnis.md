# Eigener Site-Audit luxestyle.ch (Crawl 08.11.2026 abends, nur lesend)

Ersatz für den Semrush-Site-Audit (`no_api_units`, siehe `README.md`). **Stichprobe, nicht der ganze Shop:** Seiten (`/pages/…`) und Ratgeber-/Magazinartikel sind vollständig erfasst, Sammlungen (340 deutsche) und Produkte (300, festgelegter Zufall aus der ersten Produkt-Sitemap; die Sitemap hat 125 Unter-Sitemaps) sind Stichproben. Aufgerufen wurde nacheinander mit zwei Arbeitern und Pausen (Cloudflare drosselt mit 429).

## Umfang
1 788 Seiten abgerufen, **alle HTTP 200** (kein 404, keine Weiterleitungsschleife): 1 087 deutsche (340 Sammlungen, 300 Produkte, 105 Seiten, 339 Ratgeber-/Magazinartikel, 3 Blog-Übersichten) und 700 `/fr/`-Varianten. Jede Seite: `<title>`, Meta-Beschreibung, `robots`, `<h1>`, Canonical, hreflang, JSON-LD (gültig?), `http://`-Verweise, Grösse in Byte.

## Ergebnis der deutschen Seiten (1 087)
| Befund | Zahl | Einordnung |
|---|---|---|
| Canonical zeigt auf andere Adresse | 0 | in Ordnung |
| `<h1>` nicht genau einmal | 0 | in Ordnung |
| JSON-LD fehlt oder ungültig | 0 | in Ordnung (Variantenprodukte tragen `ProductGroup`, nicht `Product`) |
| `http://`-Verweise im Quelltext | 0 | in Ordnung |
| `noindex` | 0 (FR: 595) | gewollt: `/fr/`-Produkt, -Sammlung, -Blog (Entscheid vom 07.11.) |
| Seite über 2 MiB | 0 | Median Sammlung 1,49 MB, Produkt 1,02 MB |
| Titel über 70 Zeichen | **129** (Artikel 121, Produkte 6, Sammlung 1, Seiten 1) | **Artikel behoben (siehe unten)**; Rest klein |
| Beschreibung über 160 Zeichen | **232** (Artikel 225, Seiten 7) | **Artikel behoben** |
| Titel über 60 Zeichen | 362 (Artikel 268, Produkte 50, Sammlungen 30, Seiten 14) | nur Anzeige; Google kürzt bei rund 600 Pixel |
| doppelter Titel (deutsch) | 1 Paar | `lederarmbaender` und `armbaender-leder` («Lederarmbänder online kaufen») |
| doppelte Meta-Beschreibung (deutsch) | 4 Paare | `herren-hosen`/`damen-hosen`, `damen-`/`herren-kopfbedeckung`, `lederarmbaender`/`armbaender-leder`, `kinder-`/`herren-hausschuhe` |
| Meta-Beschreibung fehlt | 1 | Blog «News» (leer, siehe README) |

`/agents.md` lieferte HTTP 200 mit Text statt HTML (kein Titel, kein H1): eine Textdatei für Agenten, kein Seitenfehler.

## Behoben am 08.11.2026 (LIVE, `dropship/seo-titel-0811/`)
Nur Ratgeber-/Magazinartikel ohne eigenen SEO-Titel: Titel auf höchstens 58 Zeichen an einer Wortgrenze (ohne Satzzeichen und Füllwörter am Ende), Beschreibungen über 160 auf höchstens 155 Zeichen mit «…». Nachmessung aller 339 Artikel: siehe Stand-Block in `CLAUDE.md`.

## Bewusst nicht angefasst (Entscheid offen, alle klein)
- 6 Produkttitel über 70 Zeichen (Shopify schneidet hart ab; ein Titel ist 81 Zeichen lang: `mini-usb-taschenlampe-…`), 1 Sammlung (`beauty-makeup`, 75).
- 14 Seitentitel über 60 und 7 Seiten-Beschreibungen über 160 Zeichen (`/pages/…`, eigene SEO-Felder im Admin).
- Die fünf Dubletten-Paare der Sammlungen (gleicher Titel oder gleiche Beschreibung): je Paar unterscheidbare Texte schreiben (Chancen-Liste Nr. 6 in der README).
- Die deutsche und die französische Fassung einer Seite tragen oft denselben Titel (Seiten ohne Übersetzung): kein Fehler, solange `hreflang` stimmt; die französischen Seiten werden stufenweise übersetzt (`dropship/fr-uebersetzung-0811/`).

## Grenzen des Messgeräts
- Eine Regex-Zählung «Bilder ohne `alt`» ergab auf jeder Seite genau 1: Es war ein `<img` in einer Skript-Zeichenkette (Chat-Suche). Diese Zahl ist **verworfen**, Bilder-Alt-Texte sind damit weder bestätigt noch widerlegt.
- Kein Rendern (kein Browser): was JavaScript nachlädt, ist nicht erfasst. Kein Test auf Kaufbarkeit, Ladezeit oder Core Web Vitals.
- Produkte: 300 von rund 56 500 aktiven (0,5 %). «Alle Produktseiten sauber» ist eine Stichprobe, keine Aussage über den Katalog.
