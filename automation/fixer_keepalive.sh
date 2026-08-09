#!/bin/bash
# Hält alle Katalog-Reiniger am Leben (Turn-Reaping killt sie sonst). Alle Scripts sind resumable
# (eigene Cursor-Dateien) → Neustart setzt fort, kein Doppelarbeit.
while true; do
  for p in default_variant_fix textbild_fix gfeed_apply bild_klein_fix cj_verfuegbarkeit coll_live_check sku_dup_scan promo_aus_beschreibung; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null || { setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 & echo "$(date -u +%H:%M) restart $p"; }
  done
  # Bestell-/Fulfill-Runner (Shell) mitlaufen lassen
  pgrep -f "/tmp/cj_fulfill_runner.sh" >/dev/null || { setsid bash /tmp/cj_fulfill_runner.sh >> /tmp/cj_fulfill_runner.log 2>&1 & echo "$(date -u +%H:%M) restart cj_fulfill_runner"; }
  # CJ-Grind-Runner mitlaufen lassen (Turn-Reaping killt sie sonst jede Runde)
  for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
    [ -f /tmp/$R.sh ] || continue
    pgrep -f "RUNNER=$R" >/dev/null || pgrep -f "/tmp/$R.sh" >/dev/null || { setsid bash /tmp/$R.sh >> /tmp/$R.log 2>&1 & echo "$(date -u +%H:%M) restart $R"; sleep 3; }
  done
  sleep 120
done
