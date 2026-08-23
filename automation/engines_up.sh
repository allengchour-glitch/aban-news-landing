#!/bin/bash
# Startet alle Dauerläufer, die gerade nicht laufen — und zählt ehrlich.
#
# ⚠️ WARUM ES DIESE DATEI GIBT (11.08.2026, zweimal am selben Tag hereingefallen):
# Ein `pgrep -f social_autopilot` oder `ps aux | grep [c]j_queue_runner` **direkt im Aufruf**
# findet die eigene Kommandozeile. Der Bracket-Trick `[c]j_…` schützt nur davor, dass grep sich
# selbst sieht — nicht davor, dass die umgebende Shell das Suchwort im Argument trägt. Ergebnis:
# «9 Engines laufen», tatsächlich waren es 4. Ein toter Social-Autopilot galt so einen halben
# Tag als gesund.
#
# Die Lösung ist nicht ein besseres Muster, sondern eine andere Frage: Es wird die Prozessliste
# auf «bash <pfad>» reduziert und mit der Sollliste verglichen. Das Suchwort steht dann in einer
# Datei, nicht in der Kommandozeile des Prüfers.
cd "$(dirname "$0")/.." || exit 1

laeuft() {   # $1 = Skriptpfad, $2 = optionales erstes Argument
  # Verglichen werden EINZELNE Argumente, nicht die Zeichenkette der ganzen Kommandozeile.
  # Das ist der Punkt: Der Aufruf-Wrapper der Umgebung ist «/bin/bash -c <ganzes Skript>» —
  # sein zweites Argument ist «-c», niemals ein Skriptpfad. Er kann also nicht mehr mitzählen,
  # egal welche Wörter im Skripttext vorkommen. Ein `grep` über die ganze Zeile fand dagegen
  # jedes Suchwort in der eigenen Kommandozeile wieder und meldete alles als «läuft».
  ps -eo args --no-headers | awk -v s="$1" -v a="${2:-}" '
    $1 ~ /(^|\/)bash$/ && $2 == s && (a == "" || $3 == a) { n++ } END { exit(n ? 0 : 1) }'
}

start() {    # $1 = Skriptpfad (wie er in ps steht), $2 = Argument, $3 = abweichender Startbefehl
  # ⚠️ ERKENNEN UND STARTEN SIND NICHT DASSELBE (12.08.2026 teuer gelernt).
  # In der Prozessliste stehen die CJ-Runner als «bash /tmp/cj_runner_template.sh cj_runner2».
  # Daraus zu schliessen, man müsse genau das aufrufen, ist falsch: Gestartet werden MUSS der
  # Wrapper /tmp/cj_runner2.sh, denn der setzt GRPLIST und RUNNER und ruft die Vorlage dann
  # selbst per exec auf. Die Vorlage direkt zu starten liess sie sofort sterben —
  # «(i % N) + 1: division by 0», weil N aus der fehlenden Gruppenliste kommt. Der Aufruf sah
  # in der Prozessliste identisch aus, funktionierte aber nicht; die Runner galten als
  # gestartet und waren Sekunden später wieder weg.
  local startbefehl="${3:-$1 ${2:-}}"
  [ -f "$1" ] || { echo "fehlt: $1"; return; }
  laeuft "$1" "${2:-}" && return
  local name; name=$(basename "$1" .sh)${2:+-$2}
  # ⚠️ SPERRE JE DAUERLÄUFER (12.08.2026). `laeuft` prüft, `setsid` startet — dazwischen liegt
  # ein Moment, und in dem startet `fixer_keepalive.sh` dieselben CJ-Runner aus seiner eigenen
  # Schleife. Heute standen dadurch nach einem Keepalive-Aufruf ZWEI Prozesse je Runner; im
  # August waren es aus demselben Grund schon einmal dreizehn. Ein besserer Prüftest hilft
  # dagegen nicht — die Prüfung ist ja korrekt, sie ist nur veraltet, sobald sie fertig ist.
  # Die Sperre hält der Runner selbst für seine ganze Laufzeit: Ein zweiter Start bekommt sie
  # nicht und endet sofort. Damit ist es gleichgültig, wer alles startet und wie oft.
  # ⚠️ DESKRIPTOR 8, NICHT 9. Mehrere gestartete Skripte sperren INTERN selbst auf fd 9
  # (fixer_keepalive.sh tut genau das). Deren `exec 9>…` schliesst dann den Deskriptor dieser
  # Hülle — und gibt damit die Sperre wieder frei, die den Doppelstart verhindern sollte.
  # Die Hülle bekommt deshalb einen eigenen Deskriptor, den kein Skript benutzt.
  setsid bash -c "exec 8>/tmp/lock_$name.lock; flock -n 8 || exit 0;
                  source /tmp/secrets_env.sh 2>/dev/null; exec bash $startbefehl" \
    >> "/tmp/$name.log" 2>&1 &
  echo "gestartet: $1 ${2:-}"
  sleep 3
}

# Prio-Fenster (16:00–17:00 UTC, gesetzt vom Aufseher): Grind-Runner NICHT starten,
# solange die Flagge liegt — sonst frässen sie den Prio-Jobs das frische Punktebudget weg.
if [ ! -f /tmp/cj_prio_fenster ]; then
for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
  # Erkannt wird die Vorlage samt Argument, gestartet der Wrapper — siehe Erklärung in start().
  start /tmp/cj_runner_template.sh "$R" "/tmp/$R.sh"
done
fi
start automation/cj_queue_runner.sh
# ⚠️ 23.08.2026: autocommit liegt jetzt im REPO, nicht mehr nur unter /tmp. Die
# /tmp-Fassung macht `git add -A` und hat damit am 22.08. ein frisch gebautes Werkzeug
# in eine Sammelmeldung «CJ-Ledger auto» gezogen, bevor der Grund dafuer geschrieben
# war. Die Repo-Fassung addiert nur `dropship/`. Wer eine Engine ins Repo holt, muss
# JEDE Startliste umhaengen — engine_keepalive.sh wurde umgestellt, diese hier nicht.
start automation/autocommit.sh
start automation/reel_engine_runner.sh
start automation/social_autopilot.sh
start automation/website_hygiene_runner.sh
start automation/fixer_keepalive.sh

echo "--- laufende Dauerläufer:"
ps -eo args --no-headers | awk '$1=="bash" && ($2 ~ /^\/tmp\// || $2 ~ /^automation\//) {print "  "$2" "$3}' | sort
