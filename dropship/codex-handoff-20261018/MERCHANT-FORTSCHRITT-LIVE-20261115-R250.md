# R250 – Acht weitere Merchant-Angebote korrigiert und alle18 historischen Fehlergruppen erschlossen

Stand:15.11.2026, Europe/Zurich. **Acht bestätigte Merchant-Writes**, keine neuen Quellen oder Angebote, keine Shopify-Preis-/Produktänderung. Jedes Zielattribut ist nach Verarbeitung frisch zurückgelesen. «0 Fehler» bleibt ein offenes Ziel.

| Bestehendes Angebot | Tatsächliche Änderung | Kostenlose Einträge CH | LI |
|---|---|---|---|
| Nagel-Haftkleber10424180612693210499 | availability IN_STOCK | Seitenabruf ausstehend | Versanddienst fehlt |
| Solar-Klemmlampe14628552787511354609 | availability IN_STOCK | genehmigt; Zertifizierungshinweis NOT_IMPACTED bleibt | Versanddienst fehlt |
| Luftfiltergewebe10190093650697108457 | availability IN_STOCK | Seitenabruf ausstehend | Versanddienst fehlt |
| Blumen-Bausteine11153645285677520297 | availability IN_STOCK | Seitenabruf ausstehend | Versanddienst fehlt |
| Dunkelgrüne Nagelspitzen11475833036656580588 | availability IN_STOCK | Seitenabruf ausstehend | Versanddienst fehlt |
| Kreuzstich-Set11930962514331867978 | availability IN_STOCK | genehmigt | Versanddienst fehlt |
| Abendkleid10331114122872641331 | bewusst Rosarot/M, Variante56063650038145, SKU CJ-CJLY296573702BY; CHF23.90, Titel/Link exakt | genehmigt | Versanddienst fehlt |
| Pullover10704451301477423979 | bewusst Orange/M, Variante67663227617671, SKU CJMY297129252ZA; CHF15.90, Titel/Link exakt | genehmigt | Versanddienst fehlt |

Die beiden Bekleidungsangebote wurden auf eine klare aktuelle Auswahl begrenzt. Die alten grössenlosen Angebote wurden nicht durch einen geratenen Mindestpreis ergänzt. Exakte native Varianten, SKU, CHF-Preis, vorhandene farbpassende Bilder, öffentliche Auswahl, Canonical und Kaufbarkeit geprüft. Root hat beide realen unveränderten Hauptbilder angesehen. Der Pullover hat mehr als50Varianten; die gewählte Variante wurde direkt perID gelesen, kein Vollvarianten-Sweep behauptet.

Bei den sechs Verfügbarkeitsfällen sind die Produkte ACTIVE, Tags nicht leer, exakte Einzelvarianten öffentlich kaufbar, Inventar untracked/CONTINUE mit Zähler0. IN_STOCK bildet die aktuelle Bestellbarkeit ab, keine physische Stückzahl oder Lieferfrist. Vorhandene rueckhol-/auswahl-offen-Tags bleiben; daraus entsteht keine Social-Freigabe.

## Schutz und Verarbeitung

Vor Writes aktuelle Gegenproben und konkrete Felddiffs. Google verarbeitete mehrere Änderungen zeitversetzt: zunächst angenommene Writes mit unveränderten Rücklesedaten als unbestätigt geführt und **nicht erneut gesendet**. Später alle acht Ziele bestätigt. Sieben vollständige Vergleiche ausserhalb der Zielfelder sind gleich. Bei der Solarlampe erschien zusätzlich ein weiteres Bild in additionalImageLinks; unsere Parameter enthielten nur availability. Das Bild ist als vorhandenes natives Produktmedium bestätigt, seine Änderungsursache unbekannt. Keine pauschale Gleichheitsbehauptung und keine Rücksetzung fremder Änderungen.

Bestehende Ergänzungsquelle10795447118, Link zur AUTOFEED-Hauptquelle10678939025 frisch bestätigt. Register von12 auf20 Einträge ergänzt; frühere12Records identisch erhalten. Aktuelle Staaten stehen getrennt in latestStatusByOffer und überschreiben keine historische Herkunft. Native IDs/SKUs/CHF-Preise/ACTIVE-Status der früheren12 Varianten erneut geprüft.

## Konkreter nächster Blocker: Merchant-Versand nach Liechtenstein

Neun Angebote im aktuellen20er-Register zeigen jetzt missing_shipping_no_shipping_service_defined_for_country für LI, einschliesslich des Fächers ausR249. Das ist ein aktueller Teilbefund, keine globale Quote. CH ist im neuen8er-Satz viermal genehmigt und viermal Crawl-pending.

Die öffentliche [Versandrichtlinie](https://luxestyle.ch/policies/shipping-policy) und das allen neun exakten Varianten zugeordnete Shopify-Profil132124180865 belegen bereits **LI CHF14.90 pro Bestellung, ohne Gratisversand**. Der aktive Dienst heisst Standard Liechtenstein. In Shopify fehlt dieser Tarif also nicht. Ob und wie er in Merchant als aktiver Versanddienst für Quelle10678939025 zugeordnet ist, bleibt ungeklärt. Die verfügbaren Merchant-Schreibaktionen bieten keine Versanddienst-Verwaltung und kein shipping-Feld für update_product; hier fehlt der technische Schreibzugang für diese Einstellung. Keine Versandkosten oder Laufzeiten erfunden, keine Länder/Ausschlüsse zum Verbergen der Fehler entfernt.

Die absichtlich unterschiedliche öffentliche CHF50-/interne CHF45-Schwelle und Kundendomäne bleiben unverändert. Weder Zertifizierungen noch medizinische/Alters-/Richtlinienfreigaben erfunden. Account-Issues-API aktuell leer; das bedeutet nicht, dass keine Produktprobleme bestehen.

## Die18 Fehlergruppen sind jetzt dokumentiert

Beide früher geteilten Drive-CSV-Dateien vom14.11.2026 vollständig gelesen. Erste Datei1,255,239Bytes/3,555Zeilen; zweite306,795Bytes/1,048Zeilen. Doppelte Titel-Spalten positionsgebunden geparst. Nach Deduplizierung nach Problem/Offer/Land: **18 Ablehnungsgruppen plus1Verarbeitungsgruppe**,2,005 historischeOffer-IDs. Dies sind keine heutigen Gesamtzahlen. Alle Gruppen mit Schweregrad, historischen Einzelfallzahlen und Beispielen sind in [Gruppen-CSV](MERCHANT-DIAGNOSE-GRUPPEN-20261115-R250.csv) und [Quellenbeleg](MERCHANT-DIAGNOSE-QUELLEN-20261115-R250.json) aufgeführt.

Es geht neben Preis/Verfügbarkeit/Versand u.a. um Bildoverlays, Bildauflösung, nicht verfügbare Produktseiten und verschiedene Richtlinienfälle. Nicht alle Probleme lassen sich durch Produkttextänderungen lösen oder durch Entfernen von Sperren rechtmässig beseitigen. Ein anfänglicher404 der ersten Drive-ID beruhte auf einer vertippten ID; die korrekte ID war lesbar, die Datei ist nicht fehlend.

Die getrennte R240-Teilarbeitsliste bleibt bei144Preis-/19Verfügbarkeitsfällen: jetzt9Preis-/11Verfügbarkeitsattribute überR247–R250 gezielt korrigiert; fünf weitere Preisfälle frisch geblockt (unaufgelöste Auswahl bzw.DRAFT/nicht versendbar),130Preis-/8Verfügbarkeitsfälle darin heute nicht erneut verifiziert. Diese Teilmengen nicht mit den historischen2,005Offers vermischen.

## Fortsetzung und Claude

1. In Merchant zuerst den bestehenden LI-Versanddienst und seine Quellenzuordnung prüfen; belegter Shopify-/Policy-Tarif14.90CHF, kein Gratisversand. Nur mit legitimer Versanddienst-Schreibmöglichkeit korrigieren, danach die neun betroffenen Offers getrennt lesen. Versandzeiten nicht aus allgemeinen Richtwerten erfinden.
2. Die vier neuen CH-Crawl-Fälle nach Google-Verarbeitung gezielt lesen; keine Wiederholung bereits bestätigter Writes. Frühere zusätzliche Crawl-Fälle bleiben im Register.
3. Als nächste kleine Gruppe aktuelle Fälle je historische Fehlergruppe prüfen. ProOffer tatsächliche Primärquelle/Feedlabel/Variante beachten: die19 Gruppen enthalten mehrere Quellen, nicht alles über das AUTOFEED-Supplement schreiben. Bei Richtlinienfällen keine ungeprüften Einsprüche, Entfernung von Holds oder Produktänderungen zur Umgehung.
4. Fünf Auswahl-/DRAFT-Blocker nicht mit geratenen Preisen, Aktivierung oder neuem Angebot übergehen. Originale Produkt- und Filmrechtsblocker bleiben.

[Kurzer direkter Einstieg für Claude](CLAUDE-DIREKTSTART-20261115-R250.md). Die zwei im Screenshot genannten Original-ZIPs wurden im aktuellen Arbeitsbereich und in der Standardbranch-Dateisuche nicht gefunden; Inhalt/Download-URLs bleiben unbekannt. Der neue Einstieg ist kein behaupteter Ersatz dieser ZIPs. Keine Kenntnisnahme durch Claude belegt.

Keine neuen Social-Posts, Tageskennzahlen, Klaviyo-Abfragen, Kauf-Watchs, Themes, Budgets, Flows, DNS oder zusätzlichen Automationen. Der aktuelle MAIN-Code wurde nur gelesen; die alte OG-Preisvorbereitung bleibt unveröffentlicht und ist kein bewiesener Grund für Google-Crawlfehler.
