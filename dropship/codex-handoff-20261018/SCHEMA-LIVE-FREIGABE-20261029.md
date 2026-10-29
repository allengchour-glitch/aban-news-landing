# LuxeStyle – Live-Übernahme ausdrücklich freigegeben, 29.10.2026

[LUXESTYLE_SCHEMA_LIVE_FREIGABE_20261029]

Der Inhaber bestätigt nach Vorlage des konkreten geprüften Ergebnisses ausdrücklich: «jaa mach das». Damit ist die enge Live-Übernahme der beiden bestehenden Schema-Korrekturen samt öffentlicher Gegenprobe und anschliessender Google-Prüfung freigegeben. Dieselbe Freigabe nicht nochmals anfordern.

## Enger Umfang

- `sections/product-information.liquid`: acht bedingte Zeilen ausschliesslich für Produkt `15450856292737`; 24 optionale ungültige JSON-LD-SKU-Eigenschaften auslassen. Operative SKUs, Preise und Varianten nicht ändern.
- `sections/header.liquid`: ausschliesslich die vorhandenen CH-Schemagrenzen `40.49 → 49.99` und `40.5 → 50`.
- Rückgabe, Versandtarife, interne CHF45-Regel, andere Theme-Dateien sowie Merchant-/Ads-/Budgeteinstellungen sind ausserhalb dieses Diffs. Keine pauschale Veröffentlichung der ganzen inzwischen älteren Theme-Kopie.
- Erst nach bestätigter öffentlicher MAIN-Ausgabe die tatsächliche Google-Prüfung und passende Search-Console-Validierung auslösen. Die vorhandene enge Merchant-Push-Freigabe bleibt bestehen, ersetzt aber keinen Quellen-/Zugangsbeleg.

## Frische Gegenprobe und tatsächlicher Zugriff

Abgeschlossen bis 2026-10-29T09:28:50Z: Shop `94368563585`, `https://luxestyle.ch`, CHF und `au3j0y-hq.myshopify.com` bestätigt; Metricool `6227837`, Europe/Zurich und alle sechs vorgegebenen Kanalidentitäten passend. MAIN ist weiter `212656488839`; das vorhandene Prüftheme `212752499079` ist UNPUBLISHED. Beide MAIN-Dateien stimmen weiterhin exakt mit den geprüften Vorher-Hashes überein; beide Vorschau-Dateien mit den geprüften Nachher-Hashes. Kein neuer Diff nötig, keine neue Kopie angelegt und bestehende Tests nicht erneut als neue Leistung gezählt.

| Datei | MAIN-MD5 | Prüftheme-MD5 |
|---|---|---|
| sections/header.liquid | 1fda77909b8d96d7b3d0f3bc65f8ed65 | 003541d986ce79b0876755c8c3df7a3d |
| sections/product-information.liquid | e4ba950be4a05c5d6dd6f6ebf5d8a0a9 | 9d9646c79c920779614ad848847d1e0d |

Die aktuelle Beschreibung des verbundenen Shopify-Mutationswerkzeugs erlaubt Theme-Dateiwrites nur für unveröffentlichte Themes und blockiert MAIN-Writes sowie themePublish. Die neue Nutzerfreigabe hebt diese technische Grenze nicht auf. Es wurde kein wissentlich blockierter Mutationsversuch gestartet und kein automatischer Approval-Reject erhalten.

Die neu geprüfte Shopify-Admin-Browsersitzung landete auf `accounts.shopify.com/lookup`, Titel «Log in — Shopify», also ohne Anmeldung. Keine Eingaben; Sitzung anschliessend geschlossen. Der getrennte Search-Console-Browseraufruf endete mit «timeout of 35000ms exceeded»; dessen Anmeldestatus bleibt unbekannt. Keine erfolgreiche Google-Anmeldung oder Validierung behauptet. Der aktuelle Laufzeitstatus enthält keine konfigurierten Credentials oder Outbound-Identitäten; keine Secrets gesucht oder übernommen.

## Status und nächster konkreter Schritt

**Genehmigt, nicht live umgesetzt – fehlender zulässiger Schreibzugang.** Keine weiteren Kennzahl-, Flow-, Bestell- oder Merchant-Reports, keine Live-Mutation, kein Merchant-Push und keine Console-Validierung.

Der zuständige angemeldete Admin beziehungsweise Claude kann in der [Shopify-Themeverwaltung](https://admin.shopify.com/store/au3j0y-hq/themes) nach erneutem Hashvergleich genau den [freigegebenen Zweidateidiff](MERCHANT-CONSOLE-20261029.patch) übernehmen. Der konkrete Vorschau- und Nachher-Beleg liegt bereits im [Prüfbericht](MERCHANT-CONSOLE-20261029.md). Keine weitere inhaltliche Freigabe nötig; aktueller Zugriff und Quellenvergleich bleiben erforderlich.

[Sanitisierte Zugangs- und Hashbelege](SCHEMA-LIVE-FREIGABE-BELEGE-20261029.json). Claude-Kenntnisnahme ist unbekannt. Vorhandene Aufgaben-IDs, Tagesgrenze, Zeitplan und sonstige Inhabergrenzen bleiben erhalten.
