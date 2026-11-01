# Begrenzte Verkaufsgrundlagenprüfung – Morgenlauf01.11.2026

Drei öffentliche URLs mit frischem Firecrawl-Abruf geprüft, keine weitere URL-Erkundung. Keine neue Kennzahl-, Flow-, Bestell- oder Ads-Abfrage; keine Shop-, Feed-, DNS- oder Budgetänderung.

| Geprüfte Seite | Aktueller Befund |
| --- | --- |
| /collections/weihnachtspyjama-familie | HTTP200, passende deklarierte Canonical, ein Haupt-H1, passende Beschreibung und Link zum Partnerlook-Produkt |
| /products/weihnachts-pyjama-im-partnerlook-764352 | HTTP200, passende Canonical und ein Haupt-H1. Vorhandene Preis-pro-Auswahl-/Person-Klarstellung weiter vorhanden. Öffentliche ProductGroup-Daten enthalten25 Angebote in CHF14.90–17.90 |
| /products/sternenlicht-projektor-fur-schlafzimmer-732544 | HTTP200, passende Canonical und ein Haupt-H1. Ein öffentliches Offer mit CHF34.90 und Variante56197916361089. Beschreibung vermischt sieben Versionen und einen pauschalen Lieferumfang; genaue Zuordnung bleibt offen |

Erreichbarkeit und selbst deklarierte Canonicals sind kein Googlebot-, Indexierungs- oder Rankingnachweis. In diesen drei Rootdokumenten wurde kein neuer Titel-/Canonical-/Mehrfach-H1-Defekt belegt. Das vorhandene WELCOME10 in der Pyjama-Metabeschreibung ist eine beobachtete Altangabe, kein von diesem Lauf verifizierter oder neu aktivierter Rabatt; nicht ungeprüft in neue Inhalte übernehmen.

## Tatsächlich neuer lokaler Arbeitsschritt

Firecrawl rawHtml enthält eingebettete Shop- und Chromium-Fehlerdokumente sowie SVG-Titel. Eine naive Gesamtauswertung meldete dadurch mehrere Titel/H1 und restriktive Viewports. Der neue lokale Auswerter root_document_audit.py trennt das Hauptdokument von diesen eingebetteten Inhalten und berücksichtigt HTML-Titel nur im tatsächlichen Root-head. Auf den drei vorhandenen Quellen ist eine gebundene unittest-Prüfung mit drei Fällen und jeweils sieben Assertions grün. Ergebnis: je ein tatsächlicher Titel/H1/Canonical/Viewport; eingebettete «is blocked»-Dokumente werden nicht als LuxeStyle-Seitendefekt ausgegeben. Kein Website-Code verändert.

Der zweite konkrete Quellenfortschritt ist DEFAULT-AUSFUEHRUNG-MATRIX.md. Sie hält den Unterschied zwischen dem aktuellen Projektorangebot und den nicht variantengenau zugeordneten sieben beschriebenen Ausführungen fest. Das vorhandene öffentliche Video ist ein Altasset und keine fertig geprüfte Premium-Master-MP4. Parent/Master-Agent sind über Video-ID und Matrix informiert. Keine erfundene Produktcopy als Ersatz vorbereitet.

## Bestehende eine Verkaufsaktion zur Freigabe

Der schon belegte Welcome-Service-Diff bleibt derselbe Vorschlag. Die lokale Gegenprobe bestätigt exakt zwei HTML-Zeilen, übereinstimmende Vorher-/Nachherhashes und identischen Auslieferungsdiff. Er wurde nicht neu umgesetzt und ist kein neuer Flow-Vorschlag. Vor einer späteren Änderung ist ein frischer Remote-Vorlagenhash nötig. Details: welcome-review/REVIEW.md und REVIEW.json. Keine erneute Klaviyo-Abfrage heute.

Belege: EVIDENCE.json, ROOT-DOCUMENT-RESULTS.json, root_document_audit.py, test_root_document_audit.py. Die Rohseiten werden lokal aufbewahrt; keine dritte Partei angeschrieben. Verwendeter Skill: skill://plugin_asdk_app_6a314a73f8ac819195b0d55e36b9c609/seo-audit/SKILL.md.


# Projektor: aktuelle Angebots- und Ausführungszuordnung

Prüfung am 01.11.2026 im bestehenden Morgenlauf. Dies ist eine interne Quellenmatrix, keine neue Produktbeschreibung und keine fachliche Bestätigung sämtlicher Lieferantenangaben.

| Punkt | Aktueller Beleg | Zuordnung zur angebotenen Ausführung |
| --- | --- | --- |
| Aktuelles öffentliches Angebot | Ein Product-Offer, Variante56197916361089, SKU CJ-1477820492730732544, CHF34.90 | Preis/SKU öffentlich belegt; Root prüft den nativen Default-Status separat |
| Seitenbeschreibung | Nennt ausdrücklich sieben Ausführungen | Keine eindeutige Zuordnung der beschriebenen Versionen zum aktuellen Angebot |
| Grundmodell | Text nennt Einstecken | Zugehörigkeit zur aktuellen Variante unbekannt |
| Motive | Text nennt sechs Farbscheiben und/oder eine Galaxy-Scheibe je nach Version | Tatsächlich beigelegte Motive der aktuellen Variante unbekannt |
| Funktionen | Text nennt wiederaufladbare Bluetooth-Modelle, Musikversion und Drehversion | Nicht als aktuelle Default-Funktionen freigegeben |
| Allgemeine Lieferumfangsliste | Nachtlicht, sechs Farbscheiben, wiederaufladbares Bluetooth-Drehteil, Galaxyscheibe | Im Text pauschal aufgeführt; Variantenbezug und Vollständigkeit nicht aktuell bestätigt |
| Öffentliches Produktvideo | Shopify-Video-ID6490c6357dae4df69bb910178acb2912, VideoObject uploadDate2026-08-31, contentUrl SD480p | Weder neues Premium-Master-Material noch Nachweis für kommerzielle Bearbeitungsrechte oder Default-Identität |

Die Quelle liegt unter https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544; Rohdaten und Hash in EVIDENCE.json/ROOT-DOCUMENT-RESULTS.json. Ein sichtbarer Lieferumfangstext ersetzt keine variantengenaue Lieferantenzuordnung.

Nächster konkreter Schritt für denselben Master: genau diese SKU an native Lieferantenunterlagen und die vier benötigten Originaltakes binden, dabei Motive, Stromversorgung und mitgelieferte Teile einzeln bestätigen. Bis dahin keine Bluetooth-, Musik-, Wiederauflade-, Fernbedienungs- oder Motivset-Aussage in Caption, Overlay oder CTA ergänzen. Kein Produktwrite aus dieser Matrix.
