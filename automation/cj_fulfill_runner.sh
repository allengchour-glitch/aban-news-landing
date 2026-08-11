#!/bin/bash
# Bestell-Dauerlauf: legt neue bezahlte Shopify-Bestellungen bei CJ an und schiebt Tracking
# zurueck, sobald CJ versendet hat. Alles ausser dem Bezahlen laeuft damit ohne Zutun.
#
# Der CJ-Token lebt nur in /tmp/_cjtok und laeuft ab -> vor jedem Lauf erneuern, sonst steht
# der Runner nach ein paar Stunden still.
cd /home/user/aban-news-landing || exit 1

# ⚠️ EINZEL-SPERRE: Ein zweiter Bestell-Automat ist gefährlicher als gar keiner — zwei Läufe
# können dieselbe CJ-Bestellung gleichzeitig anlegen oder bezahlen (dieselbe TOCTOU-Falle wie
# beim Social-Doppelpost: prüfen und handeln sind nicht ein Schritt). Wer die Sperre nicht
# bekommt, endet sofort.
exec 9>/tmp/cj_fulfill_runner.lock
flock -n 9 || { echo "$(date -u +%H:%M) Bestell-Runner läuft bereits — dieser Start endet."; exit 0; }
while true; do
  # Token auffrischen (CJ limitiert getAccessToken auf 1x/300s -> Fehler ignorieren, alter gilt weiter)
  if [ -f /tmp/cj_email ] && [ -f /tmp/cj_apikey ]; then
    NEW=$(curl -s --max-time 30 -X POST "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$(cat /tmp/cj_email)\",\"password\":\"$(cat /tmp/cj_apikey)\"}" \
      | python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("data") or {}).get("accessToken") or "")' 2>/dev/null)
    [ -n "$NEW" ] && echo -n "$NEW" > /tmp/_cjtok
  fi

  echo "=== $(date -u +%H:%M) Bestellungen anlegen"
  timeout 900 python3 automation/cj_order_engine.py 2>&1 | tail -20
  echo "=== $(date -u +%H:%M) bezahlen/fulfillen"
  timeout 900 python3 automation/cj_fulfill_engine.py 2>&1 | tail -20

  # Ledger-Drift sofort sichern (Container stirbt hier staendig)
  git add dropship/_cj_orders_done.txt 2>/dev/null
  git diff --cached --quiet || git commit -q -m "CJ-Bestell-Ledger [skip ci]"

  sleep 1200
done
