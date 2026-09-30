#!/usr/bin/env bash
# ocr_waisen.sh — verwaiste tesseract-Prozesse beenden (30.09.2026).
# GEMESSEN 30.09. 14:31 UTC: 11 tesseract-Prozesse bis 826 s alt, Elternprozess = Container-Init (Python-Aufrufer war per
# äusserem `timeout` beendet, das Kind lief weiter), Load 50 auf 4 Kernen → das Meisterwerk-Tor brach an seiner OCR-Zeitgrenze
# ab und der Reel-Motor verwarf 5 von 6 fertigen Reels. Eine Waise hat niemanden, der ihr Ergebnis liest: beenden ist folgenlos.
# Regel: nur tesseract, Elternprozess = PID 1 (Container-Init «process_api» — der Aufrufer ist weg), älter als WAISE_S
# (Standard 300 s). Nicht «Elternprozess ≠ python/node»: das traf im Test auch Aufrufe aus Shell-Skripten. Ausgabe nur bei Fund.
WAISE_S=${WAISE_S:-300}
n=0
for p in $(pgrep -x tesseract 2>/dev/null); do
  pp=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' '); a=$(ps -o etimes= -p "$p" 2>/dev/null | tr -d ' ')
  [ -z "$pp" ] && continue
  if [ "$pp" = "1" ] && [ "${a:-0}" -gt "$WAISE_S" ]; then kill "$p" 2>/dev/null && n=$((n+1)); fi
done
[ "$n" -gt 0 ] && echo "$(date -u +%H:%M) OCR-WAISEN: $n verwaiste tesseract beendet (> ${WAISE_S}s, Elternprozess weg)"
exit 0
