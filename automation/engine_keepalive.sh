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
REPO_AUTO=/home/user/aban-news-landing/automation

# zaehle <muster> — argv-basiert. Die eigene bash -c-Hülle hat argv1="-c" und matcht nie.
zaehle() { ps -eo args --no-headers | awk -v s="$1" '$1=="bash" && index($0,s)' | wc -l; }

starte() {  # starte <logname> <befehl…>
  # ⚠️ ANHÄNGEN, nicht überschreiben. Mit `>` löschte jeder Neustart die Begründung des
  # vorigen Todes — der Aufseher stand am 20.08. mehrfach still, und das Log war jedes Mal
  # leer, weil der Start es gerade geleert hatte. Ein Wächter, dessen Log der Neustart
  # zerstört, kann seinen eigenen Ausfall nicht erklären.
  local log="/tmp/$1.log"; shift
  echo "=== $(date -u +%F\ %H:%M:%S) Start durch engine_keepalive ===" >>"$log"
  setsid "$@" >>"$log" 2>&1 </dev/null &
  sleep 3          # gestaffelt: alle gleichzeitig reissen Shopify-OAuth + CJ-Token-Limit
}

# ── 1. Der Aufseher zuerst. Er startet ALLE täglichen Qualitäts-Wächter; steht er still,
#       stehen sie alle still, und keine andere Routine merkt es (Lehre 0c).
A=$(zaehle 'fixer_keepalive.sh')
if [ "$A" -eq 0 ]; then
  echo "AUFSEHER neu gestartet"
  starte fixer_keepalive bash automation/fixer_keepalive.sh
elif [ "$A" -gt 1 ]; then
  # ⚠️ 21.08.2026: Der Aufseher hat eine EIGENE Wache gegen Doppelstarts (flock plus
  # Laufzeit-Vergleich) — sie hat trotzdem zwei Instanzen 12 Minuten nebeneinander laufen
  # lassen, eine davon in do_wait auf ein Kind festgehängt. Ein Prozess, der irgendwo
  # wartet, erreicht seine eigene Wache nicht mehr; sie kann sich also grundsätzlich nicht
  # auf sich selbst verlassen. Zwei Aufseher bedeuten doppelte Wächter-Starts und doppelte
  # Shopify-Last. Hier wird von AUSSEN aufgeräumt — der älteste bleibt.
  echo "AUFSEHER: $A Instanzen → $((A-1)) beendet (aelteste bleibt)"
  ps -eo pid,etimes,args --no-headers \
    | awk '$3=="bash" && $4 ~ /fixer_keepalive\.sh$/ {print $2, $1}' \
    | sort -n | head -n -1 | awk '{print $2}' | xargs -r kill 2>/dev/null
  # ⚠️ Der Ueberlebende ist der AELTESTE — und genau der kann der haengende sein. Die
  # gerade beendete juengere Instanz hat womoeglich eben erst den Herzschlag geschrieben;
  # ohne diesen Reset saehe ein toter Aufseher zehn Minuten lang gesund aus. Die Uhr
  # startet deshalb hier neu.
  date +%s > /tmp/_fixer_herzschlag
else
  # ⚠️ «Er laeuft» ist nicht «er arbeitet». Der Aufseher schreibt in jeder Runde (alle 120 s)
  # /tmp/_fixer_herzschlag. Ist der aelter als 10 Minuten, haengt er — am 23.08.2026 stand er
  # so 72 Minuten still, waehrend beide Stunden-Routinen brav «AUFSEHER laeuft» meldeten und
  # kein einziger Qualitaets-Waechter mehr lief. Fehlt die Datei ganz, ist es eine alte
  # Fassung ohne Herzschlag — dann NICHT toeten, sonst killt dieses Skript einen gesunden
  # Aufseher bei jedem Lauf.
  HB=/tmp/_fixer_herzschlag
  if [ -f "$HB" ] && [ $(( $(date +%s) - $(cat "$HB" 2>/dev/null || echo 0) )) -gt 600 ]; then
    echo "AUFSEHER haengt (Herzschlag kalt) → neu gestartet"
    ps -eo pid,args --no-headers \
      | awk '$2=="bash" && $3 ~ /fixer_keepalive\.sh$/ {print $1}' | xargs -r kill 2>/dev/null
    sleep 2
    starte fixer_keepalive bash automation/fixer_keepalive.sh
  else
    echo "AUFSEHER laeuft"
  fi
fi

# ── 2. CJ-Grind — aber NICHT im Vorrang-Fenster.
#
# CJs Punktebudget ist EIN Topf für alle Prozesse und reicht nicht für beide Aufgaben.
# Am 20.08.2026 war es um 20:24 erschöpft: vollständig aufgebraucht dafür, Produkt
# Nr. 41'150 anzulegen — während für 41'133 bestehende Produkte der EINKAUFSPREIS fehlte
# und damit unbekannt war, ob sie überhaupt Gewinn bringen (Stichprobe: CHF 15.90
# Verkaufspreis gegen CHF 17.70 Kosten). Bei rund zehn Bestellungen insgesamt bringt das
# 41'150-ste Produkt nachweislich nichts; die Kostenwahrheit entscheidet über jede Marge.
# Deshalb bekommt der Kosten-Backfill die erste Stunde nach dem Punkte-Reset (~16:00 UTC)
# allein — das kostet den Grind 1,5 von 24 Stunden.
VORRANG=0
STD=$(date -u +%H); MIN=$(date -u +%M)
if [ "$STD" = "16" ] || { [ "$STD" = "17" ] && [ "$MIN" -lt 30 ]; }; then VORRANG=1; fi

if [ "$VORRANG" = "1" ]; then
  echo "VORRANG-FENSTER (16:00-17:30 UTC): CJ-Punkte gehoeren dem Kosten-Backfill"
  # Der Aufseher überspringt einen Lauf, dessen Log seit weniger als einer Stunde auf PAUSE
  # steht. Hat der Backfill kurz vor 16:00 wegen leerer Punkte pausiert, verlöre er dadurch
  # das halbe Vorrang-Fenster — also die Kühlung hier gezielt ablaufen lassen.
  [ -f /tmp/cj_kosten_backfill.log ] && touch -d '2 hours ago' /tmp/cj_kosten_backfill.log
  ps -eo pid,args --no-headers | grep "[c]j_runner_template" | awk '{print $1}' | xargs -r kill 2>/dev/null
else

# Prüfmuster ist der argv2-Name OHNE .sh (siehe Kopf).
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
fi

# ── 3. Übrige /tmp-Dauerläufer. Hier ist der Dateiname AUCH der Prozessname (kein exec).
for S in cj_queue_runner autocommit reel_engine_runner social_autopilot \
         fortura_img_runner website_hygiene_runner; do
  # ⚠️ Die Repo-Fassung hat Vorrang. autocommit.sh lag bis zum 23.08. NUR unter /tmp —
  # dieselbe Klasse, die dieses Projekt schon zweimal verloren hat. Wer eine Engine ins
  # Repo holt, muss auch die Startliste umhaengen, sonst laeuft weiter die /tmp-Kopie.
  QUELL="/tmp/$S.sh"
  [ -f "$REPO_AUTO/$S.sh" ] && QUELL="$REPO_AUTO/$S.sh"
  [ -f "$QUELL" ] || continue
  n=$(zaehle "$S.sh")
  if [ "$n" -eq 0 ]; then
    echo "$S neu gestartet"
    starte "$S" bash "$QUELL"
  elif [ "$n" -gt 1 ]; then
    echo "$S: $n Instanzen → $((n-1)) beendet"
    ps -eo pid,etimes,args --no-headers | awk -v s="$S.sh" 'index($0,s) && $3=="bash"' \
      | sort -k2 -n | head -n -1 | awk '{print $1}' | xargs -r kill 2>/dev/null
  fi
done

echo "STAND: $(zaehle cj_runner) CJ-Runner, Aufseher=$(zaehle fixer_keepalive.sh)"
