# Stop-Hook «uncommitted changes» durch Live-Ledger — Vorschlag (12.10.2026)

## Befund (gemessen)
- Der Hook `/root/.claude/stop-hook-git-check.sh` prüft drei Dinge: (1) `git diff` nicht leer, (2) untracked Dateien,
  (3) lokale Commits, die nicht auf origin sind.
- Die Live-Ledger unter `dropship/` (CJ-Runner, Textbild-Prüfer, Ledger-Schreiber) ändern sich alle paar Sekunden.
  Nach jedem Commit+Push sind sie wieder dirty → der Hook meldet bei jedem Stopp erneut.
- Der Autocommit-Loop (`automation/autocommit.sh`, Repo-Fassung seit 12.10.) committet und pusht `dropship/` alle 5 Min.
  Das ist die richtige Sicherung; der Hook sieht nur den Zwischenzustand.

## Vorgeschlagene Änderung (drei Zeilen, nur `dropship/` ausgenommen)
Datei: `/root/.claude/stop-hook-git-check.sh`

```diff
-if ! git diff --quiet || ! git diff --cached --quiet; then
+if ! git diff --quiet -- . ':(exclude,top)dropship/' || ! git diff --cached --quiet -- . ':(exclude,top)dropship/'; then
```
```diff
-untracked_files=$(git ls-files --others --exclude-standard)
+untracked_files=$(git ls-files --others --exclude-standard -- . ':(exclude,top)dropship/')
```

Die dritte Prüfung (nicht gepushte Commits) bleibt unverändert: sie sichert, dass Gepushtes auf origin landet.
Code ausserhalb von `dropship/` bleibt voll geprüft. Vor dem Anwenden: Datei sichern.

## Status
- Die Änderung wurde NICHT angewendet: der Auto-Modus hat die Selbst-Modifikation der Harness-Datei blockiert.
  Anwenden: Betreiber-Klick oder Freigabe für genau diese Datei.
