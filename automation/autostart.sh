#!/bin/bash
# autostart.sh — bootet die komplette LuxeStyle-Automatik (idempotent, ohne Secrets im Repo!).
# Secrets kommen aus der Umgebung (Claude-Code-Environment-Variablen) oder /tmp-Caches:
#   SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET  (Pflicht für alles)
#   BIGBUY_API_KEY                              (BigBuy-Import)
#   GROQ_API_KEY / GROQ_API_KEY2                (DE-Titel/Texte)
#   CJ_EMAIL / CJ_API_KEY  ODER  /tmp/cj_token.json  (CJ-Import)
# Aufruf: bash automation/autostart.sh   (mehrfach aufrufbar — startet nur, was fehlt)
cd "$(dirname "$0")/.." || exit 1
NODE=${NODE:-/opt/node22/bin/node}
log(){ echo "[autostart] $*"; }

[ -z "$SHOPIFY_CLIENT_ID" ] && { log "SHOPIFY_CLIENT_ID fehlt → No-op. Secrets als Environment-Variablen setzen (Claude-Code-Umgebung) oder inline übergeben."; exit 0; }

# ── CJ-Token besorgen (Cache → sonst frisch via CJ_EMAIL/CJ_API_KEY) ──
if [ ! -s /tmp/cj_token.json ] && [ -n "$CJ_EMAIL" ] && [ -n "$CJ_API_KEY" ]; then
  curl -s -X POST https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$CJ_EMAIL\",\"password\":\"$CJ_API_KEY\"}" \
    | python3 -c "import json,sys;d=json.load(sys.stdin);json.dump({'accessToken':d['data']['accessToken']},open('/tmp/cj_token.json','w')) if d.get('data') else print('CJ-Auth fehlgeschlagen:',d.get('message'))" || true
fi

running(){ pgrep -f "$1" >/dev/null 2>&1; }

# ── 1. CJ-Perpetual (Dauer-Import, PRIORITY aus Env oder Default) ──
if [ -s /tmp/cj_token.json ] && ! running 'cj_perpetual.mjs'; then
  CJT=$(python3 -c "import json;print(json.load(open('/tmp/cj_token.json'))['accessToken'])")
  CJ_TOKEN="$CJT" WAREHOUSE="${WAREHOUSE:-DE}" \
    PRIORITY="${PRIORITY:-cjelektronik,cjgadgets,gaming,cjdamen,cjherren,kueche,cjhome}" \
    nohup "$NODE" automation/cj_perpetual.mjs >> /tmp/cj_perp.log 2>&1 &
  log "CJ-Perpetual gestartet (PID $!)"
fi

# ── VORFAHRT: Läuft der Premium-Import, bekommen andere BigBuy-Konsumenten PAUSE
#    (BigBuy-Rate-Limit ist SHARED, GEHIRN 14 — sonst 429-Sturm und alle verhungern).
PREMIUM_LAEUFT=0; running 'premium_import.mjs' && PREMIUM_LAEUFT=1

# ── 2. BigBuy-Import ──
if [ "$PREMIUM_LAEUFT" = "0" ] && [ -n "$BIGBUY_API_KEY" ] && [ -s /tmp/bb_cats.txt ] && ! running 'bigbuy_import.mjs'; then
  CATS="$(cat /tmp/bb_cats.txt)" PER="${PER:-8}" LIVE=1 \
    nohup "$NODE" automation/bigbuy_import.mjs >> /tmp/bb_live.log 2>&1 &
  log "BigBuy-Import gestartet (PID $!)"
fi

# ── 3. GMC-Beschreibungs-Anreicherung (resümiert am Cursor, beendet sich am Listen-Ende) ──
if [ -f dropship/gmc_desc_ids.txt ] && ! running 'gmc_desc_enrich.mjs'; then
  POS=$(cat dropship/_gmc_enrich_pos.txt 2>/dev/null || echo 0)
  TOTAL=$(wc -l < dropship/gmc_desc_ids.txt)
  if [ "$POS" -lt "$TOTAL" ] 2>/dev/null; then
    LIMIT=3000 nohup "$NODE" automation/gmc_desc_enrich.mjs >> /tmp/gmc_enrich.log 2>&1 &
    log "GMC-Anreicherung gestartet (PID $!, ab $POS/$TOTAL)"
  fi
fi

# ── 3b. Lieferbarkeits-Wächter (GEHIRN 14, «nie wieder #1004/#1006/#1007»):
#        prüft aktive BigBuy-Produkte (teuerste zuerst), draftet unlieferbare;
#        OK-Ledger macht ihn inkrementell. Danach REVIVE-Pass (wieder-lieferbare zurückholen).
if [ "$PREMIUM_LAEUFT" = "0" ] && [ -n "$BIGBUY_API_KEY" ] && ! running 'bigbuy_viability_guard.mjs'; then
  nohup bash -c "LIMIT=800 GAP=1800 '$NODE' automation/bigbuy_viability_guard.mjs >> /tmp/viability_live.log 2>&1; REVIVE=1 LIMIT=300 GAP=1800 '$NODE' automation/bigbuy_viability_guard.mjs >> /tmp/viability_live.log 2>&1" > /dev/null 2>&1 &
  log "Viability-Guard gestartet (PID $!, 800er-Tranche + REVIVE)"
fi

# ── 3c. Auto-Order-Radar: prüft bezahlte unerfüllte BigBuy-Orders (DRY → Bericht /tmp/bb_orders.log;
#        echte Bestellung löst die Session mit CONFIRM=1 aus, nach Margen-Blick).
if [ "$PREMIUM_LAEUFT" = "0" ] && [ -n "$BIGBUY_API_KEY" ] && ! running 'bb_auto_order.mjs'; then
  nohup "$NODE" automation/bb_auto_order.mjs >> /tmp/bb_orders.log 2>&1 &
  log "Auto-Order-Radar (DRY) gestartet (PID $!)"
fi

# ── 4. Auto-Committer (Ledger-Drift alle 5 Min) ──
if ! running 'sleep 300; git add dropship'; then
  nohup bash -c 'while true; do sleep 300; git add dropship/ 2>/dev/null; git diff --cached --quiet || (git commit -q -m "Ledger-Drift (auto) #autocommit-loop" && git push -q); done' > /tmp/autocommit.log 2>&1 &
  log "Auto-Committer gestartet (PID $!)"
fi

log "fertig. Laufend: $(pgrep -fc 'cj_perpetual|bigbuy_import|gmc_desc' 2>/dev/null || echo 0) Engine(s)."
