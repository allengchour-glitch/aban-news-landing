#!/bin/bash
# Hält das Shopify-Admin-Token frisch.
#
# WARUM (gefunden 2026-08-10): Shopify hat den dauerhaften `shpat_`-Token abgeschafft; Custom
# Apps bekommen ihn nur noch per Client-Credentials-Grant — und der ist **rund 24 Stunden**
# gültig. Sämtliche Reiniger lesen `/tmp/cj_shop_token.txt` EINMAL beim Start. Läuft das Token
# ab, liefert Shopify «Invalid API key or access token», die Helfer geben nach ihren Wiederholungen
# ein leeres Ergebnis zurück, und die Schleifen beenden sich mit «keine Daten».
#
# Das Tückische daran: Es sieht aus wie «fertig». Der Supervisor startet die Skripte brav neu,
# sie scheitern erneut, und im Log steht nichts von einem Fehler — die Katalogpflege stünde
# still, ohne dass es jemand merkt. Genau so wurde es entdeckt: eine Abfrage kam mit
# 0 Ergebnissen zurück, obwohl es Hunderte hätten sein müssen.
#
# Erneuert wird, sobald die Datei älter als MAXALTER Sekunden ist (Standard 12 h) — also lange
# vor Ablauf. Ohne Zugangsdaten passiert nichts (No-op), damit der Aufruf gefahrlos in jeder
# Umgebung laufen kann.
SHOP="${SHOPIFY_SHOP:-au3j0y-hq.myshopify.com}"
DATEI="${TOKENDATEI:-/tmp/cj_shop_token.txt}"
MAXALTER="${MAXALTER:-43200}"

source /tmp/secrets_env.sh 2>/dev/null
[ -z "$SHOPIFY_CLIENT_ID" ] || [ -z "$SHOPIFY_CLIENT_SECRET" ] && { echo "$(date -u +%H:%M) keine Shopify-Zugangsdaten — No-op"; exit 0; }

if [ -s "$DATEI" ]; then
  ALTER=$(( $(date +%s) - $(stat -c %Y "$DATEI" 2>/dev/null || echo 0) ))
  [ "$ALTER" -lt "$MAXALTER" ] && exit 0
fi

NEU=$(curl -s --max-time 30 -X POST "https://$SHOP/admin/oauth/access_token" \
      -H "Content-Type: application/json" \
      -d "{\"client_id\":\"$SHOPIFY_CLIENT_ID\",\"client_secret\":\"$SHOPIFY_CLIENT_SECRET\",\"grant_type\":\"client_credentials\"}" \
      | python3 -c "import json,sys;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -n "$NEU" ]; then
  # Erst prüfen, dann ersetzen: ein kaputtes Token wäre schlimmer als ein altes.
  PRUEF=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 \
          "https://$SHOP/admin/api/2024-10/shop.json" -H "X-Shopify-Access-Token: $NEU")
  if [ "$PRUEF" = "200" ]; then
    umask 077; printf '%s' "$NEU" > "$DATEI"; chmod 600 "$DATEI"
    echo "$(date -u +%H:%M) Shopify-Token erneuert"
  else
    echo "$(date -u +%H:%M) neues Token antwortet mit HTTP $PRUEF — altes bleibt stehen"
  fi
else
  echo "$(date -u +%H:%M) Token-Erneuerung fehlgeschlagen — altes bleibt stehen"
fi
