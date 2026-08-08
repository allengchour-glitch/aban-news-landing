#!/bin/bash
# Hält alle Katalog-Reiniger am Leben (Turn-Reaping killt sie sonst). Alle Scripts sind resumable
# (eigene Cursor-Dateien) → Neustart setzt fort, kein Doppelarbeit.
while true; do
  for p in fashion_retag farbcode_clean default_variant_fix gmc_scan gfeed_apply variant_value_clean versand_widerspruch; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null || { setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 & echo "$(date -u +%H:%M) restart $p"; }
  done
  sleep 120
done
