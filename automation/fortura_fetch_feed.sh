#!/bin/bash
# fortura_fetch_feed.sh — lädt den täglichen Fortura-Feed (Art_DataFeed.CSV) + Artikelstruktur
# über die Synology-FileStation-Web-API auf PORT 443 herunter.
#
# WARUM 443 statt der offiziellen :5001/FTP-21: diese Cloud-Umgebung blockt Port 21 (Timeout)
# und :5001 (Connection reset). Aber https://webtransfer.fortura.ch/ (443, nginx-Proxy vor der
# RackStation) liefert die SYNO.FileStation-API → Login + Download klappt darüber (2026-07-23).
#
# Creds NUR aus /tmp/fortura_env.sh (600, NICHT im Repo — Lieferantendaten). Legt Feed nach
# /tmp/fortura_feed.csv. Danach: /opt/node22/bin/node automation/fortura_import.mjs
set -euo pipefail
# /tmp überlebt einen Container-Wipe NICHT (2026-08-14 genau so passiert: Creds weg, Feed seit dem
# 23.07. nicht mehr geladen, Bestand eingefroren). Klartext-Meldung statt kryptischem bash-Fehler.
if [ ! -f /tmp/fortura_env.sh ]; then
  echo "OFFEN: /tmp/fortura_env.sh fehlt (Container-Wipe). Ohne FORTURA_FTP_USER/FORTURA_FTP_PW" >&2
  echo "       (Kundennr 544341) ist der Feed nicht abrufbar — es wird NICHTS geraten." >&2
  echo "       Dauerlösung: beide Werte als Umgebungsvariablen in den Claude-Einstellungen hinterlegen." >&2
  exit 1
fi
source /tmp/fortura_env.sh
B="https://webtransfer.fortura.ch"
OUT="${1:-/tmp/fortura_feed.csv}"

# 1) Login → SID
SID=$(curl -sS -k -X POST "$B/webapi/entry.cgi" \
  --data-urlencode "api=SYNO.API.Auth" --data-urlencode "version=6" --data-urlencode "method=login" \
  --data-urlencode "account=$FORTURA_FTP_USER" --data-urlencode "passwd=$FORTURA_FTP_PW" \
  --data-urlencode "session=FileStation" --data-urlencode "format=sid" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['sid'] if d.get('success') else '')")
[ -z "$SID" ] && { echo "Fortura-Login fehlgeschlagen"; exit 1; }

dl(){ curl -sS -k "$B/webapi/entry.cgi" -G \
  --data-urlencode "api=SYNO.FileStation.Download" --data-urlencode "version=2" --data-urlencode "method=download" \
  --data-urlencode "path=$1" --data-urlencode "mode=download" --data-urlencode "_sid=$SID" -o "$2"; }

# 2) Feed + Struktur laden
dl "/home/Art_DataFeed.CSV" "$OUT"
dl "/home/Artikelstruktur.xlsx" /tmp/fortura_struktur.xlsx 2>/dev/null || true

# 3) Logout (SID freigeben)
curl -sS -k "$B/webapi/entry.cgi?api=SYNO.API.Auth&version=1&method=logout&session=FileStation&_sid=$SID" >/dev/null 2>&1 || true

LINES=$(wc -l < "$OUT")
echo "Fortura-Feed geladen → $OUT ($LINES Zeilen)"
[ "$LINES" -lt 100 ] && { echo "WARN: Feed verdächtig klein"; exit 1; }
exit 0
