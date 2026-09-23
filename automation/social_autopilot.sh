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
REEL_ABSTAND=${REEL_ABSTAND:-28800}      # 8 h zwischen zwei Reels (Betreiber 22.09.: «täglich mehrmals überall»; vorher 48 h)
KARUSSELL_ABSTAND=${KARUSSELL_ABSTAND:-86400}   # 23.09.: 1 Instagram-Karussell je Tag (Betreiber «insta karusell brauchen»), FB-Album dazu
TIKTOK_ABSTAND=${TIKTOK_ABSTAND:-43200}   # 12 h zwischen zwei TikTok-Posts (Metricool, eigenes Reel je Post)
# 23.09.2026 «metricool maximal nutzen»: YouTube Shorts und Pinterest ueber denselben Metricool-Zugang.
YOUTUBE_ABSTAND=${YOUTUBE_ABSTAND:-43200} # 12 h zwischen zwei YouTube Shorts (eigenes Reel je Post, Bestzeit-Planung)
PINTEREST_ABSTAND=${PINTEREST_ABSTAND:-21600}  # 6 h zwischen zwei Produkt-Pins (Direktlink aufs Produkt, UTM)
MARKE_YOUTUBE=/tmp/_autopilot_letztes_youtube
MARKE_PINTEREST=/tmp/_autopilot_letzter_pin
LERN_ABSTAND=${LERN_ABSTAND:-21600}       # alle 6 h: Instagram-Zahlen lesen, Gewichte fuer Hooks/Themen schreiben
NACHSCHUB_ABSTAND=${NACHSCHUB_ABSTAND:-43200}  # alle 12 h: Bild-Queue mit neuen Produkten auffuellen, wenn < 12 ready
MARKE_LERN=/tmp/_autopilot_letztes_lernen
MARKE_NACHSCHUB=/tmp/_autopilot_letzter_nachschub
MARKE_TIKTOK=/tmp/_autopilot_letztes_tiktok
MARKE_KARUSSELL=/tmp/_autopilot_letztes_karussell
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

  # LERNEN (22.09.): Zahlen der letzten Posts lesen → social/_lernen.json (Hook-/Themen-Gewichte) + Bericht
  if faellig "$MARKE_LERN" "$LERN_ABSTAND"; then
    $NODE automation/social_lernen.mjs && touch "$MARKE_LERN" || echo "$(date -u +%H:%M) Lernen fehlgeschlagen"
  fi
  # NACHSCHUB (22.09.): Bild-Queue aus neuen Produkten (nie gepostet), damit «mehrmals taeglich» Stoff hat
  if faellig "$MARKE_NACHSCHUB" "$NACHSCHUB_ABSTAND"; then
    READY=$(awk -F',' 'NR>1 && $0 ~ /,ready,/' social/posts_image.csv | wc -l)
    if [ "$READY" -lt 12 ]; then
      SHOPIFY_SHOP=au3j0y-hq.myshopify.com SHOPIFY_ADMIN_TOKEN="$(cat /tmp/cj_shop_token.txt 2>/dev/null)" QUEUE_MAX=6 $NODE automation/queue_new_products.mjs || echo "$(date -u +%H:%M) Nachschub fehlgeschlagen"
    fi
    touch "$MARKE_NACHSCHUB"
  fi
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
    # MIN_GAP_H: der Poster hat intern 48 h Abstand (Juli, «weniger aber besser»); seit 22.09. gilt die Kadenz hier (REEL_ABSTAND)
    if MIN_GAP_H=6 $NODE automation/meta_reel_post.mjs; then
      touch "$MARKE_REEL"
    else
      echo "$(date -u +%H:%M) Reel-Post fehlgeschlagen"
    fi
  fi

  # Instagram-Karussell (23.09.2026): ein Slide-Set (4:5) aus social/ig_karussell.csv als IG-Karussell + FB-Album.
  if faellig "$MARKE_KARUSSELL" "$KARUSSELL_ABSTAND"; then
    echo "$(date -u +%H:%M) Karussell faellig (Instagram)"
    if $NODE automation/ig_karussell_post.mjs; then
      touch "$MARKE_KARUSSELL"
    else
      echo "$(date -u +%H:%M) Karussell-Post fehlgeschlagen (Marke bleibt alt)"
    fi
  fi

  # 23.09.: Nachmessen — «posted-tiktok» heisst nur GEPLANT; der Planer sagt, ob es veroeffentlicht wurde.
  if { [ -n "${METRICOOL_USER_TOKEN:-}" ] || [ -s /tmp/metricool.env ]; } && faellig /tmp/_autopilot_letztes_tiktok_pruefen 7200; then
    PRUEFEN=1 $NODE automation/metricool_tiktok_post.mjs || echo "$(date -u +%H:%M) TikTok-Pruefung: Fehler gemeldet (siehe reels_seed.csv tiktok-fehler)"
    touch /tmp/_autopilot_letztes_tiktok_pruefen
  fi

  # TikTok ueber Metricool (22.09.2026): nur wenn ein Token da ist (Env oder /tmp/metricool.env);
  # ein eigenes, nie gepostetes Reel je Tag; Guards im Poster (Lock, Ledger, ACTIVE).
  if { [ -n "${METRICOOL_USER_TOKEN:-}" ] || [ -s /tmp/metricool.env ]; } && faellig "$MARKE_TIKTOK" "$TIKTOK_ABSTAND"; then
    echo "$(date -u +%H:%M) TikTok-Post faellig (Metricool)"
    if $NODE automation/metricool_tiktok_post.mjs; then
      touch "$MARKE_TIKTOK"
    else
      echo "$(date -u +%H:%M) TikTok-Post fehlgeschlagen (Marke bleibt alt)"
    fi
  fi
  # YouTube Shorts ueber Metricool (23.09.): gleicher Poster, NETZ=youtube; Nachmessen wie bei TikTok.
  if { [ -n "${METRICOOL_USER_TOKEN:-}" ] || [ -s /tmp/metricool.env ]; }; then
    if faellig /tmp/_autopilot_letztes_youtube_pruefen 7200; then
      NETZ=youtube PRUEFEN=1 $NODE automation/metricool_tiktok_post.mjs || echo "$(date -u +%H:%M) YouTube-Pruefung: Fehler gemeldet (reels_seed.csv youtube-fehler)"
      touch /tmp/_autopilot_letztes_youtube_pruefen
    fi
    if faellig "$MARKE_YOUTUBE" "$YOUTUBE_ABSTAND"; then
      echo "$(date -u +%H:%M) YouTube-Short faellig (Metricool)"
      if NETZ=youtube $NODE automation/metricool_tiktok_post.mjs; then touch "$MARKE_YOUTUBE"; else echo "$(date -u +%H:%M) YouTube-Post fehlgeschlagen (Marke bleibt alt)"; fi
    fi
    if faellig "$MARKE_PINTEREST" "$PINTEREST_ABSTAND"; then
      echo "$(date -u +%H:%M) Pinterest-Pin faellig (Metricool)"
      if $NODE automation/metricool_pinterest_pin.mjs; then touch "$MARKE_PINTEREST"; else echo "$(date -u +%H:%M) Pin fehlgeschlagen (Marke bleibt alt)"; fi
    fi
  fi
  sleep 900 9>&-
done
