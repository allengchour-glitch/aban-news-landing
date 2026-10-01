#!/usr/bin/env bash
# 🧠 aban-Brain — weckt das Selbst-Verbesserungs-Hirn bei jedem Session-Start (read-only).
# Zeigt den aktuellen Health-Score + offene High/Medium-Befunde + den Verbesserungs-Loop.
# Schreibt NICHTS (kein Tree-Noise); der echte Scan läuft im expliziten Loop (siehe unten).
root="$(cd "$(dirname "$0")/.." && pwd)"
state="$root/automation/brain-state.json"
report="$root/reports/IMPROVEMENT-REPORT.md"
[ -f "$state" ] || exit 0
python3 - "$state" <<'PY' 2>/dev/null || exit 0
import json, sys
d = json.load(open(sys.argv[1]))
h = (d.get("history") or [{}])[-1]
print(f"🧠 aban-Brain (Selbst-Verbesserung) — Score {d.get('score')}/100 {d.get('trend','')}, "
      f"Best {d.get('best')} · Stand {d.get('updated','')}")
print(f"   Letzter Scan: {h.get('high',0)} hoch / {h.get('medium',0)} mittel / "
      f"{h.get('low',0)} niedrig über {h.get('pages','?')} Seiten")
PY
grep -E '^## (🔴|🟡)' "$report" 2>/dev/null | sed 's/^## /   • offen: /'
echo "   → Loop: python3 tools/daily_improvement_scan.py --fix && python3 tools/daily_improvement_scan.py"
echo "     dann Top-Befunde beheben → committen → 'bash build-pages.sh' → wrangler deploy. Details: automation/BRAIN.md"

# 🧠 Zweites Gehirn (Obsidian-Vault) + Skills — read-only, siehe brain/vault/00 Start hier.md
if [ -d "$root/brain/vault" ]; then
  notizen=$(find "$root/brain/vault" -name '*.md' | wc -l | tr -d ' ')
  skills=$(find "$root/.claude/skills" -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ')
  echo "🧠 Zweites Gehirn: $notizen Notizen · $skills Skills · brain/vault/00 Start hier.md"
  echo "   → suchen statt lesen: python3 tools/gedaechtnis.py \"stichwort\" · --sackgassen · --offen · --stand"
  python3 "$root/tools/gedaechtnis.py" --offen 2>/dev/null | grep -E '^\s+▸' \
    | sed 's/^ *▸ /   🟡 nur User: /' | head -6
  echo "   → neue Lehre aufnehmen: python3 tools/lehre.py --titel \"…\" --text \"…\" --art falle"
  echo "   → vor dem Commit: python3 tools/skills_pruefen.py && python3 tools/vault.py bauen"
fi
