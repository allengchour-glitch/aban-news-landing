# Stil-Labor — neun Trading-Stile, acht Märkte, Skill in Prozent

Stand 2026-09-23 · `python3 tools/trading/stil_labor.py` · kein echtes Geld.

**Skill %** = Anteil von 200 Zufallsstrategien, die der Stil nach Kosten schlägt (Sharpe). Die Zufalls-
strategien sind gleich lang im Markt und wechseln gleich oft. 50 % = kein Können, über 95 % = auffällig.

| Stil | Regel | S&P 500 | SMI | Nestlé | Bitcoin | EUR/CHF | Gold | Silber | Öl (WTI) | Schnitt |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Trendfolge | Gleitende Durchschnitte 50/200 | 98% | 87% | 0% | 91% | 87% | 57% | 78% | 77% | **72%** |
| Momentum | Kurs über dem Vorjahr | 98% | 66% | 12% | 100% | 16% | 46% | 74% | 52% | **58%** |
| Ausbruch (Turtle) | 55-Tage-Hoch kaufen, 20-Tage-Tief verkaufen | 20% | 5% | 1% | 99% | 4% | 42% | 50% | 54% | **34%** |
| Mean Reversion | RSI(2) unter 10 kaufen, über 70 verkaufen | 100% | 87% | 92% | 60% | 34% | 62% | 21% | 48% | **63%** |
| Buy the Dip | nach −5 % in 5 Tagen kaufen, 10 Tage halten | 48% | 72% | 99% | 26% | 100% | 86% | 53% | 50% | **67%** |
| Swing | nach 3 Minus-Tagen kaufen, am ersten Plus-Tag raus | 100% | 95% | 98% | 92% | 100% | 39% | 44% | 73% | **80%** |
| Saison: Sell in May | November bis April investiert | 73% | 82% | 57% | 50% | 57% | 88% | 87% | 76% | **71%** |
| Monatswechsel | letzter bis 3. Handelstag investiert | 86% | 91% | 94% | 94% | 9% | 92% | 78% | 89% | **79%** |
| Ruhige Phasen | investiert, wenn die Schwankung unter dem Jahresmittel liegt | 50% | 24% | 0% | 24% | 2% | 57% | 59% | 96% | **39%** |

## Rendite pro Jahr (Stil / Halten)

| Stil | S&P 500 | SMI | Nestlé | Bitcoin | EUR/CHF | Gold | Silber | Öl (WTI) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Trendfolge | +6.8% / +6.4% | +3.0% / +2.5% | -1.4% / +3.7% | +33.2% / +34.9% | -0.1% / -1.8% | +8.2% / +11.2% | +8.7% / +10.4% | +5.2% / +4.2% |
| Momentum | +6.2% / +6.4% | +1.4% / +2.5% | -0.3% / +3.7% | +42.5% / +34.9% | -1.1% / -1.8% | +7.4% / +11.2% | +8.9% / +10.4% | +2.5% / +4.2% |
| Ausbruch (Turtle) | +0.9% / +6.4% | -1.1% / +2.5% | -1.8% / +3.7% | +31.3% / +34.9% | -1.2% / -1.8% | +3.5% / +11.2% | +3.3% / +10.4% | +1.3% / +4.2% |
| Mean Reversion | +1.5% / +6.4% | +0.2% / +2.5% | +0.3% / +3.7% | +2.4% / +34.9% | -0.7% / -1.8% | +0.4% / +11.2% | -1.3% / +10.4% | -0.5% / +4.2% |
| Buy the Dip | -0.1% / +6.4% | +0.6% / +2.5% | +3.8% / +3.7% | +10.0% / +34.9% | +1.2% / -1.8% | +2.6% / +11.2% | +2.5% / +10.4% | -0.2% / +4.2% |
| Swing | +2.9% / +6.4% | -1.2% / +2.5% | -0.2% / +3.7% | +5.9% / +34.9% | -1.9% / -1.8% | -1.9% / +11.2% | -2.0% / +10.4% | -2.4% / +4.2% |
| Saison: Sell in May | +4.3% / +6.4% | +2.5% / +2.5% | +2.0% / +3.7% | +15.4% / +34.9% | -1.1% / -1.8% | +7.3% / +11.2% | +8.4% / +10.4% | +4.5% / +4.2% |
| Monatswechsel | +0.2% / +6.4% | +0.2% / +2.5% | +0.5% / +3.7% | +9.5% / +34.9% | -3.0% / -1.8% | +1.6% / +11.2% | +1.4% / +10.4% | +2.0% / +4.2% |
| Ruhige Phasen | +2.9% / +6.4% | -0.1% / +2.5% | -2.9% / +3.7% | +13.0% / +34.9% | -2.8% / -1.8% | +4.8% / +11.2% | +5.6% / +10.4% | +7.2% / +4.2% |

Gegenprobe: S&P 500 Wissender 100% / Münzwurf 42%, SMI Wissender 100% / Münzwurf 98%, Nestlé Wissender 100% / Münzwurf 39%, Bitcoin Wissender 100% / Münzwurf 54%, EUR/CHF Wissender 100% / Münzwurf 89%, Gold Wissender 100% / Münzwurf 26%, Silber Wissender 100% / Münzwurf 19%, Öl (WTI) Wissender 100% / Münzwurf 27%

⚠️ Neun Stile auf acht Märkten sind 72 Versuche. Bei so vielen Versuchen landen rein zufällig
ein paar über 95 %. Ein einzelner hoher Wert ist deshalb noch kein Beweis.

Keine Anlageberatung.
