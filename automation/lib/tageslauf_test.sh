#!/bin/bash
# Selbsttest für automation/lib/tageslauf.sh (19.10.2026) — Wegwerf-Ordner, kein Shopify, keine Repo-Dateien:  bash automation/lib/tageslauf_test.sh
set -u
HIER="$(cd "$(dirname "$0")/../.." && pwd)"
export TL_TMP="$(mktemp -d)" TL_REPO="$HIER"
source "$HIER/automation/lib/tageslauf.sh"
fehler=0
check() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FEHL $1 (ist «$2», soll «$3»)"; fehler=$((fehler+1)); fi; }

# 1. junges Ergebnis → nicht fällig
tageslauf_faellig t1 3 20; check "Ergebnis 3 h < 20 h → nicht fällig" "$?" 1
# 2. altes Ergebnis → fällig, Claim gesetzt, zweiter Aufruf sofort → nicht fällig (Claim)
tageslauf_faellig t1 30 20; check "Ergebnis 30 h → fällig" "$?" 0
tageslauf_faellig t1 30 20; check "sofort nochmal → Claim hält" "$?" 1
# 3. leeres/kaputtes Ergebnis zählt als 999 → fällig
TL_CLAIM_S=0 tageslauf_faellig t2 "" 20; check "leeres Ergebnis → fällig" "$?" 0
# 4. Lauf stirbt (kill -9 auf Lauf UND Hülle, wie ein Container-Neustart) — Ergebnis bleibt alt → nach Claim wieder fällig
export TL_CLAIM_S=0
tageslauf_start t3 "$TL_TMP/t3.log" 60 -- bash -c 'echo $$ > "$TL_TMP/t3.pid"; echo arbeite; sleep 30; echo fertig'
sleep 1
tageslauf_faellig t3 99 20; check "Lauf aktiv → Sperre hält (kein Doppelstart)" "$?" 1
P=$(cat "$TL_TMP/t3.pid"); SID=$(ps -o sid= -p "$P" | tr -d ' ')   # ganze setsid-Sitzung töten = wie ein Container-Neustart
pkill -9 -s "$SID"; sleep 1
tageslauf_faellig t3 99 20; check "Lauf getötet (kein ENDE) → wieder fällig" "$?" 0
check "Log ohne ENDE-Zeile (tot erkennbar)" "$(grep -c '^ENDE' "$TL_TMP/t3.log")" 0
# 5. normaler Lauf: ENDE rc=0
tageslauf_start t4 "$TL_TMP/t4.log" 60 -- bash -c 'echo ok'; sleep 1
check "Lauf endet mit ENDE rc=0" "$(grep -c '^ENDE rc=0' "$TL_TMP/t4.log")" 1
# 6. timeout → ENDE rc=124
tageslauf_start t5 "$TL_TMP/t5.log" 1 -- bash -c 'sleep 5'; sleep 2.5
check "timeout → ENDE rc=124" "$(grep -c '^ENDE rc=124' "$TL_TMP/t5.log")" 1
# 7. Höchstzahl Versuche je Tag (3) — Endlosschleife ausgeschlossen
for i in 1 2 3; do tageslauf_faellig t6 99 20 40 3; done
tageslauf_faellig t6 99 20 40 3; check "4. Versuch am selben Tag gesperrt" "$?" 1
# 7b. pruefen verbraucht nichts, claim schon
unset TL_CLAIM_S
tageslauf_pruefen t7 99 20 40 3; check "pruefen: fällig" "$?" 0
tageslauf_pruefen t7 99 20 40 3; check "pruefen nochmal: immer noch fällig (verbraucht nichts)" "$?" 0
tageslauf_claim t7; tageslauf_pruefen t7 99 20 40 3; check "nach claim: Claim hält" "$?" 1
# 8. Registry
check "Registry: nicht registriert → leer" "$(tageslauf_ergebnis_h gibtsnicht)" ""
check "Registry: max_h" "$(tageslauf_max_h kosten_export)" 20
echo "Fehler: $fehler"; rm -rf "$TL_TMP"; exit "$fehler"
