# Ranking-Push 09.11.2026 («ranking sachen machen für luxestyle»)

**Auslegung (meine, nicht bestätigt):** mehr Sichtbarkeit bei Google; erst messen, wo wir stehen, dann den Hebel mit dem besten Beleg nehmen. Danach schrieb der Besitzer «aktulisiere das» zu einem Bild der Seite «LuxeStyle Offene Punkte»: gemeint ist (meine Auslegung) das Dashboard, alle veralteten Messungen neu.

## Messung (GEMESSEN, 09.11.2026 ab 20:15 UTC)

**Search Console, 28 Tage bis 06.11.** (`gsc_basis_0911.json`): 96 Klicks bei 15 980 Einblendungen, Schweiz 90 Klicks auf Position 52,9. Mobil 58 Klicks (Position 47), Desktop 37 (Position 54). Die Position fiel von 36 bis 44 (10. bis 13.10.) auf 55 bis 59 (ab 01.11.), weil mehr Seiten sichtbar wurden (Hypothese, nicht belegt). Produkt-Snippets: 9 995 Einblendungen auf Position 61; Händlerlisten in der Websuche nur 11 Einblendungen.

**Klicks:** Startseite 16 (Markensuche), Rizinusöl-Wickel 13 (Position 7,1, Klickrate 7,8 %), Schwingerhose 3, sonst je 1 Klick auf rund 70 Seiten. Nichts davon ist ein Verkaufsbeleg.

**Nahe Chancen** (Einblendungen, 0 Klicks): Familien-Weihnachtspyjama-Sammlung 327 auf Position 24; Haustier-Trinkbrunnen auf drei Seiten rund 900 (deutsche Sammlung 329 auf Position 49, französische Sammlung 280 auf Position 24, Produkt 290 auf Position 27). Schweizer Nachfrage nach Saisonbegriffen belegt Googles Vorschlagsliste (nur Beleg, dass gesucht wird, keine Mengen): «samichlaus/schmutzli kostüm kaufen», «fasnachtskostüme kinder/schweiz/guggenmusik/basel», «weihnachtspyjama familie baumwolle/mit baby/set», «schwingerhose kaufen/kinder».

**Index der 735 Menü-Kategorien (alle einzeln, `index_menue_0911.csv`):** indexiert **273** (02.11.: 227, also +46). «Gefunden, nicht indexiert» sank von 319 auf 69, aber «Google nicht bekannt» stieg von 179 auf 375: **253 Seiten sind von «gefunden» auf «nicht bekannt» zurückgefallen**, obwohl alle 735 in der Sitemap stehen und von der Startseite verlinkt sind (Ursache ungeklärt; Hypothese: Google verwirft zu dünne Seiten). Indexierte Kategorien haben im Median 192 Produkte, nicht bekannte 38 (Produktzahl vom 02.11.). Tiefe 1: 13 von 17 indexiert, Tiefe 2: 129 von 213, Tiefe 3: 131 von 505. Hilfsagenten haben die 735 abgefragt; **Stichprobe von 10 zufälligen Adressen selbst nachgemessen: 10 von 10 gleich.**

**Seitenaufbau:** Startseite 1,05 MB, Produktseiten 1,1 bis 1,2 MB, Sammlungen 1,5 bis 1,6 MB HTML; das Menü (`<header>`) allein 559 KB. Alle Menü-Links stehen im sichtbaren DOM (nicht in `<template>`), alle 735 Kategorien sind auf der Startseite verlinkt. `robots.txt` ist Shopify-Standard (Sortier- und Filterfallen gesperrt, KI-Crawler nicht gesperrt). Die Sitemap listet 1 560 deutsche **und 1 560 französische Sammlungen**, obwohl `/fr/` seit 07.11. `noindex` trägt (Hygiene, Entscheid zur Sprache `fr` liegt beim Besitzer).

**Zugänge:** OpenSEO nur noch 6 Rechenpunkte (Suchvolumen und SERP-Abfragen gehen nicht), Semrush `no_api_units`, PageSpeed-Schnittstelle Tageskontingent erschöpft. Die Search Console selbst geht.

## Getan

1. **Sammlung `trinkbrunnen-katzen`** (LIVE 20:42 UTC): der Text bestand aus zwei allgemeinen Sätzen; jetzt eine Kaufhilfe mit 94 Wörtern und neuer Meta-Beschreibung. Jede Aussage ist aus den 24 aktiven Produkten belegt (Keramik 4, Kunststoff 9, Filter 10, USB 2, Akku 3, Batterie 4, «ohne Strom» 2, Fassungsvermögen 0,5 bis 4 Liter); keine Preise, keine Lieferzeit, keine Gesundheitsaussage. Rücklesen GLEICH, Storefront: neuer Text sichtbar, alter Satz weg, 0 Liquid-Fehler, 1,47 MB. Werkzeug `apply_trinkbrunnen.py` (Trockenlauf Vorgabe, `LIVE=1`, Rücknahme `ZURUECK=1 LIVE=1`), Sicherung `sicherung_trinkbrunnen.json`.
2. **Dashboard «LuxeStyle Offene Punkte»** neu gemessen und aktualisiert (24 Punkte, siehe unten).

## Bewusst nicht getan

- **Rizinusöl-Wickel** (13 von 96 Klicks): nicht angefasst, ein geändertes Snippet kann die Klickrate senken (Entscheid vom 04.11. bleibt). Beobachten.
- **Familien-Weihnachtspyjama:** Sammlung hat schon eigenen Text, Titel und Meta der Sammlung und zweier Produkte sind seit 04.11. neu; Wirkung erst ab 18.11. messbar.
- **Backlinks und Vertrauen:** der eigentliche Engpass für Seiten auf Position 24 bis 60; nicht autonom lösbar. Beste Hebel mit dem Besitzer: Preisvergleich (toppreise.ch), Verzeichnisse, echte Kundenbewertungen (die Anfrage-Mail ist pausiert).
- **Dünne Kategorien** (375 «nicht bekannt», Median 38 Produkte): erst am 11. und 18.11. neu messen, bevor man sie zusammenlegt oder auf `noindex` setzt.
- **Satz «möglichst bis Mitte November»** auf den Weihnachts-Sammlungen (Pyjama, Weihnachten 2026): veraltet nach dem 15.11. Entscheid des Besitzers (Regel: keine Bestellschluss-Daten ohne sein Ja); bis dahin nicht angefasst.

## Dashboard-Messungen vom 09.11. 20:25 bis 20:40 UTC

Bewertungen 2 096 von 56 498 (03.11.: 2 084 von 56 636); Schweiz 14 Tage 699 Sitzungen, 8 Käufe (1,1 %); Bestellungen #1034, #1037 bis #1039 bezahlt, bei CJ alle vier noch im Lager (nicht drei); Neue Produkte 6 von 14 live (unverändert); Krypto-Paket `paket.json` 0 Abrufe; Semrush weiter ohne Einheiten; **offene PRs 62, davon 51 Entwürfe (die frühere Zahl 30 zählte nur die erste Seite der Abfrage)**; Editor: **15 von 18 Selbst-gestalten-Seiten starten den Editor 6.4.0** (Browser-Test jeder Seite einzeln; PR #3009 ist gemergt, die Beschreibungen tragen den neuen Pfad), Magnet, Dad-Cap, Bügeltransfer bewusst gesperrt und ohne Editor.

## Messrezept und Messplan

1. Index der 735: `python3 index_pakete.py ../index-analyse-0311/index_menue_0311.csv <ordner>` schreibt sechs Pakete; je Paket ein Hilfsagent (Haiku) mit `inspect_urls` (10 URLs je Aufruf, Zeilen `url<TAB>coverageState<TAB>lastCrawlTime<TAB>googleCanonical` an `res_N.tsv` anhängen, Zählung zurückgeben); danach `python3 index_auswerten.py <ordner> ../index-analyse-0311/index_menue_0311.csv neue.csv`, dazu **10 zufällige Adressen selbst nachmessen**. Dauer rund 4 Minuten.
2. Wann: **11.11.** (7 Tage nach der Verschlankung vom 04.11.) und **18.11.** (14 Tage); am 18.11. dazu die Search Console: Seiten der Tabelle «Nahe Chancen» (`gsc_basis_0911.json`), Weihnachtspyjama (Titel vom 04.11.), Trinkbrunnen (Text vom 09.11.).
3. Index-Listen a und b: 10.11. früh (bestehender Wecker).

## Lehren

1. **`list_pull_requests` ohne `perPage` liefert nur 30:** die gemeldeten «30 offene PRs» waren eine Seite, richtig sind 62. Jede Zählung über eine Liste mit der Seitengrösse und `hasMore` gegenprüfen.
2. **«URL ist Google nicht bekannt» ist kein Fehler der Seite:** 253 Kategorien fielen von «gefunden» dorthin zurück, alle in der Sitemap, alle verlinkt, alle HTTP 200. Nicht jede Sichtbarkeitsmessung ist ein Fehlerzeiger auf unsere Seite.
3. **Eine Sammlung mit Einblendungen und zwei Sätzen Text ist die billigste Verbesserung:** erst die Search Console nach Seiten mit vielen Einblendungen und 0 Klicks sortieren, dann deren Text lesen.
4. **Der Editor-Stand steht im `products.json` der Sammlung** (`body_html` mit dem Skriptpfad): ein Aufruf zeigt die Version aller Seiten, der Browser-Test belegt danach den Start (`[data-init-v6]`). Magnet bekam bei einem Aufruf HTTP 429 (Drosselung, nicht Fehler): erneut, mit Pause.
5. **Hilfsagenten für Massenabfragen:** sechs parallele Haiku-Agenten brachten 735 Abfragen in rund 4 Minuten; die Zahl gilt erst nach der eigenen Stichprobe.
