#!/bin/bash
# Website-Hygiene: entfernt Lieferanten-Leaks aus Kundentiteln/-texten (CLAUDE.md Regel 3).
# Alle 2 Stunden, resumable (eigener Cursor im Script).
cd /home/user/aban-news-landing || exit 1
source /tmp/secrets_env.sh 2>/dev/null
while true; do
  echo "$(date -u +%H:%M) strip_supplier_leaks start"
  /opt/node22/bin/node automation/strip_supplier_leaks.mjs 2>&1 | tail -20
  sleep 7200
done
