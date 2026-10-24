# Konkrete Vorarbeit für Claude Code

24.10.2026, Europe/Zurich. Ergänzung zu **LUXESTYLE_PROFIT_4_20261024**, Teilaufgaben 1 und 3. Die vier Aufgaben und sämtliche Grenzen stehen weiterhin in [README.md](README.md#luxestyle_profit_4_20261024). Diese Unterlagen wurden von Codex vorbereitet; Claude-Lesebestätigung und Ausführung sind unbekannt. Kein Shop-, Theme-, Ads-, Feed-, Flow- oder DNS-Write.

## 1. Zwei aktuelle Kostenreferenzen statt erfundener Marge

Shopify wurde frisch als LuxeStyle / luxestyle.ch / CHF bestätigt. Am 24.10.2026 um 21:30:10 UTC / 23:30:10 Europe/Zurich genau zwei bekannte Varianten gelesen; kein Katalogscan, keine erneute Umsatz-/Kennzahlenmessung. Beleg: [SHOPIFY-KOSTENREFERENZ-20261024.json](SHOPIFY-KOSTENREFERENZ-20261024.json).

| Produkt | Variante | Angebotspreis CHF | Gespeicherte Shopify-unitCost CHF | Rein rechnerische Differenz CHF |
|---|---|---:|---:|---:|
| Sternenlicht-Projektor für Schlafzimmer | 56197916361089 | 34.90 | 27.81 | 7.09 |
| Aroma-Diffuser in Holzoptik | 55743280021889 | 44.90 | 26.73 | 18.17 |

**Diese Differenzen sind weder Deckungsbeitrag noch Gewinn oder erlaubter Akquisepreis.** Die Steuerbehandlung des Angebotspreises, aktuelle CJ-Rechnung, Lieferantenversand, Import, Gebühren und Retouren sind nicht vollständig belegt. Ein gespeichertes unitCost-Feld belegt keine heutigen vollständigen Beschaffungskosten. Beide Produkte waren in dieser Abfrage ACTIVE; Tags, Inventory-Tracking/-Policy, Bilder und Storefront-Kaufbarkeit wurden hier nicht nochmals gelesen und müssen vor Verwendung nach dem Hauptauftrag aktuell geprüft werden.

### Direkt verwendbare Eingabevorlage

- [MARGENPILOT-20261024.csv](MARGENPILOT-20261024.csv): zwei Varianten, 40 erklärte Felder, UTF-8, Semikolon, Dezimalpunkt. Identitäten und Referenzen vorbefüllt; tatsächliche Nettoerlös-/Kosteninputs leer, Ergebnisse UNBEKANNT, Werbefreigabe NICHT FREIGEGEBEN. Keine ausführbaren CSV-Formeln.
- [MARGEN-SCHEMA-20261024.json](MARGEN-SCHEMA-20261024.json): Feldbedeutung, Belegpflicht und Rechenregeln. Die CSV ist eine Eingabevorlage, kein automatisch validierendes Rechenprogramm.
- Zusätzlich liegt in der aktuellen Codex-Umgebung eine Excel-Eingabehilfe mit getrennten Referenzen, Einnahmen und Kosten. Sie ist ein lokaler Download, kein vorausgesetzter Pfad in Claudes nächster Session. Eine Excel-Neuberechnung durch eine Tabellenkalkulations-Engine wurde nicht bestätigt.

**Claudes nächster Arbeitsschritt:** zuerst die beiden exakten Lieferantenvarianten sowie aktuelle Beschaffung, CH-Versand und enthaltene Kosten anhand legitim verfügbarer Belege abgleichen. CJ_API_KEY ist gemäss Inhaber-Screenshot in GitHub hinterlegt; das ist keine Runtimebindung oder bestätigte Anmeldung. Im aktuellen Codex-Lauf war keine CJ-Laufzeitbindung verfügbar. Keine Schlüssel auslesen oder erneut im Chat verlangen, keine Import-/Kauf-/Reviewjobs als Test starten. Prime-Vorteile erst nach Beleg anrechnen.

Danach Nettoerlös und Kosten pro klar definierter Basis erfassen: **eine Bestellung mit einer Einheit dieser Variante**. Andere Warenkörbe separat rechnen. Null ist nur mit Beleg zulässig. Bei Fremdwährung Originalbetrag, Währung, CHF je Einheit, Kursdatum und Quelle dokumentieren. Kundenversand einmal als Erlös, Lieferantenversand einmal als Kosten; gebündelte Positionen und bereits im Nettoerlös abgezogene Rückerstattungen nicht doppelt belasten. Fehlende Werte bleiben unbekannt.

Deckungsbeitrag vor Werbung = Nettowaren + Netto-Kundenversand − Einkauf − Lieferantenversand − zusätzliche Verpackung − Import − Zahlungsgebühren − übrige variable Gebühren − verbleibende Retourenabwicklung. Das ist kein Gewinn nach Fixkosten. Erst bei vollständig belegtem positivem Beitrag einen kostendeckenden CAC ableiten; Ziel-CAC braucht zusätzlich eine begründete Fixkosten-/Gewinnreserve.

Keine Gewinnerwahl aus der obigen Differenz. Einen dritten Kandidaten nur im bereits erlaubten kleinen Produktscope ergänzen, falls belegbar; ansonsten bei zwei bleiben und Lücke nennen. CHF 100 Fixkosten, 20/30/35% Marge und Wachstum bleiben historische Szenarioannahmen. CHF 150/Monat ist nur die Google-Ads-Prognoseannahme, keine Ausgabenfreigabe.

## 2. Kategorie-FAQ aus einem bekannten Stand rekonstruierbar

[FAQ-QUELLPATCH-20261024.json](FAQ-QUELLPATCH-20261024.json) enthält die exakten alten und neuen Blöcke, den engen Collection-ID-/Handle-Guard und Rohdateihashes. Damit kann Claude den vorhandenen Entwurf aus einer passenden frisch gelesenen Originaldatei rekonstruieren; alte Workspace-Dateien sind keine Voraussetzung.

Ziel: Collection **690626658689**, Handle **licht-nachtlicht-projektor**, MAIN-Theme **187533001089**, Datei **templates/collection.json**, JSON-Pfad **/sections/lux_faq/settings/custom_liquid**. Der heutige Quellen-Snapshot von 17:00:31 UTC hat MD5 **1137d372b40844b60ee7c56f841ebab4**. Die neue gezielte Theme-Abfrage um 21:30:10 UTC bestätigte weiterhin MAIN und denselben Dateichecksum; der ganze Rohtext wurde dabei nicht erneut geladen. Keine zwischenzeitliche Themeänderung daraus erfinden.

Vorgeschlagene Kaufhilfe nur für diese Collection:

**Was sollte ich vor der Wahl eines Projektors prüfen?**

Sieh dir zuerst die Produktansichten und die Angaben zur konkreten Ausführung an. Vergleiche Stromversorgung und Lieferumfang. Ob zusätzliche Funktionen oder bestimmte Motive dazugehören, muss für diese Ausführung ausdrücklich angegeben sein.

Die bisherige Grössenfrage bleibt im Nichtzielzweig exakt erhalten. Alle anderen Rohdateibytes einschliesslich Header-Kommentar erhalten; nicht das gesamte Template neu formatieren. Vor späterer Umsetzung Shop, Collection-Zuordnung, MAIN-Rolle und vollständige Quellhashes frisch prüfen. Bei Abweichung stoppen, Entwurf neu gegenlesen. Engen Diff und Rücksetzbytes sowie Ziel-/Nichtziel-Vorschau vorbereiten. **Das ist ein Quellenpatch zur Freigabe, keine Theme-/Browserabnahme und keine Umsetzungserlaubnis.** Main-Theme-Schreibgrenzen nicht umgehen.

## 3. Damit die vier Aufgaben ohne Doppelarbeit weitergehen

1. Aufgabe 1 mit der neuen Vorlage fortsetzen und tatsächliche Kosten belegen. Nicht erneut dieselben Tages-Kennzahlen abfragen; neuer Zweck allein hebt die Tagesgrenze nicht auf.
2. Aufgaben 2/3 mit bestehenden Produktseiten-/Kategorieentwürfen und **LUXESTYLE_GOOGLE_FREE_20261024** fortführen. Vorhandene Firecrawl-Ergebnisse der anderen Session nutzen, keinen parallelen Crawl starten. Bereits beantragte/indexierte URLs nicht als neue Arbeit ausgeben.
3. Aufgabe 4 als bedingten Ads-Plan ausarbeiten. Unbekannte Marge oder Purchase-/Consent-Messung blockiert einen späteren Start. Keine Kampagne, kein Budget, kein Tracking aktivieren.
4. Ergebnisse mit Task-ID, tatsächlichem Ausführenden, Quellen/Datum, engen Diffs, offenen Voraussetzungen und nächstem Schritt dokumentieren. Die Ablage dieser Dateien ist keine Claude-Lesebestätigung und keine produktive Ausführung.

Öffentliche Versandgrenze CHF 50, interne CHF 45 nach Rabatt und account.luxestyle.com.co bleiben erhalten. Keine Kunden-/Lieferantenansprache, Installationen, Workflowstarts, Deployments oder kostenpflichtigen Renders. Der professionelle Film-Master bleibt ein separater offener Arbeitsstrang, aktuell ohne Voiceover.

## Prüfstatus

CSV-Feldzuordnung und unbekannte Inputs wurden lokal gegen das Schema geprüft. Synthetische Rechengates betreffen die lokale Referenzlogik, keine tatsächliche Profitabilität und keine Excel-Engine-Abnahme. Der FAQ-Einzelblock, Guard und erwartete Vorher-/Nachherhash wurden lokal gegen die vorhandenen Quell-/Vorschlagsdateien geprüft; Liquid-/Theme- und Browserdarstellung bleiben offen.

Die gezielte Shopify-GraphQL-Leseabfrage wurde erfolgreich ausgeführt. Die zusätzliche lokale Standalone-Validierung scheiterte an fehlenden gebündelten Schema-Assets; der MCP-Validator meldete skipped. Deshalb wird keine erfolgreiche unabhängige Codevalidierung behauptet. Die erhaltenen Daten bleiben als native Leseantwort mit begrenztem Scope dokumentiert.
