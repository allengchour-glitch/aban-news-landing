# LuxeStyle: Merchant-Fix, 02.11.2026, R58

GEMESSEN: Shopify luxestyle.ch/CHF, Metricool 6227837/Europe/Zurich samt sechs erwarteten Kanälen und Merchant-Konto 5797470070 «LuxeStyle CH» frisch passend. Neue ausdrückliche Inhaberbitte «merchant fix»; aktuelle Übergabe, Gedächtnis, Arbeitsstand R57 und heutigen Tagesblock gelesen. Kein neuer Kennzahl-, Flow-, Kauf-Watch- oder breiter Verkaufsreport.

## Sichtbarer Umfang und gezielte Quellenprobe

QUELLE: aktueller Inhaber-Screenshot des passenden Kontos zeigt gerundet 25.4K CSS-Shopping-ads-Kapazitätsmeldungen, 1.49K Versandmeldungen und 1.25K Preisfehler. Filterbeschriftungen jeweils All. Das sind keine exakten API-Zähler, kein Katalog-Gesamtbestand und kein Beweis derselben Datenquelle oder Länder wie in älteren Exporten. Aus CSS-Anzeigenkapazität keine Free-Listings-Sperre oder erforderliche pauschale Produktentfernung ableiten. Negative frühere Statuszähler werden nicht wiederverwendet.

GEMESSEN: vorhandene R41-Prüfmanifest-Zeilen gezielt statt kompletter CSV-Neuscans gelesen. Exakte historische Lampenidentität ist ONLINE/de/CHF_99383214465/shopify_ZZ_15450836566401_55889781588353, nicht pauschal Feedlabel CH. Genau eine neue Merchant-Abfrage mit sieben frisch entdeckten Identitäts-/Quellenfeldern, genau diesem Schlüssel und einschliessendem Datumsbereich endete mit MCP -32603 request timed out. Kein Retry oder force_refresh. Aktive Datenquelle/Originalfelder/Neubewertung unbekannt, keine leere Datenmenge/Null/404. Verbundene Windsor-Merchant-Schnittstelle bietet frisch keine Schreibaktionen; dies beweist nicht das Fehlen anderer legitimer Editoren. Quellenname plus eine Artikel-ID aus aktueller Missing-price-Detailansicht beim Inhaber erfragt, noch keine Antwort.

## Konkreter Codefehler und geprüfter Entwurf

GEMESSEN: bestehender Tageslauf 41443439624, Merchant-Job 125272328470, brach am 02.11.2026 um 12:22:17Z mit GraphQL HTTP401 ab. Sicher klassifizierte maskierte Runner-Bindings zeigen statischen Admin-Token und beide App-Variablen als nicht leer. Quellblobs von Generator und Workflow am fehlgeschlagenen Run-Commit fe2c3e60fc27d749a4b71af9ce44b408ba8672b8 sind gleich dem geprüften Main-Stand. Die alte Funktion wählt immer den statischen Token zuerst. Damit ist die Auswahl dieses Zweigs belegt; Ablaufzeit/Ungültigkeitsgrund und Gültigkeit des App-Paars bleiben unbekannt. Keine Secretwerte oder rohen Runnerlogs gespeichert.

GEMESSEN: DraftPR 2830 https://github.com/allengchour-glitch/aban-news-landing/pull/2830 am Commit ecdc456f1109680b2bcb1584171ee075ed8bf548 ist offen und nicht gemergt. Genau drei Dateien geschrieben und frisch bytegleich remote zurückgelesen:

- automation/autopilot/merchant_feed.mjs: vollständiges App-Paar zuerst, sonst bisheriger statischer Weg; bestehende Secret-/Host-Helfer; Redirects blockiert; nicht erfolgreiche/ungültige Tokenantworten führen ohne statischen Rückfall zum Abbruch; keine OAuth-Antwort- oder Secret-Protokollierung.
- automation/autopilot/merchant_feed_auth_test.mjs: tatsächlicher Quellfunktionsblock isoliert, ohne Generatorimport, echte Umgebung oder Netzwerk.
- .github/workflows/luxestyle-automation-tests.yml: sieben reine Pfad-/Sparse-/Syntax-/Test-Aufrufzeilen; keine Änderung von Berechtigungen, Triggerart, Schedule oder Secrets.

GEMESSEN: Root-Gegenprobe vorher 6 ok/24 Fehler, nachher 30 ok/0 Fehler; beide Syntaxproben und YAML-Parse erfolgreich. Alle Preis-/Verfügbarkeits-/Versand-/Identifier-/Varianten-/Filter-/Ausgabezeilen hinter TOKEN bytegleich erhalten. Vorgeschriebene Voll-CI-Simulation am tatsächlichen Commit mit Umgebung ohne Credentials versucht: unshare Operation not permitted; deshalb kein grüner lokaler Voll-CI-Beleg, keine Umgehung. PR-CI ist gesondert zu lesen, keine produktive Ausführung behauptet.

Wichtige Grenze: Dieser vorhandene RSS-Exporter benutzt Handle-IDs und nur die erste Variante. Er ist noch nicht als primäre Quelle der konkreten zusammengesetzten CSV-/Screenshot-IDs belegt. Der Auth-Entwurf ist deshalb ein konkreter unabhängiger Softwarefortschritt und kein nachgewiesener Fix der 1.25K/1.49K Google-Meldungen. Weder Workflow noch Generator produktiv gestartet, kein Feed neu hochgeladen/aktiviert und keine Dateien nach Main gemergt.

## Variantenbild: tatsächlicher Befund, keine falsche Zuordnung

GEMESSEN: Produkt 15450836566401 ACTIVE, konkrete Variante 55889781588353, SKU CJ-CJYD188109128BY, CHF24.90 nativ gebunden. Ihr aktuelles MediaImage 69887071846785 ist eine beschriftete 775×388-Collage mit einer Kugelleuchte und einem Wasserwellenwürfel. Vom Root heruntergeladen und angesehen. Das saubere weisse Produktbild der Galerie zeigt nur den Würfel; die genaue Set-8-/Bundle-Zuordnung ist nicht belegt. Deshalb kein Ersatz durch möglicherweise falsche Ausführung. Preise, Status, sämtliche Tags einschliesslich rueckhol und Inventardaten unverändert. Kein Bestands-/Kaufbarkeitsversprechen aus Menge0. Kein Social-Inhalt oder Termin aus diesem Befund erzeugt.

Shopify-Validierungsgrenze: vorhandener CLI-Validator scheitert am fehlenden _validate_graphql.mjs; MCP-Vorvalidator meldet skipped. Die zuvor frisch schemageprüfte Einzelvariantenabfrage wurde nativ akzeptiert; keine grüne volle Toolkit-Validierung behauptet.

## Nächster konkreter Schritt

Mit einem aktuellen betroffenen Artikel und seiner primären Datenquelle zuerst Originalpreis, Angebotsschlüssel, Quelle und konkrete fehlende Versandländer binden. Dann unter der bereits bestehenden Fix-Erlaubnis nur belegte veraltete DRAFT-Einträge/unerwünschte Zielländer oder exakt zugeordnete Preise/Verfügbarkeiten korrigieren und frisch zurücklesen. Keine erneute gleiche Freigabe verlangen, aber keine Quelle/Google-URL/Tarife erfinden; deutsche Sprache und gültige CH/LI-Ziele erhalten. Den Auth-Entwurf erst nach zulässiger Übernahme und tatsächlichem nächsten vorhandenen Lauf als produktiv beurteilen, keine eigene Workflow-Auslösung.

Tatsächliche operative Writes dieses Laufs: Shopify0, Merchant0, Social0, Flow0, DNS0, Ads0; keine Budget-/Rabatt-/Versand-/Kontoeinstellungen oder Frequenzänderung. Öffentliche CHF50/interne CHF45-Versandgrenzen und account.luxestyle.com.co erhalten. Kauf-Watch beendet, R53-Websiteauftrag und Welcome-Ausschluss sowie R56-Musikhörprobe/R57-Vergleichs-PR und derselbe offene professionelle Master bleiben erhalten. Keine anderen Marken bearbeitet.
