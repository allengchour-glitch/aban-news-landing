# Zwei Merchant-Bildfehler behoben – R222, 14.11.2026

Nach aktueller Shop-/Merchant-Identitäts-, Quellen-, Varianten-, Bild- und Diffprüfung sowie ausdrücklicher Inhaberbestätigung zu Bearbeitungs-/Werberechten und Farbtreue wurden genau zwei image_link-Updates über Windsor an bestehenden Angeboten ausgeführt. Keine neue Datenquelle, kein Upload, Render oder Workflowstart.

| Angebot | Bestätigter Schlusszustand |
|---|---|
| Nagellack Modell1, Variante55877809340801 | Neues textfreies Hauptbild, keine itemLevelIssues; CH/LI in allen sechs gelieferten Zielkanälen APPROVED |
| Nagellack Modell6, Variante67652260430215 | Neues textfreies Hauptbild, image_unwanted_overlays entfernt; CH/LI in allen sechs gelieferten Zielkanälen APPROVED. Grundpreis-Mengenangabe weiterhin NOT_IMPACTED |

Beide Angebote bleiben auf Quelle10667445201 (Shopify App API), de/CHF_99383214465, je CHF15.90. Alle anderen gelieferten productAttributes wurden vor/nach den Änderungen verglichen und blieben identisch. Beim Modell6 zeigte die erste Rücklesung noch den alten Stand; nur der vorhandene Artikel wurde später erneut gelesen, ohne zweiten Write. Zwei Writes insgesamt, null blinde Wiederholungen. Die Google-Zielkanalfreigabe aktiviert keine Kampagne.

[Exakte Requests und Checkpoints](MERCHANT-BILDWECHSEL-20261114-R222.json) · [Rechtequelle](MERCHANT-BILDRECHTE-20261114-R222.md) · [Vollständige Rücklesedaten](MERCHANT-FIX-20261114-R222.json).

## Weiter offen

Der Workout-Preisfall ist ein veraltetes, aus AUTOFEED10678939025 stammendes Angebot zu einem Shopify-DRAFT-Produkt. Google erwartet weiterhin einen Preis; die Produktadresse führt301 zur Damenmode-Kategorie. Dafür ist eine passende Einzelartikel-Editormethode erforderlich; die verfügbaren API-Produktaktionen bearbeiten API-Quellen. Kein Preis, Produktstatus, Redirect oder die ganze Quelle wurde geändert. [Enger Arbeitsumfang und Abnahme](MERCHANT-AUTOFEED-EINZELFALL-20261114-R222.md).

Die Zusatzmeldung bei Nagellack Modell6 ist jetzt exakt als unit pricing measure / NOT_IMPACTED bekannt. Sie ist keine GTIN-Meldung. Der aktuelle CJ-Read bindet beide SKUs an die alten Originalmotive; Lieferantengewicht, Verpackungsmasse und barcode liefern keinen verifizierten Nettoinhalt oder GS1-Nachweis. Keine Mengen-/GTIN-Werte erfunden oder identifierExists geändert.

## Messumfang und Grenzen

Drei genaue Angebote, zwei Shopify-Produkte/drei Varianten und vier Datenquellen gezielt geprüft; kein Katalogzensus und keine Aussage «alle Fehler=0». Ein Windsor-Produktread endete mit MCP-Timeout; er wurde nicht blind wiederholt. Die separaten direkten HYPD-Angebotsreads lieferten die tatsächlichen Payloads. Keine Statuszähler oder Performanceberichte zur Fehlerzählung verwendet.

R200-Tagesberichte wiederverwendet; keine neuen Klaviyo-/Social-Kennzahlen-, GSC- oder Kauf-Watch-Abfragen. Keine Kundenansprache, Ads-Aktivierung, Budget-, Rabatt-, Versand-, Flow-, DNS- oder Socialänderung. Öffentliche CHF50/interne CHF45 und Kontodomäne erhalten. Keine neue Automation, Deployment, Merge oder bezahlter Render. Bereits bestätigte Socialtermine bleiben unberührt. Kenntnisnahme durch Claude ist unbekannt.

Die gelieferten CH-/LI-Freigaben sind Produktstatuswerte. Die bestehende offene Prüfung der LI-Lieferfähigkeit, Kosten und Lieferzeiten wird dadurch nicht als erledigt behandelt; Länder- und Versandwerte wurden nicht verändert.
