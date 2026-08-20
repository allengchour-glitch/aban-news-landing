#!/bin/bash
# engine_keepalive.sh — EINE Wahrheit für «welche Dauerläufer müssen laufen».
#
# ⚠️ WARUM ES DAS GIBT (teuer gelernt 20.08.2026, Lehre 1 vierter Akt):
# Beide Stunden-Routinen trugen ihre eigene Prüfliste im Prompt-Text — und beide prüften
#   ps -eo args | awk -v s="cj_runner2.sh" '$1=="bash" && index($0,s)'
# Die Wrapper /tmp/cj_runner2.sh enden aber auf
#   exec bash /tmp/cj_runner_template.sh cj_runner2
# und `exec` LÖSCHT den Wrapper-Namen aus der Prozessliste. Gesucht wurde «cj_runner2.sh»,
# in der Prozessliste steht «cj_runner2» — die Prüfung fand also NIE einen laufenden Runner
# und startete stündlich vier neue. Gefunden wurden 12 Runner in drei Generationen; sie
# teilen sich CJs Limit von 1 Anfrage/Sekunde, drosseln sich also gegenseitig.
#
# Regel daraus: Eine Prozessprüfung muss gegen die ECHTE Kommandozeile geschrieben werden
# (ps ansehen!), nicht gegen den Dateinamen, den man gestartet hat. Und die Liste gehört
# an EINE Stelle im Repo, nicht in zwei Routine-Prompts, die auseinanderlaufen.
#
# Nutzung: bash automation/engine_keepalive.sh   (idempotent, startet nur was fehlt)

cd /home/user/aban-news-landing || exit 1

# zaehle <muster> — argv-basiert. Die eigene bash -c-Hülle hat argv1="-c" und matcht nie.
zaehle() { ps -eo args --no-headers | awk -v s="$1" '$1=="bash" && index($0,s)' | wc -l; }

starte() {  # starte <logname> <befehl…>
  local log="/tmp/$1.log"; shift
  setsid "$@" >"$log" 2>&1 </dev/null &
  sleep 3          # gestaffelt: alle gleichzeitig reissen Shopify-OAuth + CJ-Token-Limit
}

# ── 1. Der Aufseher zuerst. Er startet ALLE täglichen Qualitäts-Wächter; steht er still,
#       stehen sie alle still, und keine andere Routine merkt es (Lehre 0c).
if [ "$(zaehle 'fixer_keepalive.sh')" -eq 0 ]; then
  echo "AUFSEHER neu gestartet"
  starte fixer_keepalive bash automation/fixer_keepalive.sh
else
  echo "AUFSEHER laeuft"
fi

# ── 2. CJ-Grind. Prüfmuster ist der argv2-Name OHNE .sh (siehe Kopf).
for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
  [ -f "/tmp/$R.sh" ] || { echo "$R FEHLT (/tmp gewiped?)"; continue; }
  n=$(zaehle "$R")
  if [ "$n" -eq 0 ]; then
    echo "$R neu gestartet"
    starte "$R" bash "/tmp/$R.sh"
  elif [ "$n" -gt 1 ]; then
    # Doppelte abräumen: die JÜNGSTEN beenden, den ältesten behalten (er hat den
    # gewachsenen Tiefen-Zeiger im Speicher und laeuft gerade in einer Kategorie).
    echo "$R: $n Instanzen → $((n-1)) beendet"
    ps -eo pid,etimes,args --no-headers | awk -v s="$R" 'index($0,s) && $3=="bash"' \
      | sort -k2 -n | head -n -1 | awk '{print $1}' | xargs -r kill 2>/dev/null
  fi
done

# ── 3. Übrige /tmp-Dauerläufer. Hier ist der Dateiname AUCH der Prozessname (kein exec).
for S in cj_queue_runner autocommit reel_engine_runner social_autopilot \
         fortura_img_runner website_hygiene_runner; do
  [ -f "/tmp/$S.sh" ] || continue
  n=$(zaehle "$S.sh")
  if [ "$n" -eq 0 ]; then
    echo "$S neu gestartet"
    starte "$S" bash "/tmp/$S.sh"
  elif [ "$n" -gt 1 ]; then
    echo "$S: $n Instanzen → $((n-1)) beendet"
    ps -eo pid,etimes,args --no-headers | awk -v s="$S.sh" 'index($0,s) && $3=="bash"' \
      | sort -k2 -n | head -n -1 | awk '{print $1}' | xargs -r kill 2>/dev/null
  fi
done

echo "STAND: $(zaehle cj_runner) CJ-Runner, Aufseher=$(zaehle fixer_keepalive.sh)"
