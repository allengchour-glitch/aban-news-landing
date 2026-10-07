# .tsv-Ledger gingen bei jedem Snapshot-Restore verloren (07.10.2026, Verbesserungsrunde Plan-Tag 7)

## GEMESSEN
- **Google-Blocker:** 1'052, Ziel < 600.
  - Adult/Sexual: je 225 (dieselben Produkte).
  - Image under review: 212.
  - Inappropriate: 189.
  - Page unavailable: 92.
  - Overlay: 27.
- **Bildklassen:** Alle drei laufen alle 2 h im Bildtausch-Wechselbetrieb. Overlay hat 0 offene Fälle, Inappropriate 40 offene.
- **«Product page unavailable»**, 61 aufgelistet von 92:
  - 60 davon sind ACTIVE, kaufbar und liefern HTTP 200.
  - Sie haben viele Varianten: Median 32, 65 % mit ≥ 30. In der Vergleichsgruppe (400 Stück) sind es Median 2 und 7 %.
  - Die 331 bereits frei gewordenen Produkte haben aber ebenfalls viele Varianten (Median 22, 44 % ≥ 30). Der Anstupser (alle 3 Tage) wirkt also auch bei ihnen. Die Variantenzahl ist kein eigener Hebel.
  - robots.txt sperrt keine Varianten-URLs.
- **Bildtausch-Ledger ≠ Log:**
  - Der Lauf vom 06.10. 17:17 tauschte «hawaiihemd-fur-herren-mit-3d-print-606700» und «mushroom-luftkissen-bb-creme-c5b628». Die Ledger-Zeilen fehlen.
  - Um 20:43 galten beide als offen und wurden ein zweites Mal getauscht. Insgesamt wurden 4 von 606 Handles doppelt getauscht.
- **Ursache:** `repo_vorspulen.sh` (Rewind nach Snapshot-Restore, im Aufseher-Log 3× erkannt) sicherte und vereinigte nur `dropship/*.txt`. Die **85 `.tsv`-Ledger** verloren bei `git reset --hard` jede noch nicht gepushte Zeile. Betroffen sind unter anderem Bildtausch, CJ-Lager, Kategorie-fein, Anstupser und Alter-im-Farbwert.

## GETAN
- `automation/ledger_union.py` (neu, Selbsttest 8/8) mit der **Schwanz-Union**:
  - Zurückgespielt werden nur Zeilen, die im Snapshot NACH der letzten gemeinsamen Zeile mit origin stehen.
  - Was mittendrin fehlt, wurde bewusst gelöscht und bleibt draussen.
  - Haben Snapshot und origin keine gemeinsame Zeile, wird nichts zurückgespielt (neu geschriebene Tabelle).
  - Zeilen mit `cj-ohne-antwort` werden nie zurückgespielt.
- `repo_vorspulen.sh`:
  - sichert jetzt auch `dropship/*.tsv`;
  - führt die Union nur bei grünem Selbsttest aus;
  - behält bei rotem Selbsttest den Sicherungsordner.
- Gegenprobe gegen origin mit dem Arbeitsbaum als Snapshot:
  - 2 Dateien, 8 Zeilen. Der Schwanz ist identisch mit allen neuen Zeilen.
  - Es würde also keine gelöschte Zeile zurückkommen.

## OFFEN
- 4 `.jsonl` und 61 `.json` in `dropship/` sind nicht vereinigt. Fast alle sind Zustands- oder Berichtsdateien. Prüfen, ob darunter ein Anhänge-Ledger ist.
- Blocker < 600 hängt an Googles Nachprüfung der getauschten Bilder (Adult 228 → 225 in 24 h).
