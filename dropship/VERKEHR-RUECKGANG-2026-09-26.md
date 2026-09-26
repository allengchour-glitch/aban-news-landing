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

## Nachtrag 09:00 UTC — Pinterest gemessen (Metricool-API + Hetzner-Browser in der Pinterest-Analytics)
- **Metricool (eigene Pins, Zugang der Poster):** 94 Pins seit Juli, zusammen **4 ausgehende Klicks**. Die 36 Pins der
  Woche ab 21.09. haben zusammen **26 Impressionen**; die Juli-Pins hatten 1'955 bzw. 612.
- **Pinterest-Analytics (Server, eingeloggt, 27.08.–26.09.):** 54'080 Impressionen (−26 %), 69 ausgehende Klicks (+25 %),
  157 Seitenaufrufe, 0 Checkouts. Verlauf (Bild `dropship/pinterest-analytics-2026-09-26.png`): ~2'000/Tag Ende August,
  Spitze ~8'000/Tag am 13.–14.09., danach Absturz; **seit ~22.09. nahe null**.
- **Zeitlicher Zusammenhang, nicht bewiesen:** Am 22.09. setzte der Browser-Agent 11 Pins an einem Tag, ab 23.09.
  kommen 4 Metricool-Pins pro Tag dazu. Ein neues Konto mit plötzlichem Pin-Schwall wird von Pinterest oft gedrosselt.
- Der Katalog ist vollständig im Pinterest-Kanal (49'764 aktive Produkte) — daran liegt es nicht.
- **Kadenz nicht geändert** (Pins alle 6 h = Betreiber-Vorgabe). Entscheid Betreiber: Pin-Kadenz senken/pausieren, um
  die Drosselung zu testen, oder weiterlaufen lassen.
