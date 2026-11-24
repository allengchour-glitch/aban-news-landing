# Papierbot-Strategie 24.11.2026 (nur Spielgeld, nichts Echtes)

Auftrag des Besitzers: 1000 Papiergeld, freie Grösse, «deine beste Strategie», Daten aus dem Netz analysieren. **Auslegung (meine, nicht bestätigt).**

## Ergebnis in einem Satz
Keine Strategie mit Handel im Minutentakt hält die Gebühren; die einzige belegte Regel ist «Bitcoin nur über dem 100-Tage-Schnitt, sonst Cash» (wenige Trades im Jahr).

## GEMESSEN (24.11.2026)
- **Minutenprofil (13 Märkte, 1 Tag, Spread 2 bp angenommen):** aktuelles Profil `scalping-aggressiv-v1` 3 Trades, Netto +0,01; lockeres Profil (Spread 8 bp, Volumen 0, Kosten/ATR 2, Netto-RR 1) 810 Trades, 25 % Treffer, Gebühren 81, Netto −129 USDT. Mehr Trades = mehr Verlust.
- **Tageskerzen 2019–2025, 30 Coins, 0 Lücken** (`daten_holen.mjs`, `backtest.mjs`, Kosten 0,15 % je Seite; Stress 0,30 %). Je Kalenderjahr: Bitcoin halten +302/+58/−65/+154/+112/−7 % (2020–2025); Bitcoin über SMA100 sonst Cash +166/+74/−21/+81/+56/+3 %, Verlauf +1050 % bei max. Rückgang 39 % (halten: +751 %, 77 %). Stress 0,30 %: +902 %. SMA 50 bis 200 verhalten sich ähnlich (`empfindlichkeit.mjs`).
- **Kontrollen:** Zufalls-Signal −98 %; Signal mit Zukunftsdaten absurd gut (Messgerät erkennt Mogeln).
- **Verworfen:** Long/Short je Coin (+102 % bei 79 % Rückgang), Querschnitts-Momentum und Donchian 50/20 (riesige Zahlen nur durch 2021 und die heute gelisteten Coins, 2025 −44 bzw. −53 %: Survivorship-Verdacht).

## Recherche (Behauptungen, nur Suchauszüge gelesen, Unteragent Sonnet)
Zeitreihen-Trend halten laut mehreren Preprints (Zarattini/Pagani/Barbon SSRN 5209907, Autoren bei einer Vermögensverwaltung); Querschnitts-Momentum schwach (Replikation CTREND: Sharpe 0,01); Funding-Carry komprimiert, 2025 evtl. negativ; Fear&Greed ohne belastbare Studie; zur Short-Seite nichts Sauberes.

## Ungemessen
Nur Bitcoin und 7 Jahre (wenige Zyklen); Gebühr/Rutschen angenommen; Funding und Short nicht getestet; Wirkung live unbekannt. Signal am 23.11.2026: Schluss 61 270,93 unter dem 100-Tage-Schnitt → **Cash**.

## Papier-Lauf
`node btc_trend_papier.mjs ledger.json` (einmal täglich nach 00:05 UTC, ein Lauf je Datum), Test `btc_trend_papier.test.mjs`. Läuft noch nirgends automatisch; Ablage und Zeitplan entscheidet der Besitzer. Der Minuten-Nachrechner `nachrechner_minutenprofil.mjs` hat feste Arbeitspfade (Paket entpackt, Kerzendateien).

## Nachtrag: dieselbe Regel unverändert auf 30 Coins einzeln (GEMESSEN 24.11., `je_coin.mjs`, ab 2020, Kosten 0,15 % je Seite)
- Kleinerer maximaler Rückgang als Halten: **24 von 30** Coins. Höhere Rendite als Halten: **19 von 30**.
- Der Schutz vor Einbrüchen ist also breit belegt, ein Renditevorteil nicht: bei den grossen Gewinnern (BNB, SOL, TRX, XRP, ETH, LINK) liegt Halten klar vorn. Survivorship: nur heute gelistete Coins.
- Folge: Die Regel ist ein Risikoschutz, kein Gewinnversprechen. Funding-Daten, 4h/1h-Kerzen und Short sind weiter ungemessen.
