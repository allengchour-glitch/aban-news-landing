# Google-SEO-Push R162

Stand: 2026-11-10T00:45:35+01:00
Marke: LuxeStyle
Shop: luxestyle.ch
Search-Console-Property: `sc-domain:luxestyle.ch`

## Tatsächlich live geändert

### Zwei aktive Produkte

1. Shopify-Produkt `16604558786951`
   - Titel von `Oversize-Kleid, Olivgrün` zu `Weit geschnittenes Kleid mit Seitentaschen` korrigiert.
   - Falsche Hose-/Olivgrün-Beschreibung durch eine claim-sichere deutsche Beschreibung ersetzt.
   - SEO-Titel und Meta-Beschreibung auf die aktuelle Auswahl mit 19 Farben und den Grössen 5XL/6XL ausgerichtet.
   - ACTIVE, Handle, CHF 22.90, 38 Varianten, Inventory-Verhalten und sechs aktive Publikationen erhalten.

2. Shopify-Produkt `16605820879239`
   - Titel von `Rundes Sitzkissen, orange` zu `Rundes Sitzkissen in sechs Farben` korrigiert.
   - Beschreibung und SEO-Metadaten auf sechs aktuelle Farbvarianten ausgerichtet.
   - Alle elf Produktbilder visuell geprüft und mit bildgenauen deutschen Alttexten versehen.
   - ACTIVE, Handle, CHF 34.90, sechs Varianten, Inventory-Verhalten und sieben aktive Publikationen erhalten.

Admin-Rücklesung und cachefrische öffentliche Gegenprobe bestätigten bei beiden Produkten HTTP 200, exakte H1-/Title-/Meta-Werte, Self-Canonical, Preis- und Warenkorb-Ausgabe. Menge 0 wurde bei `untracked/CONTINUE` nicht als Ausverkauf interpretiert.

### Weihnachtsgeschenke-Ratgeber

Shopify-Artikel `gid://shopify/Article/1001547137409`, Handle unverändert `weihnachtsgeschenke-2026-schweiz-ideen`:

- H1 neu: `Weihnachtsgeschenke 2026 Schweiz: Ideen und Elektronik`
- SEO-Titel neu: `Weihnachtsgeschenke 2026 Schweiz: Elektronik-Ideen`
- Meta-Beschreibung neu: `Weihnachtsgeschenke 2026 in der Schweiz: Elektronik-Ideen nach Empfänger und Budget sowie Hinweise zu Kompatibilität, Auswahl und Bestellung.`
- Neuer direkter Elektronik-Abschnitt mit sieben öffentlich erreichbaren Kategorien: Kopfhörer/Audio, Handy-Zubehör, Spielzubehör, Computer/Büro, Beamer/Heimkino, vernetztes Zuhause sowie Drohnen/Kameras.
- Doppelte FAQ-Blöcke auf genau einen Block mit vier Fragen reduziert; `FAQPage`-JSON-LD öffentlich parsebar.
- Unbelegte feste Lieferzeiten, erfundene Beliebtheitsrangfolge, alte Einzelprodukt-/Preisclaims, `Gift Box` und der Rabattclaim im Artikel entfernt.
- Öffentliche Rücklesung: HTTP 200, Self-Canonical, kein Noindex, neuer Title/Meta/H1, sieben Kategorielinks und ein FAQPage-Objekt mit vier Fragen.

Der globale Theme-Code `WELCOME10` bleibt ausserhalb des Artikelinhalts in Ankündigungsleiste, Newsletter und Einblendung vorhanden. Er wurde in diesem Lauf weder als Artikelclaim verwendet noch am Theme verändert.

## Google Search Console

Begrenzte Web-Suche vom 11.10.–07.11.2026, final geschätzt bis 06.11.2026:

- Seitenabfrage: 100 Zeilen, `truncated=true`; deshalb keine Vollkatalogquote.
- Ratgeber vor der Änderung: 12 Impressionen, 0 Klicks, durchschnittliche Position 6,17.
- Offengelegte Suchanfrage `welche elektronik-geschenke sind zu weihnachten 2026 in der schweiz am beliebtesten?`: 10 Impressionen, 0 Klicks, durchschnittliche Position 5,2.
- Seltene Suchanfragen können anonymisiert sein.

Gezielte URL-Prüfung nach der Änderung:

- `PASS`, `Gesendet und indexiert`
- robots erlaubt, Indexierung erlaubt, Abruf erfolgreich
- Google-Canonical und Nutzer-Canonical identisch
- letzter Google-Crawl 06.11.2026 10:43:27 UTC, mobil gecrawlt
- Sitemap `https://luxestyle.ch/sitemap.xml`

Die URL-Prüfung beweist den Indexstatus der zuletzt gecrawlten Fassung. Sie beweist keine Verarbeitung der neuen Inhalte und keine Ranking- oder Verkaufswirkung.

## Begrenzter technischer SEO-Audit

Fünf Hauptseiten plus robots.txt und Sitemap wurden geprüft. Alle fünf Seiten waren HTTP 200, selbstkanonisch, mit `x-default`, `de`, `fr`, genau einem H1 und ohne Noindex.

Offen:

- 778–835 eindeutige interne Links pro Stichprobenseite und etwa 1,23–1,99 MB HTML; das globale Menü bleibt der grösste belegte technische Hebel.
- Der Menüwrite bleibt gesperrt, bis die dokumentierten 520/520 Kindkanten und 86/86 mobilen `Alle in …`-Wege in einer unveröffentlichten Vorschau bestehen.
- Deutsche Breadcrumb-Schemadaten enthalten teilweise `Home` statt `Startseite`.
- Beauty enthält einen doppelten Breadcrumb-Knoten.
- `Selbst gestalten` hat kein Breadcrumb-/WebPage-Schema.
- Der Projektor enthält ein `VideoObject`, obwohl Produktbindung und kommerzielle Medienrechte des Videos weiterhin offen sind.

Keine Theme-, Menü-, Merchant-, Feed-, GTM-, Google-Ads-, Budget- oder Kampagnenänderung wurde vorgenommen.

## Merchant und Exportgrenze

HYPD Merchant bestätigte ausschliesslich die Identität `LuxeStyle CH`, Shop-ID `5797470070`. Die zwei neuesten bereitgestellten Merchant-CSV-Dateien sind bytegleich und enthalten 14'245 Zeilen beziehungsweise 3'826 Offer-IDs. Das ist ein Exportbefund, keine aktuelle Katalogquote. Es gab keinen breiten Live-Scan und keinen Merchant-Write.

## Nächster sinnvoller Schritt

1. Google die neue Ratgeberfassung crawlen lassen und erst nach angemessenem Zeitraum dieselbe URL eng nachmessen.
2. Danach einen weiteren belegten Seiten-/Query-Fall mit Impressionen und schwacher Klickrate bearbeiten.
3. Die globale Menüreduktion nur über das bestehende unveröffentlichte Theme und erst nach vollständigen Erreichbarkeitsgates umsetzen.
4. Breadcrumb- und VideoObject-Korrekturen im Theme bündeln, vollständig in DE/FR prüfen und erst über einen legitimen Publish-Pfad live setzen.

Claude-Code-Empfang bleibt `unknown_no_claude_receipt`.

[LUXESTYLE_R162_20261110]
