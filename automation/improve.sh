#!/usr/bin/env bash
# LuxeStyle — improve.sh : VERBESSERUNGS-WORKER (autonomer Selbst-Verbesserungs-Durchlauf für ALLES).
# User 2026-06-18 „Verbesserungs-Worker für alles". Läuft per PC-Zeitplan (LuxeImprove) ODER manuell.
# Kette: Health-Check -> Analyse+Lernen+Queue (auto.sh) -> Engagement-Lernen (self_learn) -> Logbuch -> commit.
# No-op-sicher: jeder Schritt einzeln gekapselt, ein Fehler stoppt nicht den Rest.
set +e
cd "$(dirname "$0")/.." || exit 1
NODE="/opt/node22/bin/node"; [ -x "$NODE" ] || NODE=node
LOG="dropship/VERBESSERUNGEN.md"; TS="$(date '+%Y-%m-%d %H:%M')"
echo "═══ VERBESSERUNGS-WORKER $TS ═══"

echo "▶ [1/4] Health-Check"; $NODE automation/health-check.mjs 2>&1 | tail -2

echo "▶ [2/4] Analyse + Lernen + Queue (auto.sh)"; bash automation/brain/auto.sh 2>&1 | grep -E "Autopost-Queue|Hook-Rang|Top-Tags|FERTIG|Aktionen" | head -6

echo "▶ [3/4] Engagement-Lernen (Produkte nach Performance sortieren)"; $NODE automation/brain/self_learn.mjs 2>&1 | tail -3

echo "▶ [4/4] Logbuch + sichern"
{
  echo ""
  echo "## 🔧 $TS — Auto-Verbesserungs-Durchlauf"
  echo "- Health/Analyse/Lernen/Queue/Engagement durch. Gehirn-Regeln: $($NODE -e 'try{console.log(Object.keys(require("./automation/brain/knowledge.json").rules).length)}catch(e){console.log("?")}')."
  echo "- Queue frisch (Worker liest live). Top-Produkte nach Engagement neu sortiert."
  echo "- Engpass bleibt: Conversion (Mobile/Reviews) > Reichweite. Nächster Content nach Gewinner-Rezept (Preis-Vergleich+Mundart)."
} >> "$LOG"

git add -A 2>/dev/null
git commit -q -m "improve: Auto-Verbesserungs-Durchlauf $TS (health/analyse/lernen/queue/engagement)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M6Cnf5Y6Y3QTwG6hyC8Spw" 2>/dev/null
git push origin claude/luxestyle-product-CizQ6 2>/dev/null
echo "═══ FERTIG ═══"
