#!/bin/bash
# Hält alle Katalog-Reiniger am Leben (Turn-Reaping killt sie sonst). Alle Scripts sind resumable
# (eigene Cursor-Dateien) → Neustart setzt fort, kein Doppelarbeit.
while true; do
  for p in default_variant_fix textbild_fix gfeed_apply bild_klein_fix bb_aktiv_marge; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null || { setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 & echo "$(date -u +%H:%M) restart $p"; }
  done
  sleep 120
done
