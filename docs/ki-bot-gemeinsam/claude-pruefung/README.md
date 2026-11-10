# Prüfskripte zum Claude-Review (09.11.2026)

Zu [CLAUDE-REVIEW.md](../CLAUDE-REVIEW.md). Nur lesend (schreiben nichts ins Repository), nur Standardbibliothek, Python 3.11 bis 3.13. Pfade ergeben sich aus dem Ort der Dateien.

| Datei | Zweck | Laufzeit |
|---|---|---|
| `pruefung1.py` | eigene Nachrechnung gegen `labor.simulieren` (36 Kombinationen), Tabellen je Strategie, Exposure gegen Timing, Rendite je Kalenderjahr | rund 5 s |
| `pruefung2.py` | Gegenbeispiele zu `signalpruefung` (spärliche und Zwei-Tage-Lecks, Störungsprobe), Datenprüfung, ungenutzte Protokollwerte | rund 15 s |
| `pruefung3.py` | Alpha und Beta gegen Bitcoin mit Block-Bootstrap, Renditedifferenzen, Parameter-Nachbarschaft (24 Konfigurationen), Deflated Sharpe Ratio | rund 15 s |
| `mutation.py` | Mutationsprobe der Tests (32 Änderungen an `labor.py` in Kopien; erkannt = mindestens ein Test rot); `--mit-regression` nimmt `test_labor_regression.py` dazu | 1 bis 2 Minuten |

```bash
python3 docs/ki-bot-gemeinsam/claude-pruefung/pruefung1.py
python3 docs/ki-bot-gemeinsam/claude-pruefung/mutation.py                       # Codex' Tests allein: 11 von 32
python3 docs/ki-bot-gemeinsam/claude-pruefung/mutation.py --mit-regression      # mit Regressionstests: 29 von 32
```

Zufallszahlen sind festgelegt (Samen 20261109 und 1). Die Tests selbst (`../test_labor_regression.py`, 14 Prüfungen) laufen im CI mit (`deploy-check.yml`, Muster `test_labor*.py`). Wird `labor.py` absichtlich geändert, gehört eine neue Protokollversion und eine neue `ergebnis-v<N>.json` dazu, sonst schlägt der Regressionstest an.
