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

# --- ffmpeg/ffprobe bereitstellen (28.08.2026) ------------------------------------------
# ZWOELF Werkzeuge dieses Repos rufen `ffmpeg` NACKT auf (reel/make_reel.sh, product_slideshow,
# enhance_clips, make_montage, freegen_video, render_image_posts, dropship/ads/*). Im Container
# gibt es kein /usr/bin/ffmpeg — der Reel-Motor meldete deshalb «FERTIG. neue Reels: 0 |
# gescannt: 1203» und sah dabei gesund aus. Dieselbe Klasse wie beim Queue-Runner: ein Lauf,
# der sein Ende erreicht, hat deswegen noch nichts getan.
# Das vollstaendige ffmpeg 7.0.2 liegt als Beigabe von imageio_ffmpeg im Python-Baum. EIN
# Symlink repariert alle zwoelf, statt zwoelf Dateien anzufassen. Der Snapshot-Rewind loescht
# /usr/local/bin — deshalb steht das HIER und nicht in einem einmaligen Befehl.
# ⚠️ 30.08.: Ein /tmp-Wipe nahm auch die PIP-PAKETE mit — imageio_ffmpeg UND Pillow waren weg,
# der Symlink zeigte ins Leere und die TikTok-Werkzeuge standen still. Beide werden deshalb
# bei Bedarf NEU INSTALLIERT, nicht nur verlinkt.
python3 -c "import PIL" 2>/dev/null || pip install -q pillow >/dev/null 2>&1
FFMPEG_BEIGABE=$(python3 -c "import imageio_ffmpeg,sys;print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null)
if [ -z "$FFMPEG_BEIGABE" ]; then
  pip install -q imageio-ffmpeg >/dev/null 2>&1
  FFMPEG_BEIGABE=$(python3 -c "import imageio_ffmpeg,sys;print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null)
fi
if [ -n "$FFMPEG_BEIGABE" ] && ! /usr/local/bin/ffmpeg -version >/dev/null 2>&1; then
  ln -sf "$FFMPEG_BEIGABE" /usr/local/bin/ffmpeg
  echo "$(date -u +%H:%M) ffmpeg bereitgestellt"
fi
# ffprobe bringt die Beigabe NICHT mit; zehn Render-Skripte fragen damit ausschliesslich die
# Dauer ab. Der Ersatz liest sie aus `ffmpeg -i`. Grenzen stehen im Kopf der Datei.
if [ ! -x /usr/local/bin/ffprobe ] && [ -f "$REPO_AUTO/ffprobe_ersatz.py" ]; then
  printf '#!/bin/sh\nexec python3 %s/ffprobe_ersatz.py "$@"\n' "$REPO_AUTO" > /usr/local/bin/ffprobe
  chmod +x /usr/local/bin/ffprobe
  echo "$(date -u +%H:%M) ffprobe-Ersatz bereitgestellt"
fi

# zaehle <muster> — argv-basiert. Die eigene bash -c-Hülle hat argv1="-c" und matcht nie.
zaehle() { ps -eo args --no-headers | awk -v s="$1" '$1=="bash" && index($0,s)' | wc -l; }

# ⚠️ ZAEHLER UND TOETER MUESSEN DASSELBE MUSTER BENUTZEN (27.08.2026).
# `zaehle` ist absichtlich lose (`index($0,s)`), weil der CJ-Wrapper seinen Namen per `exec`
# verliert und nur noch als argv2 auftaucht. Fuer den Aufseher wurde damit GEZAEHLT, aber mit
# einem strengen Muster (`$4 ~ /fixer_keepalive\.sh$/`) GETOETET — zwei Fragen, zwei Antworten.
# Am 27.08. meldete der Zaehler «13 Instanzen → 12 beendet», waehrend nur EINE echte lief:
# der lose Zaehler trifft jeden Prozess, in dessen Kommandozeile der Name irgendwo vorkommt.
# Das ist die `pgrep -f`-Falle von Lehre 1 in neuer Verkleidung — diesmal nicht im eigenen
# Aufruf, sondern in fremden Kindprozessen. Der Aufseher wird deshalb ueberall mit DEM
# Muster gezaehlt, mit dem er auch beendet wird.
# ⚠️ KORREKTUR ZUR ANNAHME VON HEUTE FRUEH: Nicht das lose Muster war schuld an
# «13 Instanzen». Die Treffer sind ECHT — es sind aber keine zweiten Aufseher, sondern
# FORKS DES EINEN. Bash forkt fuer jedes `( … & )` und jedes `$(…)` einen Subshell, und
# ein Subshell BEHAELT die Kommandozeile des Elternprozesses. Belegt am 27.08.:
#   PID 7846 SID 7846  ← der echte Aufseher
#   PID 8033 SID 7846, PID 8246 SID 7846, … (13 weitere, alle SID 7846)
# Alle haben PPID 1 (der Aufseher laeuft per setsid), sehen also aus wie eigenstaendige
# Prozesse. Das alte Abraeumen hat damit die ARBEITENDEN Subshells des laufenden Aufsehers
# erschlagen. Unterschieden wird jetzt an der SITZUNG: der per setsid gestartete Aufseher
# ist Sitzungsfuehrer (pid == sid), seine Forks sind es nie.
aufseher_pids() {
  ps -eo pid,sid,etimes,args --no-headers \
    | awk '$1==$2 && $4=="bash" && $5 ~ /fixer_keepalive\.sh$/ {print $3, $1}' | sort -n
}
zaehle_aufseher() { aufseher_pids | grep -c . ; }

# ⚠️ EINE Routine fuer den Ersatz, von BEIDEN Zweigen benutzt (28.08.2026). Die sorgfaeltige
# Fassung (warten bis der Alte wirklich weg ist, danach Gegenprobe und Nachfassen) stand nur
# im Herzschlag-Zweig. Als der Versions-Zweig dazukam, hat er sie NICHT geerbt — und prompt
# stand wieder NULL Aufseher da, weil der Ersatz an der flock-Sperre des Sterbenden abprallte.
# Dieselbe Geschwister-Lehre wie bei publishVerified() und der Farbtabelle: Wer eine Logik
# baut, sucht ihre Zwillinge — oder macht daraus EINE Stelle.
sperre_frei() {  # Rueckgabe 0 = Sperre ist frei. Die Subshell gibt sie beim Ende sofort zurueck.
  ( exec 9>/tmp/fixer_keepalive.lock; flock -n 9 ) 2>/dev/null
}

# ⚠️ DIE URSACHE ALLER «AUFSEHER-Ersatz ausgestiegen»-Meldungen (28.08.2026, endlich belegt).
# `fuser -v /tmp/fixer_keepalive.lock` nannte als Halter: **PID 6013, Kommando `sleep`**.
# fixer_keepalive.sh macht `exec 9>lock` — dieser Deskriptor wird an JEDES Kind vererbt, auch
# an ein simples `sleep` in seiner Schleife. Das Abraeumen killt aber nur, was in argv
# `fixer_keepalive.sh` heisst; das `sleep` heisst `sleep`, ueberlebt und haelt die Sperre bis
# zum Ende seiner Wartezeit. Der frische Aufseher scheitert am flock und tritt ab — genau die
# Meldung, die den ganzen Tag auftauchte und die ich zweimal falsch gedeutet habe (erst
# eigenes timeout, dann fehlende Wartelogik).
# Deshalb wird der HALTER getoetet, nicht der Name: fuser -k trifft exakt die Prozesse mit
# offenem Deskriptor auf die Sperrdatei, und nichts sonst. Die taeglichen Waechter sind davon
# nicht betroffen, sie werden mit `9>&-` gestartet (Deskriptor geschlossen).
sperre_freiraeumen() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k /tmp/fixer_keepalive.lock >/dev/null 2>&1
    sleep 1
  fi
}

aufseher_ersetzen() {
  ps -eo pid,args --no-headers \
    | awk '$2=="bash" && $3 ~ /fixer_keepalive\.sh$/ {print $1}' | xargs -r kill 2>/dev/null
  for _ in $(seq 15); do [ "$(zaehle_aufseher)" -eq 0 ] && break; sleep 1; done
  if [ "$(zaehle_aufseher)" -gt 0 ]; then
    ps -eo pid,args --no-headers \
      | awk '$2=="bash" && $3 ~ /fixer_keepalive\.sh$/ {print $1}' | xargs -r kill -9 2>/dev/null
    sleep 2
  fi
  # ⚠️ Der Leader ist weg, die SPERRE aber noch belegt (28.08.2026). fixer_keepalive.sh
  # macht `exec 9>…; flock -n 9`, und ein solcher Deskriptor wird an JEDES Kind vererbt —
  # solange eine Arbeits-Subshell des sterbenden Aufsehers lebt, haelt sie die Sperre.
  # Die Zaehlung sieht 0 (sie zaehlt Session-Leader, richtig so), der neue Aufseher startet,
  # scheitert am flock und beendet sich mit «Supervisor laeuft bereits» — im Log genau so
  # belegt. Das kostete jedes Mal einen «ausgestiegen»-Versuch. Gewartet wird deshalb auf
  # die SPERRE, nicht auf die Prozessliste: auf das, was der Start tatsaechlich braucht.
  sperre_frei || sperre_freiraeumen
  for _ in $(seq 20); do sperre_frei && break; sleep 1; done
  date +%s > /tmp/_fixer_herzschlag
  starte fixer_keepalive bash automation/fixer_keepalive.sh
  for versuch in 1 2 3; do
    sleep $((versuch * 5))
    [ "$(zaehle_aufseher)" -gt 0 ] && return 0
    echo "⚠️ AUFSEHER-Ersatz ausgestiegen — Versuch $versuch"
    starte fixer_keepalive bash automation/fixer_keepalive.sh
  done
  [ "$(zaehle_aufseher)" -eq 0 ] && echo "⛔ AUFSEHER laesst sich nicht starten (Sperre? /tmp/fixer_keepalive.log lesen)"
}

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
#
# ⚠️ OHNE_AUFSEHER=1 überspringt diesen ganzen Abschnitt (29.08.2026). Der Aufseher ruft
# dieses Skript inzwischen SELBST auf, damit die Motoren nicht mehr von der Stundenroutine
# abhängen. Ohne diesen Schalter könnte er sich dabei selbst töten: Der Block unten beendet
# einen Aufseher mit kaltem Herzschlag — und ein Aufseher, der gerade in diesem Aufruf steckt,
# schreibt in genau diesem Moment keinen Herzschlag. Er würde sich also selbst erschlagen.
# Die SCHICHTUNG ist damit sauber: Die Stundenroutine hält den Aufseher, der Aufseher hält
# die Motoren. Jede Schicht wird von der darüber bewacht, und die oberste liegt ausserhalb
# des Containers — dort, wo kein Rewind sie erreicht.
if [ "${OHNE_AUFSEHER:-}" = "1" ]; then
  A=1
else
A=$(zaehle_aufseher)
if [ "$A" -eq 0 ]; then
  echo "AUFSEHER neu gestartet"
  # ⚠️ AUCH HIER auf die SPERRE warten, nicht nur beim Ersetzen (28.08.2026). «Kein Aufseher
  # in der Prozessliste» heisst nicht «die Sperre ist frei»: `fixer_keepalive.sh` macht
  # `exec 9>…; flock -n 9`, und dieser Deskriptor wird an jedes Kind vererbt. Solange eine
  # Arbeits-Subshell des eben gestorbenen Aufsehers lebt, haelt sie die Sperre weiter — der
  # frische Aufseher scheitert daran und tritt ab. Genau so passiert um 17:08 nach dem
  # Abraeumen: «aelterer Supervisor laeuft weiterhin (PID 2274 tritt ab)», Ergebnis 0
  # Aufseher. Derselbe Fehler stand eine Verzweigung weiter schon in aufseher_ersetzen.
  sperre_frei || sperre_freiraeumen
  for _ in $(seq 20); do sperre_frei && break; sleep 1; done
  # ⚠️ Uhr mitgeben: der frische Aufseher schreibt seinen ersten Herzschlag erst am Ende
  # der ersten Runde. Bliebe die alte, kalte Zeit stehen, wuerde ihn der naechste Lauf
  # als «haengend» toeten, bevor er je einen schreiben konnte.
  date +%s > /tmp/_fixer_herzschlag
  starte fixer_keepalive bash automation/fixer_keepalive.sh
  # Und nachsehen, ob er wirklich steht — ein Start ist keine Quittung.
  for versuch in 1 2 3; do
    sleep $((versuch * 5))
    [ "$(zaehle_aufseher)" -gt 0 ] && break
    echo "⚠️ AUFSEHER-Start ausgestiegen — Versuch $versuch"
    for _ in $(seq 10); do sperre_frei && break; sleep 1; done
    starte fixer_keepalive bash automation/fixer_keepalive.sh
  done
elif [ "$A" -gt 1 ]; then
  # ⚠️ 21.08.2026: Der Aufseher hat eine EIGENE Wache gegen Doppelstarts (flock plus
  # Laufzeit-Vergleich) — sie hat trotzdem zwei Instanzen 12 Minuten nebeneinander laufen
  # lassen, eine davon in do_wait auf ein Kind festgehängt. Ein Prozess, der irgendwo
  # wartet, erreicht seine eigene Wache nicht mehr; sie kann sich also grundsätzlich nicht
  # auf sich selbst verlassen. Zwei Aufseher bedeuten doppelte Wächter-Starts und doppelte
  # Shopify-Last. Hier wird von AUSSEN aufgeräumt — der älteste bleibt.
  echo "AUFSEHER: $A Instanzen → $((A-1)) beendet (aelteste bleibt)"
  aufseher_pids | head -n -1 | awk '{print $2}' | xargs -r kill 2>/dev/null
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
    aufseher_ersetzen
  elif [ "$(md5sum "$REPO_AUTO/fixer_keepalive.sh" 2>/dev/null | cut -d' ' -f1)" != "$(cat /tmp/_fixer_version 2>/dev/null)" ]; then
    # ⚠️ Ein laufender bash-Prozess parst seinen Schleifenrumpf EINMAL. Wer einen neuen
    # Waechter in fixer_keepalive.sh eintraegt, hat ihn erst nach dessen Neustart wirklich
    # registriert — am 28.08. standen `bilddubletten` und `wahlversprechen` stundenlang im
    # Skript und liefen nie. Der Aufseher legt beim Start die Pruefsumme seines eigenen
    # Skripts nach /tmp/_fixer_version; weicht sie ab, laeuft eine alte Fassung.
    # ⚠️ Eine FEHLENDE Datei zaehlt als Abweichung: Ein Aufseher, der vor dem Einbau
    # gestartet wurde, schreibt sie nie — mit `[ -f … ]` waere die Bedingung genau in dem
    # Fall falsch gewesen, fuer den sie gebaut ist.
    # ⚠️ KEIN Zeitstempel-Vergleich: `git reset --hard` beim Snapshot-Vorspulen erneuert die
    # mtime jeder Datei, ohne dass sich der Inhalt aendert — das gaebe bei jedem Rueckfall
    # einen Fehlalarm. Ein Zeitstempel ist eine Quittung, kein Nachweis.
    echo "AUFSEHER laeuft mit alter Fassung → Neustart"
    aufseher_ersetzen
  else
    echo "AUFSEHER laeuft"
  fi
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
# 03.09.2026: Vorrang auch auf Zuruf — dropship/_GRIND_PAUSE_BIS trägt eine UTC-Epoche; bis dahin ruht der
# Grind, damit ein Prüflauf (z. B. CH-Versendbarkeit, Klasse #1016) den geteilten CJ-Eimer bekommt.
# Vier Runner halten den Eimer sonst dauerhaft bei ~0 (gemessen: remaining 11 → 1 → 16900500 in 20 s).
PB="${REPO_AUTO%/automation}/dropship/_GRIND_PAUSE_BIS"
if [ -f "$PB" ] && [ "$(cat "$PB" 2>/dev/null | tr -dc 0-9)" -gt "$(date -u +%s)" ] 2>/dev/null; then
  VORRANG=1; echo "GRIND-PAUSE auf Zuruf bis $(date -u -d @"$(cat "$PB" | tr -dc 0-9)" +%H:%M) UTC ($PB)"
fi

if [ "$VORRANG" = "1" ]; then
  echo "VORRANG-FENSTER (16:00-17:30 UTC): CJ-Punkte gehoeren Kosten-Backfill + Bewertungen"
  # Der Aufseher überspringt einen Lauf, dessen Log seit weniger als einer Stunde auf PAUSE
  # steht. Hat der Backfill kurz vor 16:00 wegen leerer Punkte pausiert, verlöre er dadurch
  # das halbe Vorrang-Fenster — also die Kühlung hier gezielt ablaufen lassen.
  [ -f /tmp/cj_kosten_backfill.log ] && touch -d '2 hours ago' /tmp/cj_kosten_backfill.log
  # ⚠️ 28.08.2026: Der Bewertungs-Import teilt sich das Fenster. Begründung nach der Regel
  # «erst fragen, WEM eine neue CJ-Engine das Budget wegnimmt» — es ist der Grind, und der
  # steht messbar auf dem Plateau: Die Runner melden seit Tagen «total 0» und
  # «skip(dup-titel)», die Rotation ist ausgeschöpft. Dagegen hat von 31 Produkten mit
  # echten Besuchern genau EINES eine Bewertung. Punkte für das 46'749-ste Produkt bringen
  # nachweislich nichts; Punkte für Sozialbeweis auf Seiten mit Verkehr können etwas bringen.
  # ⚠️ Der pid-Nachschlag kostet 10 Punkte, der Kommentar-Abruf NICHTS — jede einmal
  # aufgelöste pid steht dauerhaft im Cache. Das Fenster zahlt sich also über die Zeit aus.
  [ -f /tmp/cj_reviews_import.log ] && touch -d '25 hours ago' /tmp/cj_reviews_import.log
  ps -eo pid,args --no-headers | grep "[c]j_runner_template" | awk '{print $1}' | xargs -r kill 2>/dev/null
else

# Prüfmuster ist der argv2-Name OHNE .sh (siehe Kopf).
# ⚠️ 30.08.2026 — /tmp WURDE VOLLSTAENDIG GELEERT, und dieser Wächter sah nur zu.
# Er meldete viermal «FEHLT (/tmp gewiped?)» und STAND: 0 CJ-Runner — stundenlang, bei
# jedem Lauf. Die Wrapper liegen aber im REPO (automation/cj_runner2..5.sh und
# cj_runner_template.sh); nur die /tmp-Kopien fehlten. Ein Selbstheiler, der eine
# behebbare Lücke bloss BENENNT, ist ein Melder — dieselbe Familie wie der Reparatur-
# mechanismus, der auf der Platte liegt, die zurückgedreht wird (27.08.).
# Die Geheimnisse kann er nicht ersetzen, die Skripte schon. Also tut er es jetzt.
for Q in cj_runner_template cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
  if [ ! -f "/tmp/$Q.sh" ] && [ -f "$REPO_AUTO/$Q.sh" ]; then
    cp "$REPO_AUTO/$Q.sh" "/tmp/$Q.sh" && echo "$Q.sh aus dem Repo nach /tmp geholt"
  fi
done

for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
  [ -f "/tmp/$R.sh" ] || { echo "$R FEHLT (auch im Repo nicht)"; continue; }
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
  # Solange der Betreiber-Stopp steht, wird der Social-Autopilot gar nicht erst gestartet:
  # post_guard blockte ohnehin jeden Post, und der stuendliche «neu gestartet»-Eintrag
  # uebertoente als Dauerrauschen echte Befunde (31.08.).
  if [ "$S" = "social_autopilot" ] && [ -f "${REPO_AUTO%/automation}/dropship/_SOCIAL_STOPP" ]; then
    continue
  fi
  n=$(zaehle "$S.sh")
  if [ "$n" -eq 0 ]; then
    # ⚠️ VERWAISTE SPERRE LOESEN (29.08.2026). Diese Runner sichern sich mit `exec 9>lock` +
    # flock. Der Deskriptor wird an JEDES Kind vererbt, auch an `sleep`. Stirbt die Schleife,
    # haelt der verwaiste sleep die Sperre weiter — gemessen: /tmp/social_autopilot.lock von
    # `sleep 900` (PID 2193), /tmp/website_hygiene.lock von `sleep 7200` (PID 3069). Folge:
    # Der Prozess ist TOT, jeder Neustart beendet sich aber mit «laeuft bereits», und der
    # Motor steht bis zu zwei Stunden still, waehrend jede Statuszeile Vollzug meldet.
    # Die Skripte selbst geben den Deskriptor jetzt mit `9>&-` ab — aber ein Skript, das sich
    # selbst blockiert hat, kann sich nicht selbst befreien. Deshalb ZUSAETZLICH von aussen,
    # genau wie beim Aufseher: Selbstpruefung ist die erste Verteidigung, nie die einzige.
    # Geloest wird NUR, wenn kein Prozess des Runners laeuft ($n -eq 0) — sonst wuerde hier
    # ein gesunder Motor abgeschossen.
    for LOCKDATEI in "/tmp/$S.lock" "/tmp/${S%_runner}.lock"; do
      if [ -e "$LOCKDATEI" ] && command -v fuser >/dev/null 2>&1 \
         && fuser "$LOCKDATEI" >/dev/null 2>&1; then
        fuser -k "$LOCKDATEI" >/dev/null 2>&1
        echo "$S: verwaiste Sperre $LOCKDATEI geloest"
        sleep 1
      fi
    done
    echo "$S neu gestartet"
    starte "$S" bash "$QUELL"
  elif [ "$n" -gt 1 ]; then
    echo "$S: $n Instanzen → $((n-1)) beendet"
    ps -eo pid,etimes,args --no-headers | awk -v s="$S.sh" 'index($0,s) && $3=="bash"' \
      | sort -k2 -n | head -n -1 | awk '{print $1}' | xargs -r kill 2>/dev/null
  fi
done

# ── 3b. Python-Reiniger des Aufsehers nach /tmp spiegeln, Repo-Fassung gewinnt.
# Der Snapshot-Rewind stellt ALTE /tmp-Kopien wieder her (26.08.: textbild_fix.py vom
# 10.08. lief wieder ohne Gepr-Quittung und lud dieselben 500 Bildsaetze endlos neu).
# Der Aufseher startet /tmp/$p.py — also muss die Repo-Fassung dorthin, bei jedem Lauf.
for P in "$REPO_AUTO"/*.py; do
  Z="/tmp/$(basename "$P")"
  cmp -s "$P" "$Z" 2>/dev/null || cp "$P" "$Z" 2>/dev/null
done

echo "STAND: $(zaehle cj_runner) CJ-Runner, Aufseher=$(zaehle_aufseher)"

# 💾 Snapshot-Rewind-Erkennung (25.08.2026, 4× an einem Morgen): Der Container stellt beim
# Restart einen ALTEN Disk-Snapshot her — der Baum faellt hinter origin zurueck, die
# CJ-Zahl SINKT, jeder Push waere non-fast-forward. Erkennung braucht ERST einen fetch:
# die origin-Ref des Snapshots ist selbst veraltet und meldet ohne fetch "up to date".
find .git -name "*.lock" -delete 2>/dev/null
if timeout 60 git fetch -q origin claude/luxestyle-status-tztnn1 2>/dev/null; then
  hinten=$(git rev-list --count HEAD..origin/claude/luxestyle-status-tztnn1 2>/dev/null || echo 0)
  if [ "${hinten:-0}" -gt 5 ]; then
    echo "REWIND erkannt ($hinten hinter origin) — repo_vorspulen"
    git checkout origin/claude/luxestyle-status-tztnn1 -- automation/repo_vorspulen.sh 2>/dev/null
    bash automation/repo_vorspulen.sh 2>&1 | tail -2
    # ⚠️ VORSPULEN ALLEIN REICHT NICHT (28.08.2026). Der Rewind stellt den Stand vom 24.08.
    # her, und die laufenden Motoren haben ihren Code beim START geladen — Node liest die
    # Datei genau einmal. Nach dem Vorspulen ist die DATEI aktuell, der laufende Prozess aber
    # nicht: er arbeitet weiter mit dem Snapshot-Code und sieht dabei kerngesund aus, also
    # startet ihn auch niemand neu. Belegt an `cj_kosten_backfill.mjs`: die Datei trug den
    # Ehrlichkeits-Fix vom 27.08. («Shopify blieb stumm»), im Log stand er bei 170 Zeilen
    # KEIN einziges Mal — der laufende Prozess kannte ihn nicht.
    # Deshalb: nach einem echten Rewind alle Dauerläufer abräumen und das Skript EINMAL neu
    # ausführen, damit es sie aus dem frischen Stand wieder hochfährt.
    if [ -z "$KEEPALIVE_NACH_REWIND" ]; then
      echo "  → Motoren werden aus dem frischen Stand neu gestartet"
      rm -f /tmp/_fixer_version
      ps -eo pid,args --no-headers \
        | awk '$2=="bash" && $3 ~ /fixer_keepalive\.sh$/ {print $1}' | xargs -r kill 2>/dev/null
      ps -eo pid,args --no-headers \
        | awk '$0 ~ /cj_runner|cj_queue_runner|reel_engine_runner|social_autopilot|website_hygiene_runner|fortura_img_runner|autocommit\.sh/ {print $1}' \
        | xargs -r kill 2>/dev/null
      sleep 3
      KEEPALIVE_NACH_REWIND=1 exec bash "$0"
    fi
    echo "  (Motoren wurden in diesem Lauf bereits neu gestartet)"
  fi
fi
