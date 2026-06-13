# 🧠 aban-Brain — das selbst-verbessernde Hirn der Seite

Ziel: Die Seite **prüft und verbessert sich regelmäßig selbst** — deterministisch, ehrlich,
ohne Halluzination. Kein Magie-Tool, sondern ein klarer Mess- und Verbesserungs-Loop.

## Was es tut
1. **Scannen** (`tools/daily_improvement_scan.py`): prüft ALLE HTML-Seiten + `sitemap.xml`
   auf konkrete, verifizierbare Mängel:
   - SEO: `<title>`, Meta-Description, canonical, OG-Title/Description
   - a11y: `lang`-Attribut, `<img>` ohne `alt`, viewport
   - Security: unsichere `http://`-Ressourcen (Mixed Content), `target=_blank` ohne `rel=noopener`
   - Qualität: ungültiges JSON-LD, tote interne Links, Sitemap-Ziele die fehlen
   - Marke/Voice: Hype-Wörter (z. B. „einzigartig", „revolutionär", „Mehrwert") + `!!`
2. **Sicher auto-fixen** (`--fix`): mechanische, idempotente Fixes (aktuell `rel=noopener`).
3. **Messen & merken** (`automation/brain-state.json`): berechnet einen **Health-Score**
   und führt einen **Verlauf** — so sieht jeder Lauf sofort, ob es bergauf geht.
4. **Berichten** (`reports/IMPROVEMENT-REPORT.md`): priorisierte To-do-Liste (🔴/🟡/🟢).

## Der Score
```
Score = 100 − (high×3 + medium×1 + low×0.1)   # 0–100, höher = besser
```
- 🔴 high = echte Fehler (fehlendes canonical, kaputtes JSON-LD, toter Link …)
- 🟡 medium = SEO/a11y-Lücken (OG-Tags, alt-Text …)
- 🟢 low = Tonalität (Hype-Wörter) — Geschmack, nicht Fehler

**Aktueller Stand (2026-06-13):** Score **94,6/100** · 0 hoch · 0 mittel · 54 niedrig
(nur Hype-Wörter in alten KI-Branchen-Seiten). Davor in dieser Session: 83,6 → behoben:
`control.html` auf noindex, OG-Tags auf Inserate-/Nutzungs-Seiten, `alt` auf 2 Cockpit-Bildern,
Build-Output `_site/` aus dem Scan ausgeschlossen.

## Der Loop (so verbessert sich die Seite)
```bash
python3 tools/daily_improvement_scan.py --fix     # sichere Auto-Fixes
python3 tools/daily_improvement_scan.py           # neu scannen → Score + Report
#   → die 🔴/🟡-Befunde aus reports/IMPROVEMENT-REPORT.md beheben
git add -A && git commit -m "brain: …" && git push
bash build-pages.sh && npx wrangler@3 pages deploy _site --project-name=abannews --branch=main
```

## „Regelmäßig" — wie das Hirn von selbst aufwacht
Drei Wege, je nach Plattform-Lage:
1. **Session-Start-Hook** (`automation/brain-wake.sh` via `.claude/settings.json`): bei jedem
   Start einer Claude-Session meldet das Hirn Score + offene Befunde → wird sofort abgearbeitet.
   ⚠️ Muss vom User **freigegeben** werden (Schreiben in die Agent-Config ist geschützt).
2. **GitHub-Action** (`.github/workflows/daily-improvement.yml`): Cron 2×/Tag — derzeit
   **PAUSIERT**, weil GitHub Actions account-weit gesperrt ist (Fair-Use). Läuft wieder,
   sobald der User Actions entsperrt; dann nur **sparsam** (max. 1×/Tag) reaktivieren.
3. **Manuell / jede Cloud-Session**: den Loop oben ausführen (kein Cron nötig).

## Ehrliche Grenzen
- Voll-automatisch („ohne dass jemand etwas tut") braucht einen Scheduler. Solange GitHub
  Actions gesperrt ist, ist der ehrliche Ersatz: **bei jeder Session laufen lassen** (Hook/Loop).
- Das Hirn **erfindet nichts** und schreibt keine Texte um — es findet Mängel und fixt nur,
  was nachweislich sicher ist. Inhaltliche Verbesserungen entscheidet ein Mensch (oder Claude im Loop).

## Nächste Ausbaustufen (Ideen)
- Weitere sichere Auto-Fixes: fehlendes `lang`, fehlendes `theme-color`, OG aus Title/Description ableiten.
- Performance-Checks (große Inline-Bilder, fehlendes `loading="lazy"`).
- Score pro Bereich (Business / KI / Tools) statt nur gesamt.
- Hype-Wörter-Vorschläge (Ersatz-Formulierung) statt nur Fund.
