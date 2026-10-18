#!/usr/bin/env bash
# server-wiederbeleben.sh — Hetzner-Server (46.225.75.125) nach Stillstand wiederbeleben (18.10.2026).
#
# EIN Befehl in der Hetzner-WEB-KONSOLE (console.hetzner.cloud → Server → Symbol «>_»), als root:
#   echo; curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/server-wiederbeleben.sh | bash
# (das «echo;» fängt ab, dass die Konsole die ersten Zeichen verschluckt — dropship/COWORK-BEFEHL.md)
# Probelauf ohne Änderung:  … | DRY=1 bash
#
# ANLASS (GEMESSEN 18.10. ~20:10 UTC, Keepalive-Zeile «BOT STILL»): der letzte Puls des Agenten kam 16.10. 06:08 UTC
# (auftraege/_puls.json), der letzte Wächter-Commit 16.10. 06:11 — beide Einheiten stehen gleichzeitig, seit ~62 h; 3 Pinterest-
# Quittungen hängen auf «laufend». Von der Cloud-Session ist der Server nicht erreichbar (Port 22 gesperrt, kein Eingang).
# VERMUTUNG (nicht gemessen): Platte voll — am 13.10. stand «/» auf 90 % (32 von 38 GB), kein Swap, und dieselbe Klasse hatte den
# Agenten schon am 22.09. 21:03 UTC stillgelegt (luxe-agent-schlank.sh, platte-schlank.sh). Das Skript prüft das zuerst und
# behandelt jede Ursache, die es findet.
#
# WAS ES TUT (idempotent, löscht nur Wiederherstellbares, nichts Ungepushtes):
#   1. Bericht (nur lesen): Laufzeit, Platte/Inodes, RAM, fehlgeschlagene Einheiten, Timer, Journal der Einheiten, Kernel-Meldungen.
#   2. Platz schaffen: Journal auf 100 MB, apt-Cache, Reste abgebrochener git-Läufe (tmp_*), npm-Cache, rotierte Logs,
#      Browser-Caches des Agenten (Anmeldungen bleiben). Bleibt «/» über 90 %: server/platte-schlank.sh (Repo-Klone verschlanken).
#   3. Agent-Klon kaputt («invalid index-pack», «No space left» im Journal oder git status scheitert): server/luxe-agent-schlank.sh.
#   4. Wiederbeleben: daemon-reload, reset-failed, Timer an (luxe-agent, luxe-waechter, abannews-deploy), je ein Lauf sofort,
#      bis zu 150 s auf Ergebnis warten, Ausgang melden.
# Rückmeldung an uns: kein Zutun nötig — läuft der Agent wieder, erscheint in ~10 Min ein Commit «Bot-Puls» von luxe-agent
# im Repo, und die «BOT STILL»-Zeile der Keepalive-Meldung verschwindet von selbst.
set -uo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
exec 9>/run/luxe-wiederbeleben.lock; flock -n 9 || { echo "läuft schon (anderer Lauf) — Abbruch"; exit 0; }
DRY="${DRY:-0}"
RAW=https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1
UNITS="luxe-agent luxe-waechter abannews-deploy"
log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠️  %s\033[0m\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then echo "[DRY] $*"; else "$@" </dev/null; fi; }
have_sd() { command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; }
pcent() { df --output=pcent / 2>/dev/null | tail -1 | tr -dc 0-9; }
[ "$DRY" = 1 ] && warn "PROBELAUF (DRY=1): es wird nichts verändert."

log "1) Bericht (nur lesen)"
uptime; who -b 2>/dev/null || true
df -h / | tail -2; df -i / | tail -1
free -m | head -2
VOR=$(pcent); echo "Platte «/» belegt: ${VOR:-?} %"
if have_sd; then
  echo "--- fehlgeschlagene Einheiten"; systemctl --failed --no-legend --no-pager 2>/dev/null | head -10
  echo "--- Timer"; systemctl list-timers --all --no-legend --no-pager 2>/dev/null | grep -E "luxe|abannews" | cut -c1-160 || echo "(keine luxe/abannews-Timer gefunden)"
  for u in $UNITS; do
    printf '%-18s timer=%s service=%s\n' "$u" "$(systemctl is-active $u.timer 2>/dev/null)" "$(systemctl is-active $u.service 2>/dev/null)"
    echo "   letzte Journalzeilen:"; journalctl -u "$u.service" -n 6 --no-pager -o short-iso 2>/dev/null | cut -c1-170 | sed 's/^/   /'
  done
  echo "--- Kernel: OOM / Platte / E/A-Fehler seit 15.10."
  journalctl -k --since "2026-10-15" --no-pager 2>/dev/null | grep -i -E "out of memory|oom-kill|no space|i/o error|ext4-fs error|read-only" | tail -5 || true
fi
SPACE_ERR=0; have_sd && journalctl -u luxe-agent.service -u luxe-waechter.service --since "2026-10-15" --no-pager 2>/dev/null | grep -q -i -E "no space left|invalid index-pack" && SPACE_ERR=1
[ "${VOR:-0}" -ge 97 ] 2>/dev/null && warn "Platte praktisch voll (${VOR} %) — sehr wahrscheinlich die Ursache."
[ "$SPACE_ERR" = 1 ] && warn "Journal enthält «No space left»/«invalid index-pack» — Ursache bestätigt."

log "2) Platz schaffen (nur Wiederherstellbares)"
have_sd && run journalctl --vacuum-size=100M >/dev/null 2>&1 || true
run apt-get clean >/dev/null 2>&1 || true
for d in /opt/*/repo/.git /opt/abannews/.git; do [ -d "$d" ] && run find "$d" -name 'tmp_*' -type f -delete 2>/dev/null; done
run rm -rf /root/.npm/_cacache /root/.cache/ms-playwright-go 2>/dev/null || true
run find /var/log -type f \( -name '*.gz' -o -name '*.[0-9]' -o -name '*.old' \) -delete 2>/dev/null || true
PROFIL=/var/lib/luxe-agent/chrome-profil
if [ -d "$PROFIL" ]; then
  for c in Cache "Code Cache" GPUCache; do run find "$PROFIL" -type d -name "$c" -prune -exec rm -rf {} + 2>/dev/null || true; done
fi
NACH=$(pcent); echo "Platte «/» jetzt: ${NACH:-?} %  (vorher ${VOR:-?} %)"
if [ "${NACH:-0}" -ge 90 ] 2>/dev/null; then
  warn "«/» noch über 90 % — Repo-Klone verschlanken (platte-schlank.sh)"
  if [ "$DRY" = 1 ]; then echo "[DRY] curl -fsSL $RAW/server/platte-schlank.sh | bash"
  else curl -fsSL "$RAW/server/platte-schlank.sh" -o /tmp/platte-schlank.sh && timeout 3000 bash /tmp/platte-schlank.sh </dev/null || warn "platte-schlank.sh endete mit Fehler — Ausgabe oben lesen"; fi
  NACH=$(pcent); echo "Platte «/» nach platte-schlank: ${NACH:-?} %"
fi

log "3) Agent-Klon prüfen"
APP=/opt/luxe-agent/repo
if [ -d "$APP/.git" ]; then
  if ! git -C "$APP" status --porcelain >/dev/null 2>&1 || [ "$SPACE_ERR" = 1 ]; then
    warn "Agent-Klon beschädigt oder Platte war voll — schlank neu aufsetzen (luxe-agent-schlank.sh)"
    if [ "$DRY" = 1 ]; then echo "[DRY] curl -fsSL $RAW/server/luxe-agent-schlank.sh | bash"
    else curl -fsSL "$RAW/server/luxe-agent-schlank.sh" -o /tmp/luxe-agent-schlank.sh && timeout 1800 bash /tmp/luxe-agent-schlank.sh </dev/null || warn "luxe-agent-schlank.sh endete mit Fehler"; fi
  else echo "Agent-Klon in Ordnung."; fi
else echo "(kein Agent-Klon unter $APP — Einrichtung: server/luxe-agent-setup.sh)"; fi

log "4) Wiederbeleben"
if have_sd; then
  run systemctl daemon-reload
  for u in $UNITS; do
    if systemctl cat "$u.timer" >/dev/null 2>&1; then
      run systemctl reset-failed "$u.service" "$u.timer" 2>/dev/null || true
      run systemctl enable --now "$u.timer" >/dev/null 2>&1 || true
      run systemctl restart "$u.timer" || true
    else echo "(Einheit $u.timer gibt es auf diesem Server nicht)"; fi
  done
  for u in luxe-agent luxe-waechter; do systemctl cat "$u.service" >/dev/null 2>&1 && run systemctl start --no-block "$u.service"; done
  if [ "$DRY" != 1 ]; then
    echo "warte bis zu 150 s auf einen ersten Lauf …"
    for _ in $(seq 1 30); do
      A=$(systemctl show luxe-agent.service -p ExecMainStatus --value 2>/dev/null); S=$(systemctl is-active luxe-agent.service 2>/dev/null)
      [ "$S" != activating ] && [ "$S" != active ] && break; sleep 5
    done
  fi
  echo "--- Stand"
  for u in $UNITS; do printf '%-18s timer=%s service=%s\n' "$u" "$(systemctl is-active $u.timer 2>/dev/null)" "$(systemctl is-active $u.service 2>/dev/null)"; done
  echo "--- letzte Journalzeilen des Agenten"; journalctl -u luxe-agent.service -n 12 --no-pager -o short-iso 2>/dev/null | cut -c1-170
else warn "kein systemd gefunden — nichts zu starten"; fi

log "Ergebnis"
echo "Platte «/»: ${VOR:-?} % → $(pcent) %"
if have_sd; then
  if systemctl is-active --quiet luxe-agent.timer && systemctl is-active --quiet luxe-waechter.timer; then
    echo "✅ Timer des Agenten und des Wächters laufen. In ~10 Minuten sollte im Repo ein Commit «Bot-Puls» (luxe-agent) erscheinen."
    echo "   Bleibt er aus: journalctl -u luxe-agent.service -n 50 --no-pager  — und die letzten Zeilen schicken."
  else
    warn "Mindestens ein Timer läuft nicht — die Zeilen unter «Stand» und «Bericht» schicken."
  fi
fi
