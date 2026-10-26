#!/bin/bash
# Auswahl-Dauerlauf: zieht die fehlenden Farben/Grössen bei ALLEN Kandidaten nach (cj_varianten_nachziehen.mjs, LIVE).
#
# Reihenfolge: Stufe 1 (bewertete Produkte) → 2 (Kleidung, Schuhe, Ringe, Uhren, Taschen) → 3 (Rest). Liste: node automation/auswahl_kandidaten.mjs.
# Das Werkzeug überspringt, was das Ledger kennt (GESCHRIEBEN; endgültige Überspringer 14 Tage, zurückgestellte 7 Tage, vorläufige und Fehler 20 Stunden), jeder Lauf beginnt also
# beim ersten offenen Produkt.
# Erschöpft CJ die Tagespunkte oder drosselt dauerhaft (Exitcode 3), wartet der Lauf 30 Minuten und macht weiter — er endet erst, wenn die Liste durch ist
# oder die Sperrdatei /tmp/auswahl_stop angelegt wird.
#
# Aufruf:  STUFEN="1 2 3" BATCH=150 nohup bash automation/auswahl_durchlauf.sh > /tmp/auswahl_durchlauf.out 2>&1 &
# Exitcode 4 des Werkzeugs = Shopify-Tagesgrenze für neue Varianten (gemessen ~9 500/Tag): der Lauf wartet WARTE_VAR Sekunden (Standard 40 Min.) und versucht es wieder.
# Exitcode 3 (CJ drosselt/Punkte weg) und 5 (KI-Dienst fällt aus) warten WARTE Sekunden, aber höchstens MAX_STILL Mal hintereinander OHNE dass das Ledger wächst:
# danach gibt die Scheibe auf (Fehlermarke), statt eine ganze Nacht zu stehen und den Rest der Stufen zu blockieren (Prüfung 26.10.2026).
# JEDER ANDERE Exitcode ausser 0/3/4 ist ein Absturz (Token, Netz, Shopify-5xx): die Scheibe wird bis zu 3 Mal nach WARTE_FEHL Sekunden wiederholt. Gelingt es
# nicht, wird die Scheibe in der Fehlermarke vermerkt und der Treiber endet am Schluss mit Exitcode 2 (statt still «FERTIG», Prüfung 26.10.2026).
# Schalter: LISTE=/tmp/auswahl_kandidaten.csv · BATCH=150 · STUFEN="1 2 3" · WORKERS=3 · LOG=/tmp/auswahl_durchlauf.log · WARTE=1800 · WARTE_FEHL=120 · MAX_STILL=4
#           LEDGER=dropship/cj_varianten_ledger.txt (Fortschrittsmass und Ledger des Werkzeugs)
# FORCE wird NICHT durchgereicht: mit FORCE=1 ignoriert das Werkzeug seine Ledger-Zeilen, und der Treiber wiederholte jeden vollen Stapel endlos (nur für Einzelläufe des Werkzeugs).
#           AUSWAHL_TMP=/tmp (Ort von Sperre, Stopp-Datei, Scheibenlisten, Fehlermarke; zum Testen umlenkbar) · NODE=Pfad zu node
cd "$(dirname "$0")/.." || exit 1
T=${AUSWAHL_TMP:-/tmp}
LISTE=${LISTE:-$T/auswahl_kandidaten.csv}; BATCH=${BATCH:-150}; STUFEN=${STUFEN:-"1 2 3"}
LOG=${LOG:-$T/auswahl_durchlauf.log}; WARTE=${WARTE:-1800}; WARTE_VAR=${WARTE_VAR:-2400}; WARTE_FEHL=${WARTE_FEHL:-120}; MAX_STILL=${MAX_STILL:-4}; NODE=${NODE:-/opt/node22/bin/node}
LEDGER=${LEDGER:-dropship/cj_varianten_ledger.txt}; export LEDGER
unset FORCE
[ -f "$LISTE" ] || { echo "Keine Liste: $LISTE (erst node automation/auswahl_kandidaten.mjs)"; exit 1; }
exec 9>"$T/auswahl_durchlauf.lock"; flock -n 9 || { echo "Läuft schon (Sperre $T/auswahl_durchlauf.lock)"; exit 1; }
WORKERS=${WORKERS:-3}   # parallele Läufe: die Zeit geht in Bild-Downloads und Shopify-Schreiben, nicht in CJ (CJ erlaubt ~1 Abfrage/s)
FEHLMARKE="$T/auswahl_scheibe_fehler"; rm -f "$FEHLMARKE"

# Fortschritt = Ledger-Zeilen, die NICHT FEHLER und nicht «vorläufig» sind. Die bricht das Werkzeug beim Abbruch mit Exitcode 3/5 selbst ab und hängt sie dabei an (Parkzeile des KI-Ausfalls,
# FEHLER-Zeile der ersten CJ-Drosselung): mit `wc -l` zählte jeder abgebrochene Lauf als Fortschritt und MAX_STILL griff nie (Prüfung 26.10.2026). `grep -c` gibt bei 0 Treffern «0» aus.
fortschritt() { local n; n=$(grep -vcE ' · FEHLER · | · UEBERSPRUNGEN · vorläufig' 2>/dev/null "$LEDGER"); echo "${n:-0}"; }
# Schlafen in 5-Sekunden-Stücken: die Stopp-Datei (sanftes Ende vor der Höchstdauer) weckt auch schlafende Scheiben. Sonst endet der Lauf fast immer durch den harten Abbruch.
schlaf() { local i; for ((i = 0; i < $1; i += 5)); do [ -e "$T/auswahl_stop" ] && return 0; sleep 5; done; }

lauf_scheibe() {   # $1 = Stufe, $2 = Datei mit den Handles dieser Scheibe, $3 = Nummer
  local st=$1 datei=$2 nr=$3 lauf rc zus fehl=0 still=0 vor nach
  [ "$(wc -l < "$datei")" -le 1 ] && return 0   # nur die Kopfzeile: leere Scheibe, kein Fehler
  while true; do
    [ -e "$T/auswahl_stop" ] && { echo "$(date -u +%FT%TZ) [$st/$nr] Stopp-Datei gefunden" | tee -a "$LOG"; return 0; }
    lauf=$(mktemp); vor=$(fortschritt)
    LIVE=1 LIMIT="$BATCH" HANDLES_DATEI="$datei" "$NODE" automation/cj_varianten_nachziehen.mjs > "$lauf" 2>&1; rc=$?
    cat "$lauf" >> "$LOG"
    nach=$(fortschritt); [ "$nach" -gt "$vor" ] && still=0   # Fortschritt (irgendeine Scheibe schrieb eine Ledger-Zeile)
    zus=$(grep -E '^Zusammenfassung' "$lauf" | tail -1)
    echo "$(date -u +%FT%TZ) [$st/$nr] rc=$rc $zus" | tee -a "$LOG"
    if [ "$rc" = 3 ] || [ "$rc" = 5 ]; then
      still=$((still + 1)); rm -f "$lauf"
      if [ "$still" -ge "$MAX_STILL" ]; then echo "$(date -u +%FT%TZ) [$st/$nr] gibt auf: $still Mal rc=$rc ohne neue Ledger-Zeile" | tee -a "$LOG"; echo "Stufe $st Scheibe $nr: rc=$rc ohne Fortschritt" >> "$FEHLMARKE"; return 0; fi
      if [ "$rc" = 3 ]; then echo "$(date -u +%FT%TZ) [$st/$nr] CJ drosselt/erschöpft — warte ${WARTE}s ($still/$MAX_STILL)" | tee -a "$LOG"; else echo "$(date -u +%FT%TZ) [$st/$nr] KI-Dienst fällt aus — warte ${WARTE}s ($still/$MAX_STILL)" | tee -a "$LOG"; fi
      schlaf "$WARTE"; continue
    fi
    if [ "$rc" = 4 ]; then echo "$(date -u +%FT%TZ) [$st/$nr] Shopify-Tagesgrenze für neue Varianten erreicht — warte ${WARTE_VAR}s" | tee -a "$LOG"; rm -f "$lauf"; schlaf "$WARTE_VAR"; continue; fi
    if [ "$rc" != 0 ]; then   # Absturz: NICHT als «Scheibe durch» werten
      fehl=$((fehl + 1)); rm -f "$lauf"
      echo "$(date -u +%FT%TZ) [$st/$nr] ABSTURZ rc=$rc (Versuch $fehl/3)" | tee -a "$LOG"
      if [ "$fehl" -ge 3 ]; then echo "Stufe $st Scheibe $nr: rc=$rc" >> "$FEHLMARKE"; return 0; fi
      schlaf "$WARTE_FEHL"; continue
    fi
    fehl=0
    if ! grep -q 'LIMIT .* erreicht' "$lauf"; then rm -f "$lauf"; return 0; fi   # Scheibe durch
    rm -f "$lauf"
  done
}

for st in $STUFEN; do
  gesamt=$T/auswahl_stufe_$st.csv
  { echo "handle;stufe;sku;medien;google"; awk -F';' -v s="$st" '$2==s' "$LISTE"; } > "$gesamt"
  echo "$(date -u +%FT%TZ) Stufe $st: $(($(wc -l < "$gesamt") - 1)) Kandidaten, $WORKERS Läufe" | tee -a "$LOG"
  for k in $(seq 0 $((WORKERS - 1))); do
    # Scheibe k: jede WORKERS-te Zeile (Reihenfolge der Priorität bleibt erhalten)
    { echo "handle;stufe;sku;medien;google"; awk -F';' -v w="$WORKERS" -v k="$k" 'NR>1 && (NR-2)%w==k' "$gesamt"; } > "$T/auswahl_stufe_${st}_$k.csv"
    lauf_scheibe "$st" "$T/auswahl_stufe_${st}_$k.csv" "$k" &
  done
  wait
done
if [ -s "$FEHLMARKE" ]; then
  echo "$(date -u +%FT%TZ) FERTIG MIT FEHLERN — diese Scheiben stürzten dreimal ab:" | tee -a "$LOG"; tee -a "$LOG" < "$FEHLMARKE"
  exit 2
fi
echo "$(date -u +%FT%TZ) FERTIG" | tee -a "$LOG"
