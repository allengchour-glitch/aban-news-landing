# R247 – Zwei Merchant-Pflichtattribute korrigiert – 15.11.2026

Auf **«weiter bis 0 fehler»** zwei belegte Pflichtattribute bestehender Google-Angebote live korrigiert. Die unabhängige Rücklesung bestätigt **Primer CHF 56.90 und FREE_LISTINGS-Freigabe für CH/LI**. Beim **Elefanten-Wandteppich ist IN_STOCK vorhanden**, die Google-Seitenprüfung bleibt **pending**. **Kein Beleg für 0 Gesamtfehler oder die vollständige Auflösung der 18 UI-Gruppen.**

## Was tatsächlich geändert wurde

| Bestehendes Angebot | Frischer Produktbeleg | Exakter Write | Unabhängiges Ergebnis |
|---|---|---|---|
| Primer10283932347178265394, de/CH | Produkt15523176841601, Variante56210226708865, CJMJ173930601AZ; ACTIVE, CHF56.90, öffentlich kaufbar, untracked/CONTINUE | Nur price56.90/currencyCHF | Preis fehlt nicht mehr. FREE_LISTINGS approved CH und LI. Hinweis Grundpreismenge bleibt NOT_IMPACTED; keine erfundene ml-/g-Angabe. |
| Wandteppich10301937935043325310, de/CH | Produkt15493244191105, einzige Variante56075316363649; CHF15.90, ACTIVE, öffentlich kaufbar, untracked/CONTINUE | Nur availabilityIN_STOCK | Attribut bestätigt. Fehler «availability fehlt» weg; landing_page_pending_crawl bleibt, Länder CH/LI pending. Keine Freigabe behauptet. |

Die primäre Quelle bleibt **AUTOFEED10678939025**. Die aktuelle Connector-Funktion `create_data_source(type=supplemental, link_to_primary_data_source=...)` wurde zuerst entdeckt und geprüft. Nach frischer Quellenliste wurde genau **eine API-Ergänzungsquelle10795447118**, «LuxeStyle – AUTOFEED Pflichtattribute», angelegt. Ein gezielter Readback bestätigt ihren Typ und die Verknüpfung mit10678939025. Kein neues Primärangebot und keine neue Primärquelle.

Der erste, im Connector-Schema gültige Antrag mit Sprache/Feed-Label wurde von Google wegen `supplementalProductDataSource.feedLabel Unexpected field` zurückgewiesen. Die Gegenliste zeigte keine neue Quelle. Der korrigierte Antrag liess beide optionalen Felder weg. Die Quelle ist daher ohne Sprachfilter; die zwei tatsächlich geschriebenen Einträge sind strikt über **bestehende Offer-ID + de + CH** gebunden. Das ist ein korrigierter, dokumentierter Antrag nach eindeutiger Ablehnung, kein blinder Retry eines unklaren Writes.

Die ungezielte Quellenliste zeigte unmittelbar nach Erfolg noch die alten vier Einträge. Der gezielte Read der bestätigten neuen Quellen-ID lieferte die neue Quelle. Eine kombinierte Windsor-Produktabfrage endete mit **MCP request timed out**; das ist weder leer noch0. Statt erneuter Writes wurden dieselben zwei Angebote unabhängig über HYPD gelesen. Beide Writes und ihre tatsächlich verarbeiteten Attribute sind bestätigt.

## Gegenproben und Schutz

Shopify **LuxeStyle/luxestyle.ch, CHF, Europe/Zurich**, Metricool **6227837 samt allen sechs Kanalidentitäten** und Merchant **5797470070/LuxeStyle CH** frisch bestätigt. Native Produkt-/Variantenwerte und öffentliche HTML-/product.js-Abrufe stimmen; beide Seiten HTTP200, kein fremdes Redirectziel. Bestand0 ist bei untracked/CONTINUE kein Ausverkaufsbeweis. IN_STOCK beschreibt die aktuelle Bestellbarkeit, kein physisches Lager oder Lieferdatum.

Vor beiden Writes konkreter Ergänzungs-Diff. Nachher dieselben Angebotsressourcen, Primärquelle, Sprache, Feed-Label, sämtliche nicht betroffenen Produktattribute und customAttributes identisch. Auch Sperren/Ausschlüsse bleiben erhalten. Beim Wandteppich bleibt insbesondere `rueckhol-0907` als Social-Sperre erhalten. Keine Shopify-, Bild-, Social-, Theme-, Budget-, Rabatt-, Flow-, Versand- oder DNS-Änderung.

**Folgelauf:** bestehende Quelle10795447118 gezielt lesen und wiederverwenden. Niemals wegen einer alten ungezielten Liste erneut anlegen. Feste Ergänzungswerte können veralten: vor Nutzung die exakte Shopify-Variante, Preis und Bestellbarkeit neu gegenprüfen; bei echter Änderung nur diesen Override korrigieren oder ausschliesslich den Eintrag aus der Ergänzungsquelle entfernen. Das stellt die Primärwerte wieder her. **Keine automatische Preissynchronisation deployt**, keine neue Automation/Frequenz. Register: [MERCHANT-ERGAENZUNGEN-REGISTER-20261115-R247.json](MERCHANT-ERGAENZUNGEN-REGISTER-20261115-R247.json).

## Was offen bleibt

- **Malen nach Zahlen10073494240929787683:** fehlender Preis; aktuelle18Varianten zu CHF20.90/24.90/26.90. Generischer Elternlink ohne eindeutige Einzelvariante. Kein beliebiger Mindestpreis eingesetzt.
- **Schmuckbox10784371818943082880:** fehlender Preis; aktuelle20Varianten zu CHF14.90/15.90/16.90. Ebenfalls keine eindeutige Angebots-/Variantenbindung. Erst konkrete Bild-/Modellzuordnung nachweisen.
- **Waage shopify_ZZ_15502258831745_68193799242119:** Google landing_page_error weiterhin offen. Exakte Variante ACTIVE, öffentlich CHF127.90/kaufbar; aktueller Merchant-Link HTTP200 und passender Handle. Kein DRAFT-/404-/veralteter-Linkbeleg. OG-Preis101.90 weicht vom gewählten Preis127.90 ab; Ursache des Google-Fehlers dadurch nicht bewiesen. Kein sinnloser identischer Link-Write oder fingierter Neucrawl.
- **Garagentorbild R240:** geeigneter Kandidat vorbereitet, aber kommerzielle Rechte und Produkt-/Sensor-/Porttreue offen; Nagellackfreigaben gelten dafür nicht.
- Weitere Richtlinien-/Mengen-/Konformitätsfälle und die vollständigen18UI-Gruppen bleiben getrennte offene Arbeit. Historische begrenzte5000er-/200er-Messung nicht als Vollkatalog oder aktuelle18-Gruppen-Bestandsaufnahme ausgeben.

[Nachweise](MERCHANT-PFLICHTATTRIBUTE-BELEGE-20261115-R247.json) · [Sechs konkrete Rest-/Kontrollfälle](MERCHANT-RESTARBEIT-20261115-R247.csv). Drei erfolgreiche Mutationen: eine Ergänzungsquelle und zwei Attributkorrekturen; zusätzlich ein abgelehnter Quellenantrag. Kein zusätzlicher Tageskennzahl-/Flow-/Bestellreport, kein Kauf-Watch. Günstige Teilaufgabenmodelle für unabhängige Prüfung verwendet. Claude-Code-Empfang bleibt unbekannt.

[LUXESTYLE_R247_20261115]
