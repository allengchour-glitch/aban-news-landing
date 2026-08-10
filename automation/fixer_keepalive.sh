#!/bin/bash
# Hält alle Katalog-Reiniger am Leben (Turn-Reaping killt sie sonst). Alle Scripts sind resumable
# (eigene Cursor-Dateien) → Neustart setzt fort, keine Doppelarbeit.
#
# ⚠️ EINZEL-SPERRE (2026-08-09 teuer gelernt): Ohne sie liefen nach mehreren Neustarts DREI
# Supervisoren gleichzeitig. Jeder prüfte "läuft der Runner schon?" und startete bei Nein einen —
# im selben Zeitfenster taten das alle drei. Ergebnis nach 28 Minuten: 13 Kopien JE Runner,
# also 52 Prozesse, die gemeinsam auf CJ und Shopify eindroschen. Der pgrep-Test allein genügt
# nicht, weil zwischen Prüfung und Start ein Rennen entsteht (dieselbe TOCTOU-Falle wie beim
# Social-Doppelpost). flock stellt sicher, dass es diesen Prozess nur EINMAL gibt.
exec 9>/tmp/fixer_keepalive.lock
flock -n 9 || { echo "$(date -u +%H:%M) Supervisor läuft bereits — dieser Start endet."; exit 0; }
while true; do
  for p in default_variant_fix textbild_fix bild_klein_fix cj_verfuegbarkeit coll_live_check sku_dup_scan promo_aus_beschreibung gfeed_restore unpublizierte_finden lagerstand_hygiene; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null || { setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 & echo "$(date -u +%H:%M) restart $p"; }
  done
  # Bestell-/Fulfill-Runner (Shell) mitlaufen lassen
  pgrep -f "/tmp/cj_fulfill_runner.sh" >/dev/null || { setsid bash /tmp/cj_fulfill_runner.sh >> /tmp/cj_fulfill_runner.log 2>&1 & echo "$(date -u +%H:%M) restart cj_fulfill_runner"; }
  # Website-Hygiene (Lieferanten-Leaks aus Kundentexten) mitlaufen lassen
  [ -f /tmp/website_hygiene_runner.sh ] && { pgrep -f "/tmp/website_hygiene_runner.sh" >/dev/null || { setsid bash /tmp/website_hygiene_runner.sh >> /tmp/website_hygiene_runner.log 2>&1 & echo "$(date -u +%H:%M) restart website_hygiene"; }; }
  # CJ-Grind-Runner mitlaufen lassen (Turn-Reaping killt sie sonst jede Runde)
  for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
    [ -f /tmp/$R.sh ] || continue
    pgrep -f "cj_runner_template.sh $R" >/dev/null || { setsid bash /tmp/$R.sh >> /tmp/$R.log 2>&1 & echo "$(date -u +%H:%M) restart $R"; sleep 3; }
  done
  sleep 120
done
