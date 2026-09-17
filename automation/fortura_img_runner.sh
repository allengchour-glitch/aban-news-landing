#!/bin/bash
# Fortura-Bild-Nachschub: holt Bild_2..Bild_5 aus dem Feed nach.
#
# ⚠️ WARUM DIESE DATEI 17.09.2026 NEU ENTSTANDEN IST — Lehre 2 vom 11.08.2026 zum DRITTEN Mal:
# «Ein Dauerlaeufer, der nicht committet ist, existiert nicht.» Dieser Runner stand in der
# Startliste von engine_keepalive.sh und in CLAUDE.md als laufender Motor — die Datei lag aber
# NUR unter /tmp und ist mit einem Wipe verschwunden. Der Keepalive uebersprang sie mit
# `[ -f "$QUELL" ] || continue`, also schweigend, und meldete weiter «alles laeuft».
# Gemessen: Ledger 4'403 Zeilen, laut CLAUDE.md haben ~7'558 EANs Zusatzbilder — die Arbeit
# war also NICHT fertig, sie stand nur still. Gefunden hat es `tools/zweites_gehirn.py`.
#
# Zweck (CLAUDE.md «Produktkarten-Bild-Karussell»): 58 % der Produkte haben nur 1 Bild, ohne
# zweites Bild kein Karussell auf der Kollektionsseite. Der Feed traegt Bild_1..Bild_5.
cd /home/user/aban-news-landing || exit 1

# Einzel-Sperre am ZWECK, nicht am Pfad (Lehre 11.08.: zwei Kopien, eine aus /tmp, eine aus
# automation/, sahen einander nicht). `9>&-` beim sleep ist Pflicht (Lehre 29.08.): sonst
# erbt der sleep die Sperre und haelt sie nach dem Tod der Schleife weiter.
exec 9>/tmp/fortura_img.lock
flock -n 9 || { echo "$(date -u +%H:%M) Fortura-Bilder laeuft bereits — dieser Start endet."; exit 0; }

source /tmp/secrets_env.sh 2>/dev/null

while true; do
  # Der Feed liegt in /tmp und ueberlebt keinen Wipe. Fehlt er, wird er geholt — sonst
  # laeuft der Backfill ins Leere und meldet fleissig 0 (die stille Null, Lehre 17.09.).
  if [ ! -s /tmp/fortura_feed.csv ]; then
    echo "$(date -u +%H:%M) Feed fehlt — wird geholt"
    bash automation/fortura_fetch_feed.sh /tmp/fortura_feed.csv \
      || { echo "$(date -u +%H:%M) Feed-Download fehlgeschlagen — 30 min Pause"; sleep 1800 9>&-; continue; }
  fi

  VORHER=$(wc -l < dropship/_fortura_img_done.txt 2>/dev/null || echo 0)
  FT_IMG_LIMIT=300 /opt/node22/bin/node automation/fortura_image_backfill.mjs 2>&1 | tail -8
  NACHHER=$(wc -l < dropship/_fortura_img_done.txt 2>/dev/null || echo 0)
  echo "$(date -u +%H:%M) Fortura-Bilder: $VORHER → $NACHHER (+$((NACHHER - VORHER)))"

  # Kommt nichts mehr dazu, ist der Bestand abgearbeitet — dann seltener nachsehen statt
  # im Leerlauf Shopify zu belasten.
  if [ "$NACHHER" -le "$VORHER" ]; then sleep 21600 9>&-; else sleep 900 9>&-; fi
done
