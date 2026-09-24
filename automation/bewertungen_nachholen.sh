#!/bin/bash
# bewertungen_nachholen.sh — holt für Produkte, deren importierte Bewertungen nur 4–5★ zeigen, die echten 1–3★-Kommentare
# nach (24.09.2026, Betreiber «bewertungen push»; Hintergrund: Journal Nachtrag 61). Paketweise à 100, idempotent über
# dropship/cj_reviews_nachgeholt.txt — ein Container-Neustart kostet höchstens ein Paket. Der Aufseher setzt den Lauf fort,
# solange die Liste nicht abgearbeitet ist (FERTIG-Zeile am Ende).
cd "$(dirname "$0")/.." || exit 1
. /tmp/judgeme.env 2>/dev/null || { echo "PAUSE: /tmp/judgeme.env fehlt"; exit 2; }
. /tmp/cj_creds.env 2>/dev/null; . /tmp/dienste.env 2>/dev/null; . /tmp/secrets_env.sh 2>/dev/null
export CJ_EMAIL="${CJ_EMAIL:-$(cat /tmp/cj_email 2>/dev/null)}" CJ_API_KEY="${CJ_API_KEY:-$(cat /tmp/cj_apikey 2>/dev/null)}"
export SHOPIFY_ADMIN_TOKEN="${SHOPIFY_ADMIN_TOKEN:-$(cat /tmp/cj_shop_token.txt 2>/dev/null)}"
L=dropship/_bewertungen_nachholen.txt; Q=dropship/cj_reviews_nachgeholt.txt
touch "$Q"
[ -s "$L" ] || python3 automation/bewertungen_nachholen_liste.py || { echo "PAUSE: Liste nicht baubar"; exit 2; }
while :; do
  H=$(grep -vxFf "$Q" "$L" | head -100 | paste -sd,)
  [ -z "$H" ] && break
  echo "### Paket $(date -u +%H:%M) · offen $(grep -cvxFf "$Q" "$L")"
  OUT=$(NACHHOLEN=1 MIN_SCORE=1 ONLY="$H" LIMIT=100 PER=8 /opt/node22/bin/node automation/cj_reviews_import.mjs 2>&1)
  echo "$OUT" | grep -E "^Fertig|✗|keine Punkte|Nichts zu tun" | tail -5
  # Kein Fortschritt (Punkte leer, Auth weg) → Pause statt Endlosschleife; der Aufseher versucht es später erneut.
  if ! echo "$OUT" | grep -qE "^✓|0 echte|keine CJ-pid|keine SKU"; then echo "PAUSE: kein Fortschritt in diesem Paket"; exit 2; fi
done
echo "FERTIG $(date -u +%FT%TZ): Nachholen abgeschlossen ($(wc -l < "$Q") Produkte)"
