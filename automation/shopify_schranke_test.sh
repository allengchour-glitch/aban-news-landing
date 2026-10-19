#!/bin/bash
# Selbsttest für automation/shopify_schranke.sh (19.10.2026): voll → Exit 75 und der Befehl läuft NICHT; frei → Befehl läuft, Exit 0.
# Mit eigenem SCHRANKE_NAME, berührt die echten Plätze nicht.  bash automation/shopify_schranke_test.sh
cd "$(dirname "$0")/.." || exit 1
N=0; F=0
chk() { N=$((N+1)); if [ "$2" != "$3" ]; then F=$((F+1)); echo "FAIL $1: erwartet «$3» bekommen «$2»"; fi; }
export SCHRANKE_NAME=schranke_selbsttest SCHRANKE_PLAETZE=2 SCHRANKE_WARTE=2
rm -f /tmp/schranke_selbsttest_*.lock /tmp/_schr_test_lief
# frei: läuft, Exit 0
bash automation/shopify_schranke.sh touch /tmp/_schr_test_lief; rc=$?
chk "frei: Exit" "$rc" 0; chk "frei: Befehl lief" "$([ -e /tmp/_schr_test_lief ] && echo ja || echo nein)" ja
rm -f /tmp/_schr_test_lief
# beide Plätze belegt: Exit 75, Befehl lief nicht
( exec 21>/tmp/schranke_selbsttest_1.lock; flock -n 21; sleep 12 ) & p1=$!
( exec 22>/tmp/schranke_selbsttest_2.lock; flock -n 22; sleep 12 ) & p2=$!
sleep 1
out=$(bash automation/shopify_schranke.sh touch /tmp/_schr_test_lief 2>&1); rc=$?
chk "voll: Exit 75" "$rc" 75; chk "voll: Befehl lief nicht" "$([ -e /tmp/_schr_test_lief ] && echo ja || echo nein)" nein
chk "voll: Meldung" "$(printf %s "$out" | grep -c 'Schranke 45 min voll')" 1
# Aufrufer hält die Text-Sperre (fd 8): kein Warten, Exit 75
out=$( exec 8>/tmp/_schr_test_txt; bash automation/shopify_schranke.sh touch /tmp/_schr_test_lief 2>&1 ); rc=$?
chk "fd 8: Exit 75" "$rc" 75; chk "fd 8: Meldung" "$(printf %s "$out" | grep -c 'Text-Sperre')" 1
# Wrapper-Muster des Aufsehers: «&& echo FERTIG» darf bei voller Schranke NICHT schreiben
f=$(bash automation/shopify_schranke.sh touch /tmp/_schr_test_lief >/dev/null 2>&1 && echo FERTIG)
chk "Wrapper: kein FERTIG bei voller Schranke" "$f" ""
kill $p1 $p2 2>/dev/null; wait $p1 $p2 2>/dev/null
rm -f /tmp/schranke_selbsttest_*.lock /tmp/_schr_test_lief /tmp/_schr_test_txt
echo "shopify_schranke Selbsttest: $((N-F))/$N"
[ "$F" -eq 0 ]
