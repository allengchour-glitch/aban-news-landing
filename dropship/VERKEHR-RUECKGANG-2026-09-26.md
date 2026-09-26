# Besucher-Rückgang Ende August → September (gemessen 26.09.2026, 08:10 UTC, ShopifyQL `sessions`)

## Sitzungen je Woche und Quelle

| Quelle | 24.08. | 31.08. | 07.09. | 14.09. | 21.09. (6 T) |
|---|---:|---:|---:|---:|---:|
| (direkt) | 257 | 279 | 244 | 150 | 71 |
| Facebook | 54 | 42 | 18 | 10 | 15 |
| Google | 20 | 22 | 26 | 25 | 13 |
| Pinterest | 20 | 10 | 21 | 16 | 3 |
| Bing | 1 | 21 | 2 | 3 | 0 |
| ChatGPT | 4 | 1 | 3 | 4 | 5 |

Warenkorb-Zulagen je Woche: 2 · 6 · 1 · 7 · 1. Kasse erreicht in den letzten 7 Tagen: 0.

## Wo der Rückgang sitzt
- **Direkt, Schweiz, Handy, Standort «Zürich»:** 136 → 105 → 61 → 44 → 11. Das ist der Grossteil.
  Mobilfunk-IPs werden oft Zürich zugeordnet. Dahinter können App-Browser ohne Absender stecken, aber auch
  eigene Aufrufe (Betreiber am Handy). Das lässt sich aus den Shopify-Daten **nicht trennen** — Befund, keine Erklärung.
- **Instagram ist es nicht:** Profil-Website-Klicks 4 in 28 Tagen (Graph-API `website_clicks`), Profilaufrufe 61, Reichweite 809.
- **Facebook:** 54 → 15 pro Woche.
- **Pinterest:** 16 → 3, obwohl weiter gepinnt wird (22.–25.09.: 29 Pins ok, 1 Fehler; seit 23.09. zusätzlich über Metricool).
  Pinterest-Verkehr kommt vor allem aus älteren Pins; ob deren Aufrufe sinken, zeigt nur die Pinterest-/Metricool-Analytik
  (Zugriff in dieser Sitzung nicht freigegeben).
- **Google stabil** (20–26/Woche; die laufende Woche hat erst 6 Tage). Die Google-Sperren sinken (1'957 → 1'299).
- **Einzelausschläge:** China 65 + 27 direkte Sitzungen (07./14.09.), USA 31 — Bots oder Lieferanten, kein Kaufverkehr.

## Nächste Schritte (nicht gestartet)
1. Pinterest-Analytik (Impressionen, ausgehende Klicks je Woche) über Metricool lesen — braucht die Freigabe des Konnektors.
2. Eigene Aufrufe ausblenden: Betreiber-IP bzw. Gerät in Shopify als intern markieren ist nicht möglich; stattdessen
   Messung auf Quellen mit Absender (Google, Pinterest, Facebook) stützen.
3. Werbung bleibt laut Betreiber-Plan für ~Oktober vorgesehen; ohne sie ist Google Gratis-Einträge der stabilste Kanal.
