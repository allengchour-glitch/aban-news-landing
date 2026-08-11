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

start() {    # $1 = Skriptpfad, $2 = optionales Argument
  [ -f "$1" ] || { echo "fehlt: $1"; return; }
  laeuft "$1" "${2:-}" && return
  local name; name=$(basename "$1" .sh)${2:+-$2}
  # secrets_env.sh mitgeben: cj_queue_runner bricht sonst mit «SHOPIFY_CLIENT_ID fehlt» ab.
  setsid bash -c "source /tmp/secrets_env.sh 2>/dev/null; exec bash '$1' ${2:-}" \
    >> "/tmp/$name.log" 2>&1 &
  echo "gestartet: $1 ${2:-}"
  sleep 3
}

for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
  start /tmp/cj_runner_template.sh "$R"
done
start automation/cj_queue_runner.sh
start /tmp/autocommit.sh
start automation/reel_engine_runner.sh
start automation/social_autopilot.sh
start automation/website_hygiene_runner.sh
start automation/fixer_keepalive.sh

echo "--- laufende Dauerläufer:"
ps -eo args --no-headers | awk '$1=="bash" && ($2 ~ /^\/tmp\// || $2 ~ /^automation\//) {print "  "$2" "$3}' | sort
