#!/bin/bash
# Website-Hygiene: entfernt Lieferanten-Leaks aus Kundentiteln/-texten (CLAUDE.md Regel 3).
# Alle 2 Stunden, resumable (eigener Cursor im Script).
cd /home/user/aban-news-landing || exit 1

# ⚠️ EINZEL-SPERRE (11.08.2026): Dieses Skript lief in ZWEI Kopien gleichzeitig — eine aus
# /tmp, eine aus automation/. Beide Aufsichten prüften «läuft schon?» über den Pfad, den sie
# selbst kannten, und sahen die jeweils andere Kopie nicht. Zwei Kopien bedeuten doppelte
# Shopify-Last für dieselbe Arbeit. Die Sperre hängt am Zweck, nicht am Pfad: Wer sie nicht
# bekommt, endet sofort — egal von wo er gestartet wurde.
exec 9>/tmp/website_hygiene.lock
flock -n 9 || { echo "$(date -u +%H:%M) Website-Hygiene läuft bereits — dieser Start endet."; exit 0; }

source /tmp/secrets_env.sh 2>/dev/null
while true; do
  echo "$(date -u +%H:%M) strip_supplier_leaks start"
  /opt/node22/bin/node automation/strip_supplier_leaks.mjs 2>&1 | tail -20
  sleep 7200
done
