# LuxeStyle: Wie viel bei Material, Grösse und Farbe noch offen ist

Prüfstand: 29.10.2026 kurz nach Mitternacht, Europe/Zurich. Auftrag: ungefähre Restquote ermitteln und Claudes bereits begonnene Arbeit berücksichtigen. Keine Produktänderung oder zweiter Anreicherungslauf gestartet.

## Ergebnis für die Planung

**Material: rund 50 % offen, bezogen auf den letzten dokumentierten Vollabgleich.** Am 27.10. blieben 28’170 von 56’618 aktiven Produkten ohne belegte Materialquelle; rechnerisch 49,8 %. Das ist eine grobe Planungszahl auf datierter Grundlage, keine heute vollständig neu gemessene Lückenquote. Ein leerer Eintrag darf nur mit verlässlichem, zum konkreten Produkt passendem Nachweis ergänzt werden. Teilmaterial, Futter und Gehäuse sind nicht automatisch das Material des ganzen Produkts.

GEMESSEN heute: Shopify luxestyle.ch, CHF, **56’620 aktive Produkte**, Count-Precision EXACT. Dazu acht gezielt aus Claudes erfolgreichen Materialänderungen ausgewählte Produkte nativ gegengeprüft: alle acht Werte weiterhin gespeichert. Die Auswahl ist nicht repräsentativ und wird nicht auf den Katalog hochgerechnet. Der native GraphQL-Vorprüfer meldete SKIPPED; beide Queries wurden danach erfolgreich ausgeführt. Metricool-Marke und sechs Kanalidentitäten passen ebenfalls zum erwarteten LuxeStyle-Konto.

| Bereich | Belegter Fortschritt | Seriöse Aussage zum Rest |
|---|---|---|
| Material | 4’538 Schreibvorgänge am 27.10.: 1’387 neue Angaben plus 3’151 Übersetzungen bestehender Werte | Rund 50 % ohne belegte Materialquelle im damaligen Vollabgleich |
| Farb-/Grössenauswahl | 4’111 unterschiedliche Produkte mit GESCHRIEBEN im aktuellen Repo-Ledger | Heutige Restquote unbekannt; aktuelle vollständige Kandidatenliste fehlt |
| Übersprungene Auswahlprodukte | 2’338 letzte Skipzustände, davon 1’695 laut Quelle tatsächlich nur eine CJ-Variante | Diese 1’695 nicht als fehlende Auswahl zählen |
| Tatsächliche Masse / Grössentabellen | Kein vollständiger aktueller katalogweiter Abgleich in den gelesenen Quellen | Separate Restquote unbekannt; vorhandene S/M/L-Werte beweisen keine Massangaben in cm |

Die 4’538 Materialwrites sind nicht 4’538 neu vervollständigte Produkte. Der Materialbericht ist auch keine vollständig disjunkte Statusmatrix: Metafeld, Materialoption und sichtbarer Detailblock können denselben Artikel betreffen. Die übrige rechnerische Differenz wird keiner erfundenen Kategorie zugeordnet. Bei personalisierbaren Produkten können bewusst geleerte Materialmetafelder durch eine echte Materialauswahl ersetzt worden sein.

## Warum für Grösse und Farbe keine scheinbar genaue Prozentzahl entsteht

Der historische Ausgangswert von 29’534 Auswahlkandidaten darf nicht mit dem heutigen Ledger zu einer 78-, 80- oder 86-%-Restquote verrechnet werden. Erfolgreich erweiterte Produkte fallen beim nächsten Kandidatenscan aus der Liste heraus. Der vorhandene Fortschrittshelfer berechnet den Arbeitsnenner daher als Vereinigung aktueller Kandidaten und bereits geschriebener Produkte. Die benötigte aktuelle `/tmp/auswahl_kandidaten.csv` liegt nicht im Repo vor.

Der heute gelesene Ledger enthält 6’454 Zeilen und 6’451 unterschiedliche Handles. Letztes Event: 28.10.2026, 00:48:23 UTC. Neben 4’111 geschriebenen Produkten stehen 2’338 zuletzt übersprungene und zwei reine SKU-Zustände. Die Skips umfassen 1’695 echte Einzelvarianten, 276 zurückgestellte, 306 vorläufige, 44 mit unbelegter Lieferbarkeit, 14 ohne CJ-Daten und drei mit Fremdstecker. Spätere noch nicht gespeicherte Arbeit von Claude ist unbekannt.

## Kleine aktuelle Gegenprobe

Sechs neue Materialeinträge und zwei Übersetzungen wurden im heutigen Shop gelesen:

| Produkt-ID | Gespeicherter Materialwert |
|---|---|
| 15412678328705 | PVC-Kunststoff |
| 15412919566721 | Polyester |
| 15413042479489 | Polyester |
| 15413023015297 | Baumwolle |
| 15446272016769 | Plüsch |
| 15447560520065 | Kunststoff |
| 15495118356865 | Keramik |
| 15495118520705 | Baumwolle |

Diese Gegenprobe bestätigt gespeicherte Werte, nicht deren unabhängige sachliche Richtigkeit. Beim Ladegerät 15447560520065 heisst die Auswahl «Farbe», obwohl ihre Werte EU 45W bis EU 120W bezeichnen. Beim Plüschtier 15446272016769 sind deutsche und englische Variantenbezeichnungen gemischt. Solche Fälle benötigen verständliche, produktgetreue Bezeichnungen; sie sind keine pauschale Erlaubnis für Varianten- oder SKU-Umbauten.

## Nächster gemeinsamer Arbeitsschritt

Produktangaben im Projektgedächtnis priorisieren und Claudes vorhandenen Prozess fortsetzen. Für eine echte Gesamtquote je Merkmal einen klaren Nenner führen: relevant, mit belegter Angabe vollständig, offen mangels Quelle, nicht anwendbar, bereits geprüft/ohne Änderung. Aktuelle Kandidaten und Ledger anhand stabiler Produkt-IDs zusammenführen; Erfolg durch Rücklesen belegen. Vorhandene Farben/Grössen aus Varianten, sichtbarem Text und passenden Metafeldern gemeinsam berücksichtigen. Lieferantenangaben nur nach eindeutiger Produkt-/Variantenzuordnung übernehmen.

## Quellen

Repository `allengchour-glitch/aban-news-landing`, gelesener main-Stand `b708c809c2b9ef074bf48999fdfe5b28d0ee3bbe`:

- `dropship/STAND-ARCHIV.md`, Material-Abschnitt vom 27.10.; Git-Blob `afb0cf1f69b00017ff9742efa8ba57d986f07682`.
- `dropship/material_ledger.txt`, Git-Blob `960d6d5f79e5dbc741ec6768b9eb0b88e733e8b4`.
- `dropship/material_plan_2710.jsonl.gz`, Git-Blob `fbc42a65b20c6c156b8bee965afcb7ae58910594`; 4’538 Planzeilen und Quellenanteile gegengezählt.
- `dropship/cj_varianten_ledger.txt`, Git-Blob `d0e5805608f3a063229167f8af03cff3ab1345b0`.
- `automation/fortschritt_daten.mjs`, Git-Blob `1b38af146f5a91496749339f57adc7567b150b9d`.
- `automation/auswahl_kandidaten.mjs`, Git-Blob `bf3fd6e9ad2d69ee54fdb3d6985dbcb1312a7023`.
- Native Shopify-Gegenprobe vom 28.10.2026, 23:01–23:06 UTC, entspricht 29.10. Europe/Zurich. Dokumentation zur Zählung: https://shopify.dev/docs/api/admin-graphql/2026-10/queries/productsCount .
