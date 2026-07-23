#!/bin/bash
# fortura_runner.sh — kuratierter Dauer-Import von FORTURA-CH-Ware (User 2026-07-23 «kuratiert + eigene
# Kollektionen»). Zieht täglich den Feed frisch (Synology-API 443) und importiert nach Kategorie in
# klar beschriftete Smart-Collections. Idempotent über dropship/_fortura_done.txt. Ghost-sale-sicher
# (tracked+DENY+echte Menge). Kleinticket-Filter MIN_VK=14.90 (DPD CHF 9.50 pro Paket).
cd /home/user/aban-news-landing || exit 1
[ -f /tmp/shopify_env.sh ] && { set -a; source /tmp/shopify_env.sh; set +a; }
NODE=/opt/node22/bin/node
export MIN_VK=14.90

# Batches: "FT_FILTER|FT_TAGS"  — Reihenfolge = Marken-Wert. Ledger macht Überschneidungen idempotent.
BATCHES=(
  "Bruder|Qualiplüsch|Playmobil|Schleich::spielzeug"
  "Halloween::halloween,kostueme"
  "Verkleidung|Kostüm|Perücke|Maske Erwachsene|Hut::kostueme,fasnacht"
  "Fanartikel|Schweiz|Edelweiss|Matterhorn::party-deko,schweiz-edition"
  "Partyartikel|Dekoballon|Ballone|Girlande::party-deko"
  "Weihnacht::weihnachten"
  "Wohndeko|Kerzen|Blumen::party-deko"
)

while true; do
  echo "### FORTURA-RUNDE $(date -u +%H:%M) — Feed frisch ziehen"
  bash automation/fortura_fetch_feed.sh /tmp/fortura_feed.csv || { echo "Feed-Download-Fehler, 30min Pause"; sleep 1800; continue; }
  for B in "${BATCHES[@]}"; do
    FLT="${B%%::*}"; TAGS="${B##*::}"
    echo "### BATCH [$TAGS] filter=$FLT  $(date -u +%H:%M)"
    LIMIT=20000 FT_FILTER="$FLT" FT_TAGS="$TAGS" $NODE automation/fortura_import.mjs 2>&1 | tail -3
    sleep 20
  done
  echo "### RUNDE FERTIG — 12h Pause (Restock/Neuware am nächsten Tag)"
  sleep 43200
done
