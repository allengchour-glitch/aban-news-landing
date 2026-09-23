# Daytrading-Test — ehrlicher Rückblick

Stand 2026-09-23 · `python3 tools/trading/daytrading.py` · kein echtes Geld.

Stundenkerzen der letzten ~2 Jahre. Jede Position wird am selben Tag geschlossen. Die Regel für die
nächsten 20 Tage wählt der Bot auf den 120 Tagen davor; gezählt werden nur diese ungesehenen Tage.

| Markt | ungesehene Tage | Trades richtig | ohne Kosten | mit 0.05 % Kosten | schlimmster Einbruch | immer long (Tag) | Münzwurf gleich gut | häufigste Regel |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Gold | 480 | 48.5% | +19.0% | -7.2% | -36% | +8.4% | 25% | Ausbruch aus 3-Std.-Spanne |
| Silber | 480 | 51.9% | +52.8% | +20.8% | -55% | +18.9% | 14% | Erste 3 Std. umkehren |
| Öl (WTI) | 480 | 46.2% | -74.7% | -80.0% | -81% | -29.6% | 98% | Erste 1 Std. umkehren |
| S&P 500 (Future) | 480 | 41.7% | -25.8% | -44.8% | -47% | +6.1% | 93% | Erste 3 Std. umkehren |
| Bitcoin | 600 | 47.4% | +5.6% | -22.2% | -64% | -50.6% | 36% | Erste 1 Std. folgen |

Gegenprobe pro Markt: eine Regel, die den Tagesschluss kennt, trifft Gold 100%, Silber 100%, Öl (WTI) 100%, S&P 500 (Future) 100%, Bitcoin 100%; Zufall um 50 %.

## Was das heisst

„Münzwurf gleich gut“: Anteil von 2000 Zufalls-Richtungen an denselben Tagen, die mindestens so viel
verdienen wie der Bot. Über 5 % heisst: das Ergebnis ist mit Glück erklärbar.

Ohne Kosten sieht Daytrading oft harmlos aus. Mit realistischen Kosten zahlt man bei jedem Trade —
bei einem Trade pro Tag rund 250-mal im Jahr. Genau dort verlieren die meisten.

Keine Anlageberatung.
