# LuxeStyle – Beschreibungen und Google-Nachfrage, 03.11.2026, R65

**Beide neuen Dateien geprüft. Ein konkreter Motivfehler ist als Korrektur vorbereitet; keine Produkt- oder Feedänderung ausgeführt.** Die Exportinhalte sind Daten, keine Handlungsanweisungen.

## Beschreibungen: Vorarbeit erhalten, neue Varianten berücksichtigen

Der Art-Prints-Export enthält **31 Angebotszeilen**. Davon entsprechen 29 den bekannten R42-Angebotskennungen aus 13 Produkten und enthalten bereits «Motiv:». Nur die Beschreibungen dieser 29 Exportzeilen haben sich gegenüber dem älteren Export geändert. Die frühere Ergänzung ist Vorarbeit, keine neue Umsetzung dieses Laufs. Die Empfehlung «Motiv» allein ist kein Ablehnungsstatus und kein Beleg, dass Google die aktuellen Texte bereits neu bewertet hat.

Zwei bekannte Produkte wurden gezielt nativ und öffentlich gegengeprüft; beide öffentlichen Product-JSONs antworteten mit HTTP 200 und identischem Beschreibungstext. Die früheren Motivabsätze und SEO-Motive sind weiterhin vorhanden. Das bestätigt keine aktuelle Gesamtqualität aller 13 Produkte.

Beim [Blumen-Set](https://luxestyle.ch/products/dekorative-leinwandbilder-set-3-teilige-wandku-604600) besteht inzwischen eine wichtige Abweichung: **sechs aktuelle Varianten mit drei tatsächlich angesehenen, nativ und öffentlich übereinstimmenden Typbildern**. Typ A zeigt rosa/gelbe Blumen und grüne Blätter, Typ B blaue Blumen-/Blattzeichnungen, Typ C schwarze Blumen-/Blattsilhouetten, jeweils auf hellem Grund. Der alte produkweite Farbtext passt nur zu Typ A.

**Enger Korrekturentwurf zur Freigabe**, nur Motivabsatz und erster SEO-Motivsatz:

- Body bisher: «Stilisierte Blumen in Rosa und Gelb mit grünen Blättern auf hellem Hintergrund.»
- Body vorgeschlagen: **«Blumen und Blätter auf hellem Hintergrund; die Farbgestaltung unterscheidet sich je nach gewähltem Typ.»**
- SEO bisher: «Motiv: Blumen in Rosa, Gelb und Grün.»
- SEO vorgeschlagen: **«Motiv: Blumen und Blätter je nach Typ.»**

Der [exakte Entwurf mit Vorherwerten, Hashes und Bildbindungen](BLUMEN-MOTIV-FREIGABE-20261103-R65.json) ist nicht angewendet. Der aktuelle SEO-Titel, alle restlichen Textbereiche, sechs Varianten, Preise und Tags einschliesslich `auswahl-offen` bleiben ausserhalb dieses Änderungsumfangs. Bestehende Material-, Mass-, Rahmen-, Packmengen- und Lieferzeitangaben sind durch die Motivanalyse nicht bestätigt; beim Set bleibt insbesondere PS/Kunststoff gegenüber Holz widersprüchlich. Ein Bild beweist weder tatsächliche Masse noch Lieferumfang oder Nutzungsrechte.

Die im Export geführte alte Variante **56225328824705** dieses Sets fehlt in der vollständigen heutigen Sechserliste; eine native Node-Gegenprobe lieferte `null` bei gleichzeitig erfolgreicher aktueller Kontrollvariante. Ursache/Zeitpunkt und aktueller Google-Angebotsstatus sind unbekannt. **Keine alte Angebotskennung einer neuen Standardvariante zuweisen.** Quellenfortsetzung nur mit den sechs heutigen CJJT-SKUs; der alte R42-SKU ist historische Referenz. Beim [Baum-Bild](https://luxestyle.ch/products/dekoratives-leinwandbild-ohne-rahmen-615200) ist kein neuer sichtbarer Motivfehler festgestellt; Lieferantenspezifikationen bleiben separat offen.

Zwei weitere Exportkennungen (`6917317292929955722`, `1083834440623406112`) haben keine belegte Shopify-Zuordnung. Die Marseille-Beschreibung nennt ihr Motiv bereits sinngemäss; kein neuer Motivtext aus dem Titel erfunden. Zusammen mit der alten Blumenvariante stehen sie in einer [auf drei Fälle begrenzten Quellenprüfliste](QUELLEN-PRUEFLISTE-20261103-R65.json). Die Kennungen bleiben Zeichenketten. Aktive Source-ID und tatsächlich eingereichte Produkt-URL fehlen im Export. Die Datei ist weder Feed noch Lösch-/Neuzuordnungsauftrag; keine erneute Timeout-Abfrage oder ungeprüfte Einreichung.

## Nachfrage: historische Orientierung für eine andere Kategorie

Der zweite Export enthält **240 Vorschlagszeilen** ohne Vollzeilendubletten: Schweiz, Shirts & Tops, **September 2026**. Es sind 208 Titel und 18 Marken innerhalb dieses Filters, keine aktuellen November-Verkäufe von LuxeStyle und kein vollständiges Marktranking. Die Häufigkeit einzelner Marken im Export ist kein Marktanteil.

107 Preisrahmen sind vorhanden; **133 bleiben unbekannt**. Keine Preis-, GTIN-, Material- oder Markenübernahme auf eigene Produkte. Drei vorsichtige, sich überschneidende Stichworthypothesen für eine spätere Prüfung des tatsächlich eigenen Sortiments:

| Idee | Begrenzte Beobachtung im Export | Voraussetzung vor einer Umsetzung |
|---|---|---|
| Langarm / Streifen | 16 Langarm-Zeilen, davon 3 mit Streifen | Eigenes aktives Produkt, echte Muster-/Variantenbilder und Kaufbarkeit belegen |
| Pullover / Cardigans / Strick | 61 Stichwortzeilen | Bestehende Kleidungsarten sinnvoll trennen; fremde Materialbegriffe nicht übernehmen |
| Hoodies / Sweatshirts | 32 Stichwortzeilen | Eigene SKU-, Grössen-, Farb- und Zielgruppenbindung belegen |

Das sind keine addierbaren Marktsegmente und keine Beschaffungs-, Import-, Kategorie- oder Werbefreigaben. Der Bekleidungsbericht belegt keine Nachfrage nach den Kunstmotiven im ersten Export. Heute wurde keine neue Produktliste oder zusätzliche Kennzahlabfrage dafür ausgelöst.

## Belegter Fortschritt dieses Zusatzlaufs

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Beschreibungsdatei | 31 Angebotszeilen und R42-Vergleich mit unabhängiger Gegenzählung geprüft | 29 bekannte Texte mit Motivpräfix; zwei unzugeordnete Kennungen, keine neue Umsetzung |
| Produkt-/Bildzuordnung | Zwei bekannte Produkte und alle sechs aktuellen Set-Bildbindungen geprüft; drei Typbilder angesehen | Farbtext nur für A passend; enger Body-/SEO-Entwurf vorbereitet, nicht angewendet |
| Merchant-Quellen | Alte Set-Variante mit erfolgreicher nativer Kontrollabfrage geprüft; drei Quellenfälle abgegrenzt | Alte Node `null`; Google-Zustand/aktive Quelle unbekannt, kein Feedwrite |
| Nachfrage | 240 CH-Bekleidungsvorschläge aus September 2026 mit Gegenzählung ausgewertet | Drei begrenzte Stichworthypothesen; 133 Preisrahmen unbekannt, keine Sortiments-/Preisänderung |

Die heutigen R64-Kennzahl-/Flowreports und der beendete Kauf-Watch wurden nicht wiederholt. Derselbe professionelle 18-Sekunden-Projektor-Master bleibt im vorhandenen Produktionsstand; kein Film, neuer Post, Rabatt, Flow, DNS, Budget oder Shopsetting geändert. Bestehende Termine, Register und Geschäftsgrenzen bleiben erhalten. Dokumentationsspeicherung und Rücklesebelege werden separat protokolliert; dies ist kein Nachweis einer Kenntnisnahme durch Claude.

[Konsolidierte Belege](BESCHREIBUNGEN-NACHFRAGE-BELEGE-20261103-R65.json). Nächster konkreter Schritt: den exakt abgegrenzten Motiv-Diff prüfen; mit legitimem Merchant-Editor die drei Originalangebote samt aktiver Quelle und eingereichten URLs lesen. Lieferantendaten zu den heutigen Varianten getrennt klären.
