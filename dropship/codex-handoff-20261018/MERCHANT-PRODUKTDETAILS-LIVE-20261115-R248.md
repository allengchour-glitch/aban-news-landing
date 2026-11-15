# R248 – Weitere Merchant-Preisfehler und Produktdetails live verbessert – 15.11.2026

Auf **«mehr»** zwei weitere konkrete Merchant-Angebote mit belegten Variantenpreisen korrigiert. Beide sind unabhängig als **FREE_LISTINGS approved CH/LI** mit **keinen gemeldeten Artikelproblemen** zurückgelesen. Dazu zwei Produktseiten mit tatsächlichen Auswahl-/Mass-/Lieferumfangsangaben verbessert. **Keine0-Gesamtfehler-Aussage; die vollständigen18UI-Gruppen bleiben nicht vollständig aktuell erfasst.**

## Google-Angebote: tatsächlich korrigiert

| Bestehendes Angebot | Exakte Zuordnung / neue Werte | Bestätigtes Ergebnis |
|---|---|---|
| Schmuckbox10784371818943082880 | Hauptbild-Hash eindeutig an Variante67821514326407, SKU CJYD279122109IR: Dunkelgrün/lange Box, CHF16.90. Preis ergänzt, vorhandenen Link auf diese genaue Variante mit CH/CHF präzisiert. | FREE_LISTINGS approved CH und LI, itemLevelIssues leer. Alle übrigen Attribute, Bilder, Primärquelle und Ausschlüsse erhalten. |
| Malbild10073494240929787683 | Das Hauptbild identifiziert MotivB, aber keine der drei Grössen. Deshalb **bewusste transparente Angebotsbegrenzung** auf bestehende Variante67821433094535/CJZS115447505EV, **MotivB50 ×65cm, CHF24.90**. Titel enthält Motiv und Grösse, Link öffnet exakt diese Variante. | Preis/Titel/Link und FREE_LISTINGS approved CH/LI unabhängig bestätigt, itemLevelIssues leer. Das ist keine Rekonstruktion einer unbekannten Altgrösse und kein Eltern-Mindestpreis. |

Nur **zwei Updates** über die frisch verifizierte bestehende Supplemental-Quelle **10795447118**, weiterhin mit **AUTOFEED10678939025** verknüpft. Keine weitere Quelle, keine neuen Offers. Der aus R247 freigegebene Primer bleibt als früherer Beleg erhalten; die drei konkret untersuchten fehlenden Preisfälle sind damit gezielt korrigiert, kein Vollkatalogbefund. Beim Wandteppich ist die weitere Einzelstatusprüfung weiterhin **landing_page_pending_crawl / CH+LI pending**. Keine erneute Verfügbarkeitsänderung.

Shopify, Metricool6227837 samt sechs Kanalidentitäten und Merchant5797470070/LuxeStyleCH frisch bestätigt. Vor Writes aktuelle ACTIVE-Produkte, exakte IDs/SKUs/CHF-Preise, nicht leere Tags, untracked/CONTINUE und öffentliche Kaufbarkeit geprüft; konkrete Diffs gespeichert. Für beide beworbenen Varianten aktuelle echte Seiten HTTP200 und passende Produkt-/Variantenangaben; Malbild zusätzlich exaktes JSON-LD-Offer24.90CHF. Bei Bestand0 keine physische Lager- oder Lieferzusage.

## Produktdetails und Auswahlfelder: live

**Malbild15497440854401:** zwei Auswahlfelder heissen jetzt «Motiv» und «Bildgrösse». Sechs Motive und drei Grössen40×50,50×65,60×75cm sind in18aktuellen CJ-SKUs nachvollzogen. Beschreibung und Meta-Description erklären die Auswahl und den Preis pro Ausführung. Unbelegte Zusagen «alles enthalten» und «inklusive DIY-Rahmen» entfernt. Packliste nennt ein Malbild; ob Farben, Pinsel und Rahmenteile enthalten sind, bleibt sichtbar unbestätigt. Materialangabe Leinen ohne erfundene100%-Zusammensetzung oder Ölfarbenzusage.

**Schmuckbox15496378417537:** alle20CJ-Variantenbilder über fünf Farben visuell geprüft und SKU-/Massangaben zugeordnet. Das Feld «Ausführung und Masse» zeigt die vier belegten Angaben direkt am Wert:

| Ausführung | Boxmasse laut Produktbild |
|---|---|
| Ringbox |6.3 ×6.3 ×6.5cm|
| Anhängerbox |7.3 ×8.3 ×5cm|
| Armbandbox |9.5 ×9.5 ×5cm|
| Lange Box |23.5 ×5.5 ×4cm|

«Lange Box» ersetzt die ungesicherte enge Verwendungszusage «Lange Kettenbox», weil die Bildaufschrift «BraceletBox» lautet. Keine Eignung für jede Kette behauptet. Beschreibung nennt die fünf Farben, PU-Leder/Kunstleder, genau eine gewählte Box und keinen mitgelieferten Schmuck. Die unklare «Toleranz0.01» entfernt. Hersteller-Bildmasse sind keine unabhängige Vermessung und keine bestätigten Innenmasse. Zusammensetzung des Innenfutters unbekannt.

**Sechs native Writes:** drei bestehende Optionsdatensätze mit vier umbenannten Werten; zwei Beschreibungs-/Meta-Aktualisierungen; ein zusätzlicher konkreter Bildhinweis. LEAVE_AS_IS, userErrors=[] und Gegenproben; keine Variante/Werte angelegt oder gelöscht. **38Varianten-IDs,18Optionswert-IDs,26Medien sowie alle SKU-/Barcode-/Preis-/Inventar-/Tag-/Taxonomie-/SEO-Titelwerte erhalten.**20Schmuckbox-Variantentitel automatisch aus den neuen Werten gebildet. Eine erste strenge HTML-Gleichheitsprüfung reagierte auf drei Shopify-Zeilenumbrüche; nach Normalisierung ausschliesslich zwischen Tags war der vollständige erwartete Diff bestätigt. Kein Wiederholungswrite.

## Öffentliche und mobile Prüfung

Zwei öffentliche HTML-/product.js-Abgleiche bestätigen Beschreibungen, Meta-Descriptions, Canonicals, aktuelle Optionen und alle Varianten. Geschützte öffentliche Daten vor/nachher hashgleich. Mobil390×844 zuerst die Auswahlzustände und danach echte sichtbare Klickfolgen geprüft: MotivC→B mit50×65 sowie Rot→LangeBox→Dunkelgrün. URL und Kaufformular-ID führen jeweils exakt zur richtigen Variante mitCHF24.90 bzw.CHF16.90. Passende Bilder sind sichtbar. Lange Masslabels sind lesbar; die Seite läuft horizontal nicht über. Vorhandene Bildauswahl ersetzt bewusst die versteckten nativen Motiv-/Farbfelder; ein Feld mit0×0 ist deshalb nicht automatisch defekt. Keine Warenkorb-/Checkoutaktion und keine Testbestellung.

Die neuen Shopify-Beschreibungen sind öffentlich bestätigt. Dass die automatisch gecrawlte Google-Quelle bereits dieselben neuen Langtexte übernommen hat, ist nicht bestätigt; die Preis-/Titel-/Link-Rücklesungen belegen ausschliesslich die gezielt geschriebenen Felder.

## Konkrete offene Bildkorrektur

Die hellgraue Armbandbox67821514686855/CJYD279122120TG zeigt mobil tatsächlich das kleinere Anhängerboxfoto7.3×8.3×5 statt der zur SKU gehörenden grossen Box9.5×9.5×5.19/20Variantenbilder stimmen im Dateinamen abgleichbar überein; dieser20.Fall hat eine geteilte Shopify-Bildzuordnung. Das richtige CJ-Foto ist konkret geprüft, aber nicht als bestehendes passendes Produktmedium gefunden. **Rechte-/Produkt-/Farbtreuebestätigung für genau dieses Ersatzfoto beim Inhaber angefragt, noch offen. Keine Medien hochgeladen oder umgehängt.** Die ältere Nagellackfreigabe gilt dafür nicht.

Bis zur verifizierten Bildkorrektur steht ein konkreter Hinweis zur Hellgrau/Armbandbox-Auswahl live im Produkttext. Der Hinweis ist erst nach tatsächlichem Upload, korrekter Varianten-Media-Zuordnung und nativer/öffentlicher/Mobil-Rücklesung zu entfernen; eine Zusage allein ist kein Umsetzungsbeleg. [Konkreter Bildfall](BILDZUORDNUNG-HELLGRAU-20261115-R248.md).

## Weitere Vorbereitung und Kontinuität

Der Waagen-OG-Befund ist abgegrenzt: genaue JSON-LD-Variante68193799242119/SKU CJZN170995619SH korrekt beiCHF127.90; OpenGraph benutzt auf Parent- und Varianten-URL den Eltern-Mindestpreis101.90. Aktueller MAIN-Code `snippets/meta-tags.liquid` frisch gelesen; enger Diff für `selected_or_first_available_variant` vorbereitet. **Kein Theme-Write/Publish; keine bewiesene Ursache für Googles landing_page_error.** [Nicht angewendeter OG-Diff](OG-VARIANTENPREIS-ENTWURF-20261115-R248.patch).

[ErgänzungsregisterR248](MERCHANT-ERGAENZUNGEN-REGISTER-20261115-R248.json) erhält die zwei R247-Einträge unverändert und ergänzt zwei neue. Feste Titel-/Link-/Preiswerte können nach Shopify-Änderungen veralten: im nächsten bestehenden Lauf exakt prüfen, nur den jeweiligen Supplemental-Eintrag aktualisieren/entfernen; keine automatische Preissynchronisation deployt und keine neue Automation/Frequenz. Keine Sperren/Shopping-Ausschlüsse pauschal entfernt, keine Budgets/Rabatte/Flows/DNS/Versandwerte oder Kundenkontaktdaten geändert; kein Kauf-Watch oder Tagesreport wiederholt. Keine neuen Social-Posts, Video-Renders oder andere Marken bearbeitet.

[Belege](MERCHANT-PRODUKTDETAILS-BELEGE-20261115-R248.json) · [Produkt-/Auswahldiff](PRODUKTDETAILS-AUSWAHL-DIFF-20261115-R248.patch). Produktdetails bleiben Priorität1, auch direkt in der Auswahl. Claude-Code-Empfang unbekannt.

[LUXESTYLE_R248_20261115]
