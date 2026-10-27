# LuxeStyle: genehmigter enger Merchant-Push

Stand 27.10.2026. Inhaberauftrag «merchant push» als Freigabe für eine erneute Übertragung beziehungsweise einen Abruf der bestehenden geprüften LuxeStyle-Datenquelle aufgenommen. Diese enge Aktion nicht erneut zur Genehmigung vorlegen. Keine Freigabe für neue Datenquellen, Aktivierung weiterer Produkte/Kanäle, Ausschlussaufhebung, Preis-/Rabatt-/Budget-/Versand-/Shopänderungen oder einen zusammengesetzten Wartungslauf.

**Status: genehmigt, nicht ausgeführt.** Kein Push, kein Workflowstart, keine neue Feeddatei und keine Shop-/Merchant-Einstellungsänderung.

## Aktueller Zugangsabgleich

- Shopify frisch LuxeStyle / luxestyle.ch / CHF; Metricool 6227837 / Europe/Zurich und alle sechs vorgegebenen Kanalidentitäten passend.
- Windsor liefert das verbundene Konto google_merchant / **5797470070 – LuxeStyle CH**. `list_actions` liefert eine leere Aktionsliste. Über diesen Connector ist derzeit keine Push-/Fetch-Aktion verfügbar. Keine weiteren Merchant-Status-/Leistungsabfragen; die früheren ungültigen negativen Zähler nicht erneut verwendet.
- Der reine Browseraufruf von https://merchants.google.com/mc/overview?a=5797470070 endet auf einer Google-Anmeldeseite. Nur sichtbare Anmeldeindikatoren gelesen, keine Anmeldung/Formulareingabe/Challenge/Änderung. Das beschreibt diesen Prüfbrowser und behauptet nicht, der Inhaber sei in seinem eigenen Browser abgemeldet. Die Sitzung anschliessend beendet.
- Die aktive Merchant-Datenquelle, ihre Source-ID/Art/URL, Kontohomepage und ihr letzter tatsächlicher Abruf sind über den angemeldeten Merchant-Zugang noch nicht bestätigt. Der Kontoname aus Windsor allein ersetzt diese Prüfung nicht.

## Vorhandene Automation frisch geprüft

Der main-Generator `automation/autopilot/merchant_feed.mjs` erzeugt eine lokale XML-Datei. Er ruft weder einen Merchant-Upload noch eine Datenquellen-Fetch-Aktion auf. Default sind zwei breite Shopify-Abfragen mit SCAN6000 je Abfrage; nicht gestartet.

Der aktuelle Generator überträgt `mm-google-shopping.excluded_destination` nicht in seine Feed-Ausgabe. Ein Neuaufbau wäre damit kein belegter unveränderter Refresh bestehender Ausschlüsse. Der Helfer setzt ohne GTIN/MPN weiterhin `identifier_exists=no`; daraus wird kein pauschal gültiger Produktkennzeichnungswert abgeleitet. Keine Katalogquote, Free-Listings-Aussage oder Feedkorrektur aus historischen Stichproben.

GitHub- und GitLab-Jobs mit Namen shop-autopilot sind keine isolierten Merchant-Pushes. Der GitHub-Job enthält SEO-Wartung mit LIVE1; der GitLab-Job kombiniert unter anderem Feed, SEO, Bestell-/Umsatzabfragen, Telegram-Meldungen und mehrere Datei-/Branchwrites. Keiner wurde ausgeführt. Kein ungeprüfter Workflow und keine Meldung an Dritte.

Die historisch bekannte öffentliche XML-URL auf brain/intel ist frisch erreichbar: HEAD200, begrenzter RangeGET206, Gesamtgrösse3’180’967Bytes. Es wurden jeweils nur die ersten5000Bytes und daraus ein einziges vollständiges Anfangsitem untersucht, kein Vollfeedscan. Beide Range-Antworten hatten denselben ETag und Teilhash. Item-ID WALLET-BLK weicht vom Linkhandle premium-leder-geldborse-slim ab; der aktuelle Generator würde diesen Handle als ID setzen. Das belegt eine andere ID-Strategie beziehungsweise unbestätigte Herkunft. Es beweist weder ein bestimmtes Alter noch, dass dieser Feed aktuell im Merchant Center eingerichtet oder zugelassen ist. Ein Neuaufbau könnte Produktidentitäten ändern; nicht blind neu hochladen.

## Konkreter nächster Ausführungsschritt

Benötigt wird ein authentifizierter Merchant-Schreibzugang zur **bereits bestehenden Datenquelle**. Dann zuerst Konto5797470070/Homepage luxestyle.ch und Source-ID/Art/URL/letzten Abruf frisch lesen; genau diese Quelle mit den geprüften Originaldaten/Ausschlüssen vergleichen. Nur eine tatsächlich vorhandene isolierte Refresh-Aktion ausführen und danach deren Abruf-/Verarbeitungsbeleg gezielt zurücklesen. Bei unbekanntem Write keine Wiederholung und keine Ersatzquelle anlegen. Ein gestarteter Abruf ist noch keine Produktzulassung oder zusätzliche Reichweite.

Die Freigabe besteht; der aktuell belegte Blocker ist der ausführbare Schreibzugang samt bestätigter aktiver Datenquelle. Keine Zugangsdaten im Chat anfordern. Der bekannte öffentliche Feed und der zusammengesetzte Repojob sind kein Ersatz dafür.

Nachweise: `MERCHANT-PUSH-BELEGE-20261027.json` enthält aktuellen Account-/Action-/Browser-Preflight und die vier frisch gelesenen Codequellen samt begrenzter Feed-Gegenprobe. Das Tagesprotokoll wird im vorhandenen 27.10.-Block ergänzt. Öffentliche CHF50/interneCHF45, Kundendomäne, Sperrtags und bestehende Produkte bleiben erhalten.
