#!/usr/bin/env bash
# platte-schlank.sh — Server-Platte (23.09.2026): vier Voll-Klone desselben Repos belegen /opt mit 29 GB.
#
#   curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/platte-schlank.sh | bash
#   … | ALT_LOESCHEN=1 bash      # löscht zusätzlich /opt/luxe/repo, WENN nichts darauf verweist
#
# GEMESSEN vom Betreiber (23.09.): /opt/abannews 11G (.git 5.8G) · /opt/luxe-waechter/repo 7.9G (.git 5.1G) ·
# /opt/luxe/repo 7.0G (.git 4.0G, reels 1.1G) · /opt/luxe-agent/repo 2.6G (.git 2.3G).
#
# WAS DAS SKRIPT TUT (idempotent, nur Wiederherstellbares):
#   1. Bericht: Platte, Dienste, wer auf /opt/luxe/repo verweist (systemd, cron, /usr/local/bin).
#   2. Timer anhalten und laufende Durchläufe ausklingen lassen (kein Abbruch mitten im Push); danach die Reste
#      abgebrochener fetch/gc-Läufe (tmp_pack_*) löschen — bei 100 % Platte der erste Platzgewinn.
#   3. /opt/abannews (Deploy-Poller, nur main) und /opt/luxe-waechter/repo (nur Arbeitszweig): fremde Zweige
#      aus dem Klon entfernen (der Erst-Klon holte ALLE claude/*-Zweige), Reflog leeren, git gc. Arbeitsbaum,
#      ungepushte Commits und Stashes bleiben unangetastet.
#   4. /opt/luxe-agent/repo: server/luxe-agent-schlank.sh (depth 1 + sparse, gemessen 141 MB).
#   5. /opt/luxe/repo: nur mit ALT_LOESCHEN=1 UND ohne Verweis — sonst nur Hinweis.
#   6. Timer wieder an, Platte vorher/nachher.
set -uo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
log() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
RAW=https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1
ARBEITSZWEIG=claude/luxestyle-status-tztnn1

log "1) Bericht"
df -h / | tail -1
systemctl list-units --all --no-pager --plain 2>/dev/null | grep -iE 'luxe|abannews|jarvis' | awk '{print "   " $1, $3, $4}'
VERWEIS="$(grep -rlsF '/opt/luxe/repo' /etc/systemd/system /usr/local/bin /etc/cron* /var/spool/cron /opt/jarvis 2>/dev/null | head -5)"
if [ -n "$VERWEIS" ]; then echo "   /opt/luxe/repo WIRD benutzt von:"; echo "$VERWEIS" | sed 's/^/     /'; else echo "   /opt/luxe/repo: kein Verweis in systemd/cron/usr-local-bin/jarvis gefunden"; fi

log "2) Timer anhalten, laufende Durchläufe ausklingen lassen (max. 10 min)"
TIMER="abannews-deploy.timer luxe-waechter.timer luxe-agent.timer"
systemctl stop $TIMER 2>/dev/null || true
for i in $(seq 1 60); do
  AKTIV=""; for s in abannews-deploy luxe-waechter luxe-agent; do systemctl is-active --quiet "$s.service" && AKTIV="$AKTIV $s"; done
  [ -z "$AKTIV" ] && break; [ "$i" = 1 ] && echo "   warte auf:$AKTIV"; sleep 10
done
[ -n "${AKTIV:-}" ] && echo "   ⚠️ läuft noch nach 10 min:$AKTIV — gc läuft trotzdem (git sperrt selbst)"

log "2b) Halbfertige Packdateien löschen (tmp_pack_*/tmp_idx_* — Reste abgebrochener fetch/gc bei voller Platte)"
# Gemessen 23.09.: /opt/abannews 3.00 GiB «size-garbage», dazu die abgebrochenen gc-Läufe des Betreibers (Platte 100 %).
# Nur löschen, wenn KEIN git-Prozess läuft — ein laufender fetch schreibt genau in diese Dateien.
for i in $(seq 1 30); do pgrep -x git >/dev/null || break; sleep 10; done
if pgrep -x git >/dev/null; then echo "   ⚠️ git läuft noch: $(pgrep -ax git | head -3 | tr '\n' ' ') — Reste bleiben"
else
  for D in /opt/abannews /opt/luxe-waechter/repo /opt/luxe-agent/repo /opt/luxe/repo; do
    [ -d "$D/.git/objects" ] || continue
    N=$(find "$D/.git/objects" -maxdepth 2 -type f \( -name 'tmp_pack_*' -o -name 'tmp_idx_*' -o -name 'tmp_obj_*' \) | wc -l)
    [ "$N" -gt 0 ] && { find "$D/.git/objects" -maxdepth 2 -type f \( -name 'tmp_pack_*' -o -name 'tmp_idx_*' -o -name 'tmp_obj_*' \) -delete; echo "   $D: $N Reste gelöscht"; }
    rm -f "$D/.git/gc.log" "$D/.git/gc.pid"
  done
fi
df -h / | tail -1

schlank() {   # $1 = Klon, $2 = einziger Zweig, der bleiben soll
  local D="$1" Z="$2"
  [ -d "$D/.git" ] || { echo "   $D: kein Klon — übersprungen"; return; }
  local vorher; vorher=$(du -sh "$D/.git" | cut -f1)
  git -C "$D" config remote.origin.fetch "+refs/heads/$Z:refs/remotes/origin/$Z"
  git -C "$D" for-each-ref --format='%(refname)' refs/remotes/origin | grep -vFx "refs/remotes/origin/$Z" | grep -v '/HEAD$' \
    | while read -r r; do git -C "$D" update-ref -d "$r"; done
  local st; st=$(git -C "$D" stash list | wc -l); [ "$st" -gt 0 ] && echo "   $D: $st Stash(es) bleiben erhalten (halten ihre Objekte)"
  git -C "$D" reflog expire --expire=now --all
  git -C "$D" -c pack.threads=1 -c pack.windowMemory=256m gc --prune=now --quiet || echo "   ⚠️ gc in $D gescheitert (Platz?) — Klon ist unverändert benutzbar"
  echo "   $D/.git: $vorher → $(du -sh "$D/.git" | cut -f1)"
}

log "3) Fremde Zweige aus den Klonen, gc"
# Zuerst das Alte, wenn freigegeben — schafft Platz für die gc-Neuverpackung der anderen.
if [ "${ALT_LOESCHEN:-0}" = 1 ] && [ -z "$VERWEIS" ] && [ -d /opt/luxe/repo ]; then
  UNGEPUSHT=$(git -C /opt/luxe/repo status --porcelain 2>/dev/null | wc -l)
  echo "   /opt/luxe/repo: $UNGEPUSHT ungepushte Dateien — Sicherung nach /root/luxe-alt-rettung (ohne .git)"
  [ "$UNGEPUSHT" -gt 0 ] && git -C /opt/luxe/repo status --porcelain | awk '{print $2}' | while read -r f; do
    [ -f "/opt/luxe/repo/$f" ] && install -D "/opt/luxe/repo/$f" "/root/luxe-alt-rettung/$f"; done
  rm -rf /opt/luxe/repo && echo "   /opt/luxe/repo gelöscht"
fi
schlank /opt/abannews main
schlank /opt/luxe-waechter/repo "$ARBEITSZWEIG"

log "4) Agent-Klon schlank (depth 1 + sparse)"
if curl -fsSL "$RAW/server/luxe-agent-schlank.sh" -o /tmp/luxe-agent-schlank.sh; then bash /tmp/luxe-agent-schlank.sh | tail -4
else echo "   ⚠️ luxe-agent-schlank.sh nicht ladbar — übersprungen"; fi

log "5) Timer wieder an"
systemctl start $TIMER 2>/dev/null || true
systemctl list-timers --all --no-pager 2>/dev/null | grep -E 'abannews|luxe' | awk '{print "   " $0}' | cut -c1-140

log "6) Platte nachher"
df -h / | tail -1
du -xsh /opt/* 2>/dev/null | sort -rh | head -8 | sed 's/^/   /'
if [ -d /opt/luxe/repo ]; then
  if [ -n "$VERWEIS" ]; then echo "   Hinweis: /opt/luxe/repo (≈7 GB) wird benutzt — bleibt."
  else echo "   Hinweis: /opt/luxe/repo (≈7 GB) steht noch, kein Verweis gefunden → nochmal mit ALT_LOESCHEN=1 ausführen."; fi
fi
