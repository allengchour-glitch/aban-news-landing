#!/bin/bash
# versprechen_kette.sh — Tages-Versprechen-Kette (bisher 6 Vordergrund-Aufrufe in fixer_keepalive.sh Z. 1502–1519), 19.10.2026.
# Jeder Schritt setzt seine Marke /tmp/_ok_vk_<name> NUR bei Exit 0 und wird übersprungen, solange die Marke < 20 h alt ist:
# nach einem Neustart läuft nur der Rest, nicht die 40-min-Bulk-Abfrage von vorn. SCHARF=1 wie bisher (Schreibschutz: Kanarien,
# Rücklesen, Ledger der Einzelskripte — unverändert).
cd "$(dirname "$0")/.." || exit 1
schritt() {   # schritt NAME TIMEOUT_S [VAR=WERT…] SKRIPT.py
  local n="$1" m="/tmp/_ok_vk_$1" t="$2"; shift 2    # 19.10. (A1): Schrittname vor dem shift merken — $1 war danach «SCHARF=1»
  [ "$(python3 tools/ergebnis_alter.py mtime "$m")" -lt 20 ] && { echo "· $n: Marke jung, übersprungen"; return 0; }
  env "$@" > "/tmp/_vk_$n.out" 2>&1 ; local rc=$?; [ "$rc" = 124 ] || true
  grep -E '^FERTIG|Kanarien rot|KOLL-VERSPRECHEN|^GEPRÜFT|^EDITOR|^Selbsttest' "/tmp/_vk_$n.out" | tail -4
  [ "$rc" = 0 ] && : > "$m"
}
timeout 2400 python3 automation/versprechen_wache.py; rc=$?; [ "$rc" = 0 ] && : > /tmp/_ok_vk_wache
schritt material 900   SCHARF=1 timeout 900  python3 automation/material_widerspruch.py
schritt alt_titel 2400 SCHARF=1 timeout 2400 python3 automation/alt_titel_abgleich.py
schritt essbar    900  SCHARF=1 timeout 900  python3 automation/essbar_wache.py
schritt haendler  1500 SCHARF=1 timeout 1500 python3 automation/haendlerwort.py
schritt dein_bezug 1500 SCHARF=1 timeout 1500 python3 automation/dein_bezug.py
exit 0
