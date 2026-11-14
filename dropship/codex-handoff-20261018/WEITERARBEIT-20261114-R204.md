# LuxeStyle – Weiterarbeit am 14.11.2026, R204

Neu geprüft wurden der tatsächliche Variantenwechsel des Projektors, eine weitere Auslieferung des bestehenden Social-Ablaufs und die Voraussetzungen des vorhandenen Laufzeit-Zugangschecks. Ein strikt lesender Schutzentwurf wurde offline getestet. Keine eigene Social-Veröffentlichung, keine Shop-/Feedänderung und kein neuer Film.

## Planung und bestätigte Auslieferung

Metricool-Marke 6227837, Europe/Zurich und alle sechs erwarteten Kanalidentitäten passen. Der um 12:10 Uhr Zürich begrenzte Snapshot enthält weiterhin 48 Objekte und dieselben UUIDs wie R202. Neu seit R202: TikTok-Objekt 422279700, UUID `8178449842924373712`, Termin 14.11. um 12:00 Uhr, meldet PUBLISHED. Provider-ID `7707980998968937760`, [URL laut Metricool](https://www.tiktok.com/@luxestyle.ch/video/7707980998968937760).

Damit sind sechs PUBLISHED-Kanalzustände auf fünf bestehenden Objekten beobachtet. Dies sind externe Statusbelege, keine Veröffentlichungsleistung dieses Laufs. Noch 34 Objekte mit 43 Kanalplätzen sind unter draft=false/autoPublish=true PENDING. Neun Entwürfe zählen nicht als Abdeckung. Vor der Prüfgrenze war kein aktiver PENDING-/Fehlertermin überfällig. Der Siebentageszeitraum einschliesslich ganzer lokaler Tage 14.–21.11. ist gelesen: YouTube 15.–21.11. und Threads am 15.11. bleiben ohne aktive Termine. IG/FB/TikTok/Pinterest haben im Fenster täglich technische Slots; globale Flags ersetzen keine vollständige Qualitäts-, Rechte- und Kanalprüfung.

Keine exakten Text-/Medienlisten-Doppelposts je Kanal im aktiven Snapshot. Frühere Masterhistorie bleibt davon getrennt; kein historischer Freibrief, kein Löschgrund aus diesem Read. Alle neun hier sichtbaren bekannten Holds sind Entwürfe mit Autopublish aus, sechs weitere liegen ausserhalb des Fensters und bleiben dort unbekannt. Vorhandene Termine, UUIDs und Haltezustände wurden erhalten. Kein Publisher gestartet und kein Register initialisiert oder zurückgesetzt.

## Projektor: echter Browsercheck statt vermutetem Fehler

Ein Produkt, drei Varianten, zwei frische anonyme Browserkontexte: 390×844 und 1440×900. Bei A68122445283719, E68122445414791 und G68122445480327 wechseln Auswahl, versteckte Varianten-ID, sichtbarer Preis und Hauptbild passend. Öffentlich beobachtet: A CHF34.90, E CHF51.90, G CHF35.90. Der mobile Warenkorbbutton ist im gespeicherten G-Screenshot sichtbar. Die erste unvollständige CTA-Abfrage war durch die 50-Button-Grenze der Messung verursacht; kein entsprechender Shopfehler belegt.

Die internen QA-Screenshots sind [mobil](PROJEKTOR-MOBILE-20261114-R204.png) und [Desktop](PROJEKTOR-DESKTOP-20261114-R204.png) gesichert; sie sind keine freigegebenen Werbemittel. Kein Warenkorb-, Checkout-, Login- oder Bestellaufruf wurde betätigt. Alle Nicht-GET/HEAD-Anfragen wurden vor dem Versand blockiert; das schränkt insbesondere Read-POSTs und beschleunigte Kaufabläufe ein. Die Prüfung belegt deshalb weder einen kompletten Kaufablauf noch dessen Performance. Ein normaler Python-GET der öffentlichen Produkt-JS nach Node-Verbindungsfehler lieferte HTTP200, exakt denselben vollständigen Hash wie R201. Das ist kein Nachweis für Admin-ACTIVE, Inventartracking, inventoryPolicy oder Lieferantenbestand. Die korrekte Shopify-App-Neuanmeldung fehlt weiterhin.

Der vorhandene R201-Diff gegen zwei pauschale Lieferumfangsbehauptungen bleibt die eine konkrete Produkttextaktion zur Freigabe. Keine neue Zubehör-, Material-, Lieferzeit- oder Mengenbehauptung hinzugefügt, keine Preisänderung. Vor Umsetzung richtige Shopify-Identität und frische Admin-Vorherwerte prüfen; vorhandenen Diff verwenden, nicht neu anlegen.

## Vorhandenen Zugangscode geprüft, Schutzentwurf vorbereitet

Die bestehende manuelle Diagnose wurde mit ihren tatsächlichen Hilfsdateien am Commit a419661f701e2ac7710a9d1e5df801664e2098bc gelesen. Ihr Hostformat wird nur protokolliert; eine fremde Konfiguration würde vor dem OAuth-POST nicht ausdrücklich abgebrochen. Das rechtfertigt keinen ungeprüften Lauf und beweist keine falsche Konfiguration der produktiven Secrets.

Der neue Entwurf `LUXESTYLE-READONLY-GATE-20261114-R204.mjs` akzeptiert nur die genaue bekannte permanente LuxeStyle-Domain `au3j0y-hq.myshopify.com`. Erst danach prüft er die zwei bestehenden Quelldateien gegen gepinnte SHA-256-Werte. Er liest ausschliesslich SHOPIFY_SHOP, kann weder die Diagnose importieren noch Netzwerkzugriffe, OAuth oder Workflowstarts ausführen. Ein passender Konfigurationswert wird ausdrücklich nicht als verifizierte Laufzeit-Identität ausgegeben. Ausführungsflags werden abgelehnt.

Acht Offline-Prüfgruppen mit synthetischer Umgebung und task-eigenen Quelldatei-Fixtures bestanden: Hostverwechslungen, nur ein Umgebungsfeld, beide richtigen Hashes, fremder Shop vor Dateizugriff, fehlende/geänderte Diagnose, geänderter Helfer und gesperrte Ausführungs-/Fremdargumente. Der Entwurf liegt nur in der LuxeStyle-Übergabe; vorhandene Skripte, Workflows, Credentials und Deployment wurden nicht geändert. Er stellt den Shopify-Appzugang nicht wieder her.

Reproduktion: `node dropship/codex-handoff-20261018/LUXESTYLE-READONLY-GATE-20261114-R204.test.mjs /pfad/zum/quell-checkout`. Die beiden kanonischen Dateien dieses Checkouts müssen dem dokumentierten Commit und den Pins entsprechen. Eine zwischenzeitlich geänderte Quelle soll fehlschlagen; der Test importiert auch dann keine Diagnose.

## Merchant, Master und Tagesgrenzen

HYPD bestätigt frisch LuxeStyle CH / Merchant 5797470070. Für die zwei bekannten Nagellack-Offers fehlen weiterhin die echten vollständigen product_name-Ressourcen und damit der unterstützte genaue Produktread. Die verfügbare List-Funktion bietet keinen exakten Offer-Filter, der Windsor-Filter ist nicht dokumentiert bestätigt. Keine Massenpagination und kein erneuter inkompatibler Feldmix. image_link und genaue Primärquelle bleiben unbekannt, nicht leer. Keine Feed-/Bildänderung oder GTIN-Ableitung.

Derselbe 18-Sekunden-Master und die geprüfte R202-Regieplanseite bleiben erhalten. Die heutigen öffentlichen Variantenbelege präzisieren die Produktreferenz; sie ersetzen keine exakten Film-Takes, kommerziellen Medienrechte, Hörabnahme oder fertige professionelle MP4. Die zwei Hooks, sechs Caption-/UTM-Entwürfe und bekannte YouTube-Angabe madeForKids=false werden weiterverwendet, nicht als neue Produktion ausgegeben. Kein kostenpflichtiger Render oder Upload.

R200-Kennzahlen und Klaviyo-Bericht von heute wurden datiert wiederverwendet. Null zusätzliche Kennzahl-/Flow-/breite Verkaufsreports, keine Kauf-Watch-Abfrage, keine Kundenansprache oder Käufe. CHF und USD bleiben getrennt. Vier DNS-Ergänzungen sind weiterhin bereits genehmigt; authentifizierter Writer fehlt. Versandgrenzen CHF50/CHF45, Kundendomäne und vorhandener 08/14/19-Zeitplan bleiben erhalten. 24 Aufgaben-IDs und die gesamte Historie bleiben erhalten; Claude-Kenntnisnahme ist ohne Empfangsbeleg unbekannt.
