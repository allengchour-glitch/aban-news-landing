#!/bin/bash
# Instagram-/Facebook-Autopilot: postet in ruhiger Kadenz ein Bild und, wenn fällig, ein Reel.
#
# WARUM DIESE DATEI IM REPO LIEGT (und nicht mehr nur in /tmp):
# Am 06.06.2026 hatte schon einmal eine Session das Meta-Posting zum Laufen gebracht und es nie
# committet — mit dem Container war alles weg. Genau das ist jetzt ein zweites Mal passiert:
# `social_autopilot.sh` und `reel_engine_runner.sh` standen im Projekt-Gedächtnis als laufende
# Dauerläufer, existierten aber nur unter /tmp und sind beim Wipe verschwunden. Was nur in /tmp
# lebt, gilt als verloren, nicht als vorhanden.
#
# ⚠️ ZWEITE LEHRE (11.08.2026): Ein `pgrep -f social_autopilot` innerhalb eines Shell-Aufrufs,
# der das Wort selbst enthält, findet die EIGENE Kommandozeile und meldet fröhlich «läuft» —
# auch wenn die Datei gar nicht existiert. Genau so galt dieser Autopilot einen halben Tag lang
# als gesund. Wer Prozesse prüft, nimmt `ps -eo args | grep …` oder achtet darauf, dass das
# Suchmuster nicht im eigenen Aufruf steht.
#
# ⚠️ DRITTE LEHRE: Ein abgelaufenes Meta-Token sieht aus wie Ruhe. Die Poster brechen still ab,
# das Log bleibt leer, und niemand merkt, dass seit Tagen nichts mehr erscheint. Deshalb wird das
# Token bei JEDER Runde zuerst geprüft und der Zustand nach /tmp/meta_token_status geschrieben.
#
# Alle Doppelpost-Wachen bleiben unangetastet: Sperre, Anspruch und Live-Abgleich stecken in
# post_guard.mjs bzw. meta_reel_post.mjs. Dieses Skript entscheidet nur, WANN etwas ansteht.
set -u
cd "$(dirname "$0")/.." || exit 1
NODE=/opt/node22/bin/node
BILD_ABSTAND=${BILD_ABSTAND:-21600}      # 6 h zwischen zwei Bildposts
REEL_ABSTAND=${REEL_ABSTAND:-172800}     # 48 h zwischen zwei Reels (Kadenz-Wache)
MARKE_BILD=/tmp/_autopilot_letztes_bild
MARKE_REEL=/tmp/_autopilot_letztes_reel

exec 9>/tmp/social_autopilot.lock
# ⚠️ `9>&-` ist KEIN Beiwerk (29.08.2026). `exec 9>lock` wird an JEDES Kind vererbt —
# auch an `sleep`. Stirbt die Schleife, haelt der verwaiste sleep die flock-Sperre bis
# zu zwei Stunden weiter, und jeder Neustart beendet sich mit «laeuft bereits», waehrend
# der Motor in Wahrheit still steht. Live nachgewiesen: /tmp/social_autopilot.lock wurde
# von `sleep 900` (PID 2193) gehalten, /tmp/website_hygiene.lock von `sleep 7200`.
flock -n 9 || { echo "$(date -u +%H:%M) Autopilot läuft bereits — dieser Start endet."; exit 0; }

faellig() {                              # $1 = Markendatei, $2 = Mindestabstand in Sekunden
  [ -f "$1" ] || return 0
  [ $(( $(date +%s) - $(stat -c %Y "$1") )) -ge "$2" ]
}

while true; do
  TOKEN=$(cat /tmp/meta_page_token 2>/dev/null)
  if [ -z "$TOKEN" ]; then
    echo "kein-token" > /tmp/meta_token_status
    echo "$(date -u +%H:%M) ⚠️ /tmp/meta_page_token fehlt — es wird nichts gepostet."
    sleep 1800 9>&-; continue
  fi
  ANTWORT=$(curl -s --max-time 20 \
    "https://graph.facebook.com/v21.0/me?fields=id&access_token=$TOKEN")
  if printf '%s' "$ANTWORT" | grep -q '"error"'; then
    echo "abgelaufen" > /tmp/meta_token_status
    # Laut und mit Grund — ein stiller Abbruch wäre von «nichts zu posten» nicht zu unterscheiden.
    echo "$(date -u +%H:%M) ⚠️ Meta-Token ungültig: $(printf '%s' "$ANTWORT" | head -c 160)"
    echo "$(date -u +%H:%M)    → neues Nutzer-Token nötig; ohne App-Secret ist keine Verlängerung möglich."
    sleep 1800 9>&-; continue
  fi
  echo "gueltig $(date -u +%FT%TZ)" > /tmp/meta_token_status

  export IG_USER_ID="$(cat /tmp/meta_ig_id 2>/dev/null)"
  export FB_PAGE_ID="${FB_PAGE_ID:-1049840534888592}"
  export META_ACCESS_TOKEN="$TOKEN"
  export IG_ACCESS_TOKEN="$TOKEN"
  export FB_PAGE_ACCESS_TOKEN="$TOKEN"
  export SKIP_THREADS=1                  # Threads bleibt aus, bis dort Publikum da ist.

  if faellig "$MARKE_BILD" "$BILD_ABSTAND"; then
    echo "$(date -u +%H:%M) Bildpost fällig"
    if MAX_PER_RUN=1 $NODE automation/social-autopost-meta.mjs; then
      touch "$MARKE_BILD"
    else
      echo "$(date -u +%H:%M) Bildpost fehlgeschlagen (Marke bleibt alt, nächster Lauf versucht erneut)"
    fi
  fi

  if faellig "$MARKE_REEL" "$REEL_ABSTAND"; then
    echo "$(date -u +%H:%M) Reel fällig"
    if $NODE automation/meta_reel_post.mjs; then
      touch "$MARKE_REEL"
    else
      echo "$(date -u +%H:%M) Reel-Post fehlgeschlagen"
    fi
  fi

  sleep 900 9>&-
done
