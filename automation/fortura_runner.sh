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
  if [ -z "${FT_NOFETCH:-}" ]; then
    echo "### FORTURA-RUNDE $(date -u +%H:%M) — Feed frisch ziehen"
    bash automation/fortura_fetch_feed.sh /tmp/fortura_feed.csv || { echo "Feed-Download-Fehler, 30min Pause"; sleep 1800; continue; }
  else echo "### FORTURA-RUNDE $(date -u +%H:%M) — nutze vorhandenen Feed (Shard-Modus)"; fi

  # ⚠️ BESTAND ZUERST, DANN NEUIMPORT (Fehlersuche 2026-08-14 [bestand]): Der Importer schreibt die
  # Menge NUR beim Anlegen und überspringt danach alles, was im Ledger steht — ohne diesen Aufruf
  # friert der CH-Lagerbestand am Importtag ein (er stand 21 Tage still). Der Abgleich läuft nur im
  # Voll-Lauf, nicht in den Shards, damit sich nicht mehrere Prozesse dieselbe Menge streitig machen.
  if [ -z "${FT_SHARD:-}" ]; then
    echo "### BESTANDS-ABGLEICH Feed→Shop  $(date -u +%H:%M)"
    $NODE automation/fortura_bestand_sync.mjs 2>&1 | tail -8
  fi
  for B in "${BATCHES[@]}"; do
    FLT="${B%%::*}"; REST="${B#*::}"; TAGS="${REST%%::*}"; BVK="${REST##*::}"
    [ "$BVK" = "$REST" ] && BVK="$MIN_VK"   # kein 3. Feld → globaler MIN_VK
    echo "### BATCH [$TAGS] MIN_VK=$BVK shard=${FT_SHARD:--} filter=${FLT:0:40}…  $(date -u +%H:%M)"
    LIMIT=20000 MIN_VK="$BVK" FT_FILTER="$FLT" FT_TAGS="$TAGS" FT_SHARD="${FT_SHARD:-}" $NODE automation/fortura_import_grouped.mjs 2>&1 | tail -3
    sleep 20
  done
  echo "### RUNDE FERTIG — 12h Pause (Restock/Neuware am nächsten Tag)"
  sleep 43200
done
