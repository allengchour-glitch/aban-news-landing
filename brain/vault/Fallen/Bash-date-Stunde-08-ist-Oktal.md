---
tags: [falle, teuer-gelernt]
quelle: automation/fixer_keepalive.sh
gelernt: 2026-10-10
---
# Bash date-Stunde 08 ist Oktal

$(( $(date -u +%H) / 6 )) bricht um 08 und 09 Uhr ab (value too great for base) – im Aufseher stoppte das die Waechter. Immer 10#$(date +%H).

Verwandt: [[Hypothese-mit-Datum]]
