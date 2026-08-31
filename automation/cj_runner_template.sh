#!/bin/bash
# CJ-Grind-Runner (Vorlage — wird als cj_runner3/4/5 mit eigener Gruppenliste instanziiert).
#
# ⚠️ ZWEI DOKUMENTIERTE FALLEN SIND HIER EINGEBAUT (CLAUDE.md §CJ-Grind-Plateau):
#
# 1. TIEFEN-RESET. cj_category_fill paginiert IMMER ab Seite 1 bis MAXPAGE. Bleibt MAXPAGE
#    konstant, scannt jeder Lauf dieselben, längst abgegrasten vorderen Seiten und meldet
#    «total 0 / FERTIG: 0» — was wie ein Token- oder Punkteproblem aussieht, aber keines ist.
#    Deshalb wächst MAXPAGE mit der Runde. Der Rundenzähler liegt in einer Datei, damit er
#    Container-Neustarts überlebt (Turn-Reaping killt die Runner ständig; ohne Persistenz
#    fiele die Tiefe bei jedem Neustart auf den Anfangswert zurück).
#
# 2. GLEICHZEITIGKEITS-DROSSEL. CJs getAccessToken erlaubt 1 Abruf pro 300 s. Starten mehrere
#    Runner gleichzeitig, drosselt CJ und alle bekommen ein leeres Token — was früher als
#    «Punkte weg» fehlgedeutet und mit 30 Minuten Strafschlaf beantwortet wurde. Deshalb:
#    versetzter Start (START_DELAY) und ein geteilter Token-Cache statt eigener Abrufe.
#
# Aufrufparameter über Env: RUNNER (Name), GRPLIST (Gruppen), START_DELAY (Sekunden)
cd /home/user/aban-news-landing || exit 1
source /tmp/secrets_env.sh 2>/dev/null
# 31.08.: Nach dem /tmp-Wipe liegen die Uebersetzer-Schluessel (Groq/Gemini/DeepSeek)
# in /tmp/dienste.env (Tresor-Wiederherstellung) — ohne sie skippt der Importer JEDES
# Produkt am Gemini-Schritt und der Grind steht still, waehrend alles gesund aussieht.
source /tmp/dienste.env 2>/dev/null
source /tmp/cj_creds.env 2>/dev/null

# Name auch als ARGUMENT annehmen: nach `exec` steht die Env nicht in der Kommandozeile,
# der Supervisor koennte den Prozess sonst nicht wiederfinden und startet endlos neue.
RUNNER="${1:-${RUNNER:-cj_runner_x}}"
LOG="/tmp/${RUNNER}.log"
IDXF="/tmp/${RUNNER}_idx"
RNDF="/tmp/${RUNNER}_round"
TOKCACHE="/tmp/cj_token_shared.txt"      # von allen Runnern gemeinsam genutzt

sleep "${START_DELAY:-0}"

set -- $GRPLIST
N=$#
i=$(cat "$IDXF" 2>/dev/null || echo 0)
ROUND=$(cat "$RNDF" 2>/dev/null || echo 1)

hole_token() {
  # Gemeinsamer Cache: gültig 20 Min. Verhindert, dass fünf Runner CJs 300s-Limit reissen.
  if [ -f "$TOKCACHE" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TOKCACHE" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -lt 1200 ] && [ -s "$TOKCACHE" ]; then cat "$TOKCACHE"; return; fi
  fi
  T=$(curl -s --max-time 30 -X POST "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken" \
      -H "Content-Type: application/json" -d "{\"email\":\"$CJ_EMAIL\",\"password\":\"$CJ_API_KEY\"}" \
      | python3 -c "import json,sys;print((json.load(sys.stdin).get('data') or {}).get('accessToken',''))" 2>/dev/null)
  if [ -n "$T" ]; then echo -n "$T" > "$TOKCACHE"; echo "$T"
  else cat "$TOKCACHE" 2>/dev/null; fi     # bei Drossel den alten Token weiterverwenden
}

while true; do
  TOK=$(hole_token)
  pick=$(( (i % N) + 1 ))
  eval "G=\${$pick}"
  # FENSTER STATT RAMPE (2026-08-10): cj_category_fill merkt sich seit heute je Kategorie,
  # bis zu welcher Seite es gelesen hat, und macht dort weiter. Damit ist die alte Tiefen-
  # Rampe überflüssig — schlimmer noch, sie war der Grund für den leeren Punktetopf: mit
  # MAXPAGE=45 wurden pro Lauf und Kategorie 45 Seiten gelesen, davon 44 längst abgegraste.
  # An einem Tag kostete das 73'220 CJ-Punkte für rund 20 neue Produkte. MAXPAGE bedeutet
  # jetzt «wie viele NEUE Seiten pro Lauf» — ein kleines Fenster genügt, es wandert ja weiter.
  TIEFE=6
  if [ -n "$TOK" ]; then
    echo "$(date +%T) GRP=$G Runde=$ROUND Fenster=$TIEFE Seiten (ab gespeichertem Zeiger)" >> "$LOG"
    GRP=$G CAP=12 MAXPAGE=$TIEFE GROUPS_FILE=/tmp/cj_groups_extra.json CJ_TOKEN="$TOK" \
      /opt/node22/bin/node automation/cj_category_fill.mjs >> "$LOG" 2>&1
    # Punktetopf leer -> weiterlaufen bringt nichts und erzeugt nur QPS-Drosselung.
    # Lange Pause, bis CJ das Tagesbudget zurücksetzt. (KEIN Strafschlaf wegen vermuteter
    # Punkteknappheit — hier steht die Ursache ausdrücklich in der Antwort.)
    if tail -40 "$LOG" | grep -q "Insufficient API points"; then
      echo "$(date +%T) CJ-Tagesbudget erschöpft — Pause 30 Min" >> "$LOG"
      sleep 1800
    fi
  else
    echo "$(date +%T) kein CJ-Token (Drossel) — kurze Pause, KEIN Strafschlaf" >> "$LOG"
    sleep 120
  fi
  i=$((i+1)); echo "$i" > "$IDXF"
  # Eine volle Gruppenrunde durch -> eine Stufe tiefer graben
  if [ $(( i % N )) -eq 0 ]; then ROUND=$((ROUND+1)); echo "$ROUND" > "$RNDF"; fi
  sleep 30
done
