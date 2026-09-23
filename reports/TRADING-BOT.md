# Lern-Bot Trading — ehrlicher Rückblick

Stand 2026-09-23 · `python3 tools/trading/lern_bot.py` · handelt kein echtes Geld.

**Lernen** heisst hier: auf 5 Jahren die beste Strategie suchen, dann das nächste, ungesehene Jahr damit
handeln — Jahr für Jahr. Kosten 0.1 % pro Wechsel, Signal erst am Folgetag gehandelt, nur long oder Cash.

## Liegt er irgendwann immer richtig?

| Markt | Generation | Strategien | richtig auf Lern-Daten | richtig auf ungesehenen Jahren |
|---|---:|---:|---:|---:|
| S&P 500 | 1 | 2 | 53.4% | 53.4% |
| S&P 500 | 2 | 14 | 53.7% | 52.7% |
| SMI | 1 | 2 | 52.3% | 52.1% |
| SMI | 2 | 14 | 52.6% | 51.1% |
| Nestlé | 1 | 2 | 50.5% | 49.4% |
| Nestlé | 2 | 14 | 51.4% | 50.4% |
| Nestlé | 3 | 30 | 51.1% | 48.9% |
| Bitcoin | 1 | 2 | 52.5% | 50.4% |
| Bitcoin | 2 | 14 | 53.1% | 51.3% |
| Bitcoin | 3 | 30 | 53.1% | 51.3% |
| EUR/CHF | 1 | 2 | 51.9% | 51.8% |
| EUR/CHF | 2 | 14 | 52.2% | 51.4% |
| Gold | 1 | 2 | 53.1% | 51.8% |
| Gold | 2 | 14 | 53.2% | 52.7% |
| Gold | 3 | 30 | 52.1% | 50.2% |
| Silber | 1 | 2 | 53.4% | 52.9% |
| Silber | 2 | 14 | 53.3% | 52.1% |
| Öl (WTI) | 1 | 2 | 52.5% | 51.5% |
| Öl (WTI) | 2 | 14 | 52.8% | 51.3% |

### Der Auswendiglerner — so sieht „immer richtig“ aus

Er merkt sich jedes Kursmuster der letzten k Tage und was danach kam. Je länger das Muster, desto
einmaliger — bis er die Vergangenheit fast perfekt „vorhersagt“.

| Markt | Muster-Länge | richtig auf Vergangenheit | richtig auf ungesehenen Jahren |
|---|---:|---:|---:|
| S&P 500 | 3 Tage | 55.7% | 54.2% |
| S&P 500 | 8 Tage | 68.1% | 51.3% |
| S&P 500 | 14 Tage | 97.8% | 54.5% |
| S&P 500 | 20 Tage | 100.0% | 54.7% |
| SMI | 3 Tage | 54.0% | 51.9% |
| SMI | 8 Tage | 67.9% | 51.3% |
| SMI | 14 Tage | 98.1% | 53.5% |
| SMI | 20 Tage | 100.0% | 53.6% |
| Nestlé | 3 Tage | 53.4% | 51.0% |
| Nestlé | 8 Tage | 68.0% | 50.7% |
| Nestlé | 14 Tage | 98.1% | 52.1% |
| Nestlé | 20 Tage | 100.0% | 51.8% |
| Bitcoin | 3 Tage | 54.8% | 51.2% |
| Bitcoin | 8 Tage | 67.3% | 51.3% |
| Bitcoin | 14 Tage | 98.0% | 51.0% |
| Bitcoin | 20 Tage | 100.0% | 50.9% |
| EUR/CHF | 3 Tage | 54.1% | 52.0% |
| EUR/CHF | 8 Tage | 67.4% | 49.3% |
| EUR/CHF | 14 Tage | 98.4% | 48.6% |
| EUR/CHF | 20 Tage | 100.0% | 47.9% |
| Gold | 3 Tage | 55.1% | 51.8% |
| Gold | 8 Tage | 68.1% | 51.9% |
| Gold | 14 Tage | 98.0% | 53.0% |
| Gold | 20 Tage | 99.9% | 53.1% |
| Silber | 3 Tage | 55.0% | 51.9% |
| Silber | 8 Tage | 67.6% | 51.5% |
| Silber | 14 Tage | 98.0% | 52.2% |
| Silber | 20 Tage | 100.0% | 52.9% |
| Öl (WTI) | 3 Tage | 54.1% | 51.1% |
| Öl (WTI) | 8 Tage | 67.8% | 52.3% |
| Öl (WTI) | 14 Tage | 98.0% | 51.3% |
| Öl (WTI) | 20 Tage | 100.0% | 52.0% |

Mehr Auswahl hebt die Trefferquote auf den **Lern-Daten**. Auf den **ungesehenen** Jahren bleibt sie
nahe 50 %. Diese Lücke ist Auswendiglernen der Vergangenheit, kein Können.

## Urteil pro Markt (nur ungesehene Jahre)

| Markt | Daten | Bot: Rendite/Jahr | Halten: Rendite/Jahr | Bot: schlimmster Einbruch | Halten: schlimmster Einbruch | Bot: Sharpe | Halten: Sharpe | Zufall? (p) | echtes Geld |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| S&P 500 | 2000–2026 | +6.1% | +8.7% | -34% | -57% | 0.50 | 0.53 | 0.94 | NEIN |
| SMI | 2000–2026 | +3.6% | +4.2% | -29% | -55% | 0.37 | 0.33 | 0.71 | NEIN |
| Nestlé | 2000–2026 | +1.9% | +5.3% | -29% | -45% | 0.22 | 0.39 | 0.98 | NEIN |
| Bitcoin | 2014–2026 | +22.4% | +15.7% | -71% | -77% | 0.71 | 0.54 | 0.44 | NEIN |
| EUR/CHF | 2003–2026 | -0.3% | -3.0% | -12% | -46% | -0.10 | -0.33 | 0.06 | NEIN |
| Gold | 2000–2026 | +10.1% | +11.3% | -34% | -44% | 0.73 | 0.69 | 0.76 | NEIN |
| Silber | 2000–2026 | +7.9% | +9.8% | -60% | -76% | 0.43 | 0.45 | 0.83 | NEIN |
| Öl (WTI) | 2000–2026 | +2.1% | +0.2% | -53% | -93% | 0.21 | 0.22 | 0.75 | NEIN |

⚠️ Die Generation, die hier zählt, wählt der Bot, indem er schaut, ob mehr Auswahl die ungesehenen
Jahre verbessert. Das ist ein kleiner Blick in die Prüfungsdaten und begünstigt den Bot. Das Urteil gilt trotzdem.

**Echtes Geld: JA** nur, wenn der Bot auf den ungesehenen Jahren besser abschneidet als Halten
(Rendite pro Risiko), nicht weniger verdient und der Vorsprung kaum Zufall ist (p < 0.05).

## Was er am häufigsten gewählt hat

- S&P 500: Gleitende Durchschnitte 50/200 (17× in 21 ungesehenen Jahren)
- SMI: Gleitende Durchschnitte 50/200 (17× in 21 ungesehenen Jahren)
- Nestlé: Gleitende Durchschnitte 20/200 (6× in 21 ungesehenen Jahren)
- Bitcoin: Momentum 250 Tage (5× in 12 ungesehenen Jahren)
- EUR/CHF: Gleitende Durchschnitte 50/200 (19× in 19 ungesehenen Jahren)
- Gold: Gleitende Durchschnitte 50/100 (8× in 20 ungesehenen Jahren)
- Silber: Momentum 250 Tage (11× in 20 ungesehenen Jahren)
- Öl (WTI): Gleitende Durchschnitte 50/200 (10× in 20 ungesehenen Jahren)

## Gesamturteil

Auf keinem der Märkte schlägt der Bot das einfache Kaufen-und-Halten belastbar.

Keine Anlageberatung. Vergangene Kurse sagen die Zukunft nicht voraus — auch nicht die ungesehenen Jahre hier.
