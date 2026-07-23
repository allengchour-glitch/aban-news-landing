#!/bin/bash
# fortura_runner.sh — kuratierter Dauer-Import von FORTURA-CH-Ware (User 2026-07-23 «kuratiert + eigene
# Kollektionen»). Zieht täglich den Feed frisch (Synology-API 443) und importiert nach Kategorie in
# klar beschriftete Smart-Collections. Idempotent über dropship/_fortura_done.txt. Ghost-sale-sicher
# (tracked+DENY+echte Menge). Kleinticket-Filter MIN_VK=14.90 (DPD CHF 9.50 pro Paket).
cd /home/user/aban-news-landing || exit 1
[ -f /tmp/shopify_env.sh ] && { set -a; source /tmp/shopify_env.sh; set +a; }
NODE=/opt/node22/bin/node
export MIN_VK=14.90

# Batches: "FT_FILTER::FT_TAGS[::MIN_VK]" — Reihenfolge = Priorität. Ledger macht Überschneidungen idempotent.
# 🇨🇭 Swiss/1.-August zuerst + niedrigere Schwelle (Partyware wird gebündelt gekauft, User «auf Maximum»).
BATCHES=(
  "1. ?august|schweiz|edelweiss|matterhorn|helvet|nationalfeiertag|schwinger|alphorn|fondue|raclette|cervelat|jass|kuhglocke|älpler|swiss::erste-august,schweiz-edition,party-deko::8.90"
  "Bruder|Qualiplüsch|Playmobil|Schleich::spielzeug"
  "Halloween::halloween,kostueme"
  "Verkleidung|Kostüm|Perücke|Maske Erwachsene|Hut::kostueme,fasnacht"
  "Fanartikel|Dekoballon|Ballone|Girlande|Partyartikel::party-deko"
  "Weihnacht::weihnachten"
  "Wohndeko|Kerzen|Blumen::party-deko"
  ".::fortura-katalog::8.90"
)

while true; do
  echo "### FORTURA-RUNDE $(date -u +%H:%M) — Feed frisch ziehen"
  bash automation/fortura_fetch_feed.sh /tmp/fortura_feed.csv || { echo "Feed-Download-Fehler, 30min Pause"; sleep 1800; continue; }
  for B in "${BATCHES[@]}"; do
    FLT="${B%%::*}"; REST="${B#*::}"; TAGS="${REST%%::*}"; BVK="${REST##*::}"
    [ "$BVK" = "$REST" ] && BVK="$MIN_VK"   # kein 3. Feld → globaler MIN_VK
    echo "### BATCH [$TAGS] MIN_VK=$BVK filter=${FLT:0:40}…  $(date -u +%H:%M)"
    LIMIT=20000 MIN_VK="$BVK" FT_FILTER="$FLT" FT_TAGS="$TAGS" $NODE automation/fortura_import.mjs 2>&1 | tail -3
    sleep 20
  done
  echo "### RUNDE FERTIG — 12h Pause (Restock/Neuware am nächsten Tag)"
  sleep 43200
done
