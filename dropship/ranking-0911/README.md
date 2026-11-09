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

## Nachtrag 09.11., 21:00 bis 21:25 UTC («mach weiter»)

**Auslegung (meine, nicht bestätigt):** mit dem Ranking weitermachen, solange der Hebel einen Beleg hat; was die Messung nicht trägt, bleibt liegen und wird benannt.

### Getan

1. **Bestell-Daten aus den Weihnachts-Seiten genommen** (`apply_fristen.py`, 9 Ziele, LIVE 21:11 UTC, Rücklesen 9 von 9 GLEICH, Storefront 9 von 9 in Ordnung: HTTP 200, neuer Satz da, alter weg, 0 Liquid-Fehler). Sieben Sammlungen (`weihnachten-2026`, `kleine-geschenke-mitbringsel`, `adventskalender`, `weihnachtspyjama-familie`, `weihnachtspullover`, `🎁-geschenke-bis-chf-30`, `damenmode-favoriten`), der Ratgeber `weihnachtsgeschenke-2026-schweiz-ideen` (Text, FAQ **und** die strukturierten Daten, JSON bleibt gültig) und die Seite `weihnachtsgeschenke-last-minute`.
   - **Warum:** «bis Anfang November» (Adventskalender) war schon am 09.11. falsch, «bis Mitte November» wird es am 15.11., und die Seite `weihnachtsgeschenke-last-minute` versprach «sicher rechtzeitig, wenn bis Ende November bestellt» (bei 20 Werktagen Lieferzeit nicht haltbar). Der Besitzer hat am 28.10. entschieden, in Beiträgen keinen Bestellschluss für Weihnachten zu nennen; die Lieferzeiten sind Richtwerte (steht so auf der Pyjama-Sammlung).
   - **Neu:** keine Daten, keine Zusage: «bestellt am besten früh und prüft die Lieferangabe beim Artikel», «rechne die Lieferzeit vom Wunschtermin aus zurück». Im Ratgeber ausserdem der Schlusssatz «sichere dich mit einer frühen Bestellung die rechtzeitige Lieferung» ersetzt durch «bestelle früh, damit du genug Puffer hast».
   - **Abweichung von meiner Notiz im selben Dokument oben** («bis dahin nicht angefasst, Entscheid des Besitzers»): ich habe es doch getan, weil die Änderung nur Daten entfernt (kein neues Versprechen), zu seiner Regel vom 28.10. passt und der Adventskalender-Satz schon falsch war. Die Notiz oben steht als frühere Fassung stehen.
   - **Rücknahme:** `ZURUECK=1 LIVE=1 python3 dropship/ranking-0911/apply_fristen.py` (Sicherung `sicherung_fristen.json`; schreibt nur zurück, wenn der Text noch dem Stand dieses Werkzeugs entspricht).
2. **Drei Links im Ratgeber** (Block «Passend dazu bei LuxeStyle»): Weihnachtspyjamas für die ganze Familie, Weihnachtspullover, Adventskalender. Der Ratgeber steht bei Google auf Position 6,6 (9 Einblendungen), die Pyjama-Sammlung auf Position 24,3 (327 Einblendungen). Vorher verlinkten auf die Pyjama-Sammlung nur das Menü (2 Fundstellen auf der Startseite), `weihnachten-2026`, `weihnachtspullover` und die Seite «alle-kategorien». Wirkung auf den Rang: Hypothese, ungemessen.
3. **Zwei Einleitungen mit belegten Merkmalen** (`apply_einleitungen.py`, LIVE 21:16 UTC, Rücklesen GLEICH, Storefront in Ordnung, 1,54 und 1,53 MB): `buero-organizer-ablage` (10 → 110 Wörter, 111 Einblendungen, Position 67,1) und `freizeit-sportrucksaecke` (16 → 120 Wörter, 42 Einblendungen, Position 32,9). Jede Aussage wird beim Lauf gegen alle aktiven Produkte gezählt und muss ihre Mindestzahl erreichen (z. B. Rucksäcke: Laptopfach 16 Produkte, USB-Ladeanschluss 8, Nassfach 5, Volumen «20–35 L» 8, Canvas 15, Oxford 17, Leder 17; Büro: Stiftehalter 9, Etuis 6, Schubladen/Fächer 6, Holz 6). Keine Preise, Lieferzeiten, Sicherheits- oder Gesundheitsaussagen; SEO-Titel und -Beschreibung unverändert; Markierungsblöcke (`<!-- ls-verwandt -->`, `<!-- gd2 -->`) bleiben erhalten (beide Sammlungen hatten keine). Rücknahme `ZURUECK=1 LIVE=1 python3 dropship/ranking-0911/apply_einleitungen.py`, Sicherung `sicherung_einleitungen.json`.

### Gemessen und bewusst nicht gemacht

- **Weihnachts-Seiten haben noch kaum Nachfrage in der Search Console** (28 Tage bis 06.11.): Pyjama-Sammlung 327 Einblendungen (Position 24,3), Pullover 77 (38,3), Ratgeber 9 (6,6), Adventskalender-Sammlung 7 (86,1), `weihnachten-2026` 1. Das Weihnachtsgeschäft zeigt sich in diesem Fenster noch nicht; es wird ab 18.11. neu gemessen.
- **Rizinusöl-Wickel** (13 von 96 Klicks): 167 Einblendungen, Kaufsuchen («wickel kaufen», «wickel schweiz») stehen auf Position 2,8 bis 3,7, die allgemeinen Begriffe («rizinusöl wickel» 13,6, «… bauch» 10,5) hängen an Marktführern. Für einen Sprung braucht es Vertrauen und Verweise von aussen, keinen Text: nicht angefasst.
- **Nicht gemacht:** Kinder-Velohelme (Sicherheit, Normen sind in den Produktdaten nicht belegt), Wanderschuhe (Passform- und Dichtigkeitsaussagen), die Sätze «bleibt bis Ende November stimmig» (`wohn-ideen-herbst-2026`) und «Sammle ab Anfang November» (Ratgeber Adventskalender): beides sind Ratschläge, keine Bestellfristen.
- **Die grössten Hebel liegen beim Besitzer:** (a) Sprache `fr`: 1 560 französische Sammlungen stehen trotz `noindex` in der Sitemap, 253 Menü-Seiten sind von «gefunden» auf «nicht bekannt» zurückgefallen (Zusammenhang Hypothese); (b) Verweise von aussen (Preisvergleich toppreise.ch, Verzeichnisse); (c) echte Kundenbewertungen (Anfrage-Mail `RnTvsY` ist pausiert).

### Messplan

Basiswerte für den Vergleich stehen in `gsc_basis_0911.json` unter `text_geaendert_0911_abends` (gleiches Fenster 10.10. bis 06.11.). Vergleich **18.11.** und **02.12.** mit demselben Abruf (`dimensions: page`, Seite enthält «weihnacht», «buero-organizer», «sportrucksaecke»). Ein Anstieg wäre ein Hinweis, kein Beleg: die Weihnachtssaison wirkt mit.

### Lehren (Nachtrag)

1. **Beim Neuschreiben einer Sammlungs-Einleitung die Markierungsblöcke erhalten:** 147 Sammlungen tragen `<!-- ls-verwandt -->` (Verlinkung auf Eltern und Verwandte), 137 `<!-- gd2 -->`. Ein Werkzeug, das `descriptionHtml` ganz ersetzt, würde diese Links löschen; `apply_einleitungen.py` behält alles ab der ersten Markierung (Selbsttest).
2. **Ein Satz mit einem Datum ist ein Verfallsdatum:** beim Schreiben von Texten, die ein Datum nennen, gleich festhalten, wann sie falsch werden, oder das Datum weglassen. Der Adventskalender-Satz war schon falsch, bevor jemand ihn las.
3. **Eine von Hand gesetzte JSON-Datei nicht mit `json.dump` neu schreiben:** das Format (Ein-Zeilen-Objekte) ging verloren und der Unterschied zeigte 186 statt 3 Zeilen; Neues als Text anhängen.
4. **Belege zählen statt behaupten:** das Werkzeug bricht ab, wenn eine Aussage des Textes in den Produkten ihre Mindestzahl nicht erreicht. So steht «Laptopfach» nur im Text, weil 16 Produkte es im Beschreibungstext nennen.
5. **Uhrzeiten nie aus dem Kopf eintragen:** ich schrieb zuerst «21:19» und «21:36» in README, Gedächtnis und Dashboard, gemessen waren 21:11 und 21:16 (Zeit der Sicherungsdateien), das Dashboard sogar mit einer Zeit in der Zukunft («21:40» bei 21:22). Vor jedem festen «Stand»-Text `date -u` lesen oder die Zeit aus der Sicherungsdatei nehmen.
