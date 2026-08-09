#!/bin/bash
# Hält alle Katalog-Reiniger am Leben (Turn-Reaping killt sie sonst). Alle Scripts sind resumable
# (eigene Cursor-Dateien) → Neustart setzt fort, kein Doppelarbeit.
while true; do
  for p in default_variant_fix textbild_fix gfeed_apply bild_klein_fix cj_verfuegbarkeit coll_live_check sku_dup_scan; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null || { setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 & echo "$(date -u +%H:%M) restart $p"; }
  done
  # Bestell-/Fulfill-Runner (Shell) mitlaufen lassen
  pgrep -f "/tmp/cj_fulfill_runner.sh" >/dev/null || { setsid bash /tmp/cj_fulfill_runner.sh >> /tmp/cj_fulfill_runner.log 2>&1 & echo "$(date -u +%H:%M) restart cj_fulfill_runner"; }
  sleep 120
done
