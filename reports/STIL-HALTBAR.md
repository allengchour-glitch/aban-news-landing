# Hält der Skill? — erste Hälfte gegen zweite Hälfte

Stand 2026-09-25 · `python3 tools/trading/stil_haltbar.py` · kein echtes Geld.

Jede Kursreihe wird halbiert. Skill wie im Stil-Labor (Anteil von 200 Zufallsstrategien mit gleicher
Marktzeit und gleich vielen Wechseln, die der Stil nach Kosten schlägt), aber je Hälfte getrennt.

## Skill erste → zweite Hälfte

| Stil | S&P 500 | SMI | Nestlé | Bitcoin | EUR/CHF | Gold | Silber | Öl (WTI) | Schnitt |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Trendfolge | 99% → 16% | 98% → 7% | 23% → 0% | 86% → 70% | 84% → 78% | 76% → 45% | 86% → 57% | 84% → 48% | **80% → 40%** |
| Momentum | 98% → 62% | 98% → 2% | 86% → 4% | 94% → 96% | 20% → 35% | 34% → 46% | 83% → 68% | 30% → 68% | **68% → 48%** |
| Ausbruch (Turtle) | 44% → 6% | 94% → 0% | 32% → 0% | 98% → 90% | 3% → 27% | 30% → 58% | 45% → 55% | 24% → 76% | **46% → 39%** |
| Mean Reversion | 96% → 80% | 98% → 42% | 100% → 25% | 48% → 57% | 46% → 20% | 72% → 46% | 34% → 24% | 61% → 29% | **69% → 40%** |
| Buy the Dip | 62% → 26% | 43% → 90% | 82% → 100% | 20% → 48% | 100% → 92% | 81% → 76% | 42% → 55% | 88% → 22% | **65% → 64%** |
| Swing | 100% → 100% | 86% → 92% | 91% → 88% | 90% → 72% | 100% → 88% | 50% → 37% | 69% → 26% | 31% → 81% | **77% → 73%** |
| Saison: Sell in May | 92% → 30% | 82% → 66% | 44% → 74% | 22% → 77% | 61% → 55% | 72% → 82% | 94% → 47% | 83% → 55% | **69% → 61%** |
| Monatswechsel | 93% → 44% | 98% → 50% | 97% → 53% | 98% → 40% | 28% → 20% | 64% → 96% | 82% → 57% | 89% → 58% | **81% → 52%** |
| Ruhige Phasen | 30% → 78% | 40% → 12% | 0% → 0% | 47% → 24% | 2% → 17% | 70% → 18% | 97% → 8% | 96% → 76% | **48% → 29%** |

Teilung: S&P 500 2013-05-14, SMI 2013-04-25, Nestlé 2013-03-19, Bitcoin 2020-09-20, EUR/CHF 2014-12-08, Gold 2013-09-20, Silber 2013-09-19, Öl (WTI) 2013-09-16

## Hängen die beiden Hälften zusammen?

- Rangkorrelation über 72 Paare (Abstand zum Zufall z, nicht der gedeckelte Prozentwert): **ρ = +0.17** · Permutationstest p = 0.079
  (20'000 zufällige Zuordnungen; p < 0.05 hiesse: der Zusammenhang ist kaum Zufall).
- Paare mit ≥ 80% Skill in der ersten Hälfte: **37**, davon auch in der zweiten ≥ 80%: **8**. Ohne jeden Zusammenhang wären es 6.2.
- Auf der ganzen Reihe (Stil-Labor) liegen 12 von 72 Werten ≥ 95 %. Reiner Zufall ergäbe 3.6 (Binomial p = 0.0002). ⚠️ Das rechnet mit 72 unabhängigen Versuchen — sie sind es nicht: derselbe Stil auf S&P 500 und SMI, Gold und Silber läuft ähnlich. Die Hälften-Prüfung oben ist darum die strengere.

## Trader-Test: den besten Stil der ersten Hälfte weiter handeln

| Markt | gewählt (Skill Hälfte 1) | Skill Hälfte 2 | Rendite/Jahr Hälfte 2 | Halten Hälfte 2 | Sharpe Stil / Halten |
|---|---|---:|---:|---:|---:|
| S&P 500 | Swing (100%) | 100% | +2.7% | +12.3% | 0.44 / 0.77 |
| SMI | Trendfolge (98%) | 7% | +0.7% | +4.3% | 0.12 / 0.36 |
| Nestlé | Mean Reversion (100%) | 25% | -1.8% | +0.9% | -0.35 / 0.14 |
| Bitcoin | Ausbruch (Turtle) (98%) | 90% | +22.0% | +26.4% | 0.85 / 0.73 |
| EUR/CHF | Swing (100%) | 88% | -2.0% | -2.0% | -1.04 / -0.24 |
| Gold | Buy the Dip (81%) | 76% | +1.4% | +9.5% | 0.25 / 0.63 |
| Silber | Ruhige Phasen (97%) | 8% | -1.7% | +8.2% | 0.03 / 0.41 |
| Öl (WTI) | Ruhige Phasen (96%) | 76% | +3.7% | -1.1% | 0.27 / 0.22 |

Im Schnitt hatte die Auswahl in der zweiten Hälfte **59%** Skill. Mehr verdient und besser pro Risiko als Halten: **1 von 8** Märkten.

Gegenprobe mit demselben Test: 72 Münzwurf-Stile ρ = +0.07 (p = 0.29, kein Zusammenhang; mittlerer Skill 54%, Eichung ~50 %), 72 Stile, die an 0–8 % der Tage den nächsten Tag kennen, ρ = +0.52 (p < 0.001, Zusammenhang erkannt).

Keine Anlageberatung.
