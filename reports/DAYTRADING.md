# Daytrading-Test — ehrlicher Rückblick

Stand 2026-09-25 · `python3 tools/trading/daytrading.py` · kein echtes Geld.

Stundenkerzen der letzten ~2 Jahre. Jede Position wird am selben Tag geschlossen. Die Regel für die
nächsten 20 Tage wählt der Bot auf den 120 Tagen davor; gezählt werden nur diese ungesehenen Tage.

| Markt | ungesehene Tage | Trades richtig | ohne Kosten | mit 0.05 % Kosten | schlimmster Einbruch | immer long (Tag) | Münzwurf gleich gut | pro Jahr je nach Startpunkt | im Plus | häufigste Regel |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Gold | 480 | 50.4% | +33.0% | +4.7% | -26% | +6.6% | 13% | -17% bis +5% | 20% | Ausbruch aus 3-Std.-Spanne |
| Silber | 480 | 50.3% | -27.1% | -42.4% | -61% | +15.3% | 58% | -43% bis +12% | 10% | Erste 1 Std. umkehren |
| Öl (WTI) | 480 | 47.5% | -70.8% | -76.9% | -79% | -30.7% | 96% | -68% bis -30% | 0% | Erste 3 Std. umkehren |
| S&P 500 (Future) | 480 | 42.8% | -28.3% | -41.9% | -44% | +6.1% | 89% | -36% bis -18% | 0% | Erste 3 Std. umkehren |
| Bitcoin | 600 | 47.3% | +1.5% | -28.0% | -64% | -51.1% | 40% | -40% bis +2% | 5% | Erste 3 Std. umkehren |
| Apple | 600 | 48.6% | -19.0% | -44.3% | -53% | -30.4% | 87% | -25% bis -19% | 0% | Erste 3 Std. umkehren |
| Nvidia | 600 | 51.1% | +8.1% | -4.7% | -43% | +3.6% | 20% | -27% bis -1% | 0% | Erste 2 Std. folgen |
| Tesla | 600 | 43.7% | -31.8% | -58.8% | -64% | -15.0% | 86% | -40% bis -4% | 0% | Erste 2 Std. folgen |
| Microsoft | 600 | 43.2% | -27.7% | -37.8% | -40% | -21.1% | 85% | -21% bis -9% | 0% | Erste 1 Std. folgen |
| Amazon | 600 | 45.8% | -32.0% | -43.0% | -45% | -14.8% | 82% | -23% bis -8% | 0% | Erste 1 Std. umkehren |
| Nestlé | 600 | 46.7% | +4.3% | -26.7% | -33% | -32.3% | 50% | -16% bis -10% | 0% | Erste 2 Std. umkehren |
| Novartis | 600 | 49.1% | +41.4% | +4.9% | -23% | +16.6% | 4% | -7% bis +3% | 30% | Erste 1 Std. folgen |
| Roche | 600 | 50.8% | +28.7% | -15.5% | -42% | +28.1% | 27% | -13% bis -2% | 0% | Erste 1 Std. folgen |
| UBS | 600 | 46.3% | -19.0% | -41.6% | -46% | -4.3% | 82% | -30% bis -17% | 0% | Erste 3 Std. folgen |

Gegenprobe pro Markt: eine Regel, die den Tagesschluss kennt, trifft Gold 100%, Silber 100%, Öl (WTI) 100%, S&P 500 (Future) 100%, Bitcoin 100%, Apple 100%, Nvidia 100%, Tesla 100%, Microsoft 100%, Amazon 100%, Nestlé 100%, Novartis 100%, Roche 100%, UBS 100%; Zufall um 50 %.

## Was das heisst

„Münzwurf gleich gut“: Anteil von 2000 Zufalls-Richtungen an denselben Tagen, die mindestens so viel
verdienen wie der Bot. Über 5 % heisst: das Ergebnis ist mit Glück erklärbar.

„Je nach Startpunkt“: dasselbe Verfahren, nur die 20-Tage-Blöcke um 0 bis 19 Tage verschoben.
„im Plus“: bei wie vielen der 20 Startpunkte nach Kosten ein Gewinn herauskommt.

Ohne Kosten sieht Daytrading oft harmlos aus. Mit realistischen Kosten zahlt man bei jedem Trade —
bei einem Trade pro Tag rund 250-mal im Jahr. Genau dort verlieren die meisten.

Keine Anlageberatung.
