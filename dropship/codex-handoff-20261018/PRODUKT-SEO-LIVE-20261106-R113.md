# LuxeStyle R113 – Hundebett und Weinflaschentasche live korrigiert

Belegstand: 2026-11-06T06:39:57+01:00. Unabhängige Schlussprüfung: **2/2 GO**.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanalidentitäten wurden frisch passend gelesen. Vor jedem Produkt wurden aktuelle Claude-Code-Refs, offene PRs, exakte Produkt-ID, Handle, SKU und Shopify `updatedAt` gegengeprüft. `origin/main` stand auf `b46c81e98`; der jüngste Claude-Head `94f3e9bc8` betrifft Printful und das Katalogfenster. Keine parallele redaktionelle Bearbeitung der beiden R113-Produkte gefunden; gemeinsamer Live-Lock und Claude-Empfangsquittung bleiben unbekannt.

## Live korrigiert

Produkt `15453794959745` wurde von **«Doppellagige Falt-Hundematte»** auf **«Erhöhtes, faltbares Hundebett in fünf Farben»** präzisiert. Der neue Text nennt nur die sichtbare erhöhte Liegefläche mit Netzeinsatz, das faltbare Gestell und die fünf aktuellen Farboptionen. Unbelegte Stoff-, Metall-, Komfort-, Stabilitäts-, Langlebigkeits-, Gewichts-, Liefer-, Prüf-, Rückgabe-, Rabatt- und Zahlungsclaims wurden entfernt. Sechs Bilder erhielten bildgenaue Alttexte.

Produkt `15449028297089` wurde von **«Kühlbeutel für Rotwein»** auf **«Weinflaschentasche mit Tragegriff und Schultergurt»** begrenzt. Der neue Text nennt nur den sichtbaren Reissverschlussdeckel, Tragegriff, Schultergurt und das silbern wirkende Innenfutter. Unbelegte Kühlleistung, Temperaturhaltung, Isolations-, Material-, Liefer-, Rabatt- und Zahlungsclaims wurden entfernt. Fünf Bilder erhielten bildgenaue Alttexte.

Genau zwei `productUpdate` und zwei `fileUpdate` wurden erfolgreich gesendet, ohne Shopify-`userErrors`, Mutation-Retry oder unklaren Write. Eine ungültige Rückgabefeld-Abfrage wurde vor dem Versand durch die Schemaprüfung abgelehnt und löste keinen Shopify-Write aus. Nach allen gesendeten Writes wurden Admin sowie öffentliche HTML- und Produkt-JSON-Seiten zurückgelesen. Bei der Weinflaschentasche erforderte die Alttext-CDN-Aktualisierung genau eine reine Lesewiederholung; es gab keinen Write-Retry. Die unabhängige QA bestätigte 2/2 GO, 11 Alttexte, 6 Varianten, 11 Medien und 16 Publikationsknoten.

## Schutzfelder und Grenzen

ACTIVE-Status, Handles, Produkttypen, Kategorien, Tags, Optionen, Varianten-IDs/SKUs, CHF-Preise, Kaufbarkeit, ungetracktes `CONTINUE`, Mengen 0, Medien-IDs/-URLs/-Bindungen und Publikationen blieben erhalten. Beim Hundebett blieb die bestehende gemeinsame Braun-/Grau-Medienbindung unverändert. Mengen 0 sind bei diesen ungetrackten, kaufbaren Varianten kein Ausverkaufsbeleg.

Beide Produkte behalten `rueckhol-0907`; die kommerziellen Bearbeitungs- und Werberechte der Bilder sind unbekannt. Sichtbare transparente Lieferantenmarkierungen und Modelbilder wurden nicht als neue Social-Freigabe gewertet. Es erfolgte kein Social-Write.

Unter dem strengen Liveverfahren sind **51 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,09026 %**, gerundet rund **0,09 %**. **56’455** beziehungsweise **99,90974 %**, gerundet rund **99,91 %**, bleiben offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Öffentliche Schlussbelege:

- Hundebett HTML: `f63b6a4e7158531d65742203914767025ab49eea455acfe6a6aa54c32ee83de3`
- Hundebett Produkt-JSON: `ee1d21440ca58a537d5bdd19c0c63f9ede8aa7a0088cb2acece835731c77a9c7`
- Weinflaschentasche HTML: `dd7c8291cbe3515c26a34d925ba6fee48a552f55698036955a6bca6c5c50bcf3`
- Weinflaschentasche Produkt-JSON: `721e71bc71f70d3336915f081e1ed4d20ca4442a8bc2f63f6447a1c59009ffce`

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Metricool-Kennzahlen, Klaviyo und der beendete Kauf-Watch wurden in diesem Kataloglauf nicht abgefragt.
