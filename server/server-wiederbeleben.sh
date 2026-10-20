#!/usr/bin/env bash
# server-wiederbeleben.sh — Hetzner-Server (46.225.75.125) nach Stillstand wiederbeleben (18.10.2026).
#
# EIN Befehl in der Hetzner-WEB-KONSOLE (console.hetzner.cloud → Server → Symbol «>_»), als root:
#   echo; curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/server-wiederbeleben.sh | bash
# (das «echo;» fängt ab, dass die Konsole die ersten Zeichen verschluckt — dropship/COWORK-BEFEHL.md)
# TIPPSICHERE FASSUNG (20.10.: im Screenshot des Betreibers kam «https:» als «https;» und «|» als «\» an — «curl: Could not resolve host:
# https», «-bash: //raw.githubusercontent.com/…: No such file»; die Hetzner-Konsole verliert bei «:» und «|» offenbar die Umschalttaste):
# ZWEI Zeilen, einzeln mit Enter, nur Buchstaben, Ziffern, «-», «.», «/» — kein «:», «|», «_», «&», «>»:
#   curl -fsSL -o wb.sh raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/server-wiederbeleben.sh
#   bash wb.sh
# (ohne «https://» nimmt curl http und folgt der Weiterleitung auf https; gemessen 20.10.: 200, byte-gleich mit dem Repo)
# Probelauf ohne Änderung:  … | DRY=1 bash
#
# ANLASS (GEMESSEN 18.10. ~20:10 UTC, Keepalive-Zeile «BOT STILL»): der letzte Puls des Agenten kam 16.10. 06:08 UTC
# (auftraege/_puls.json), der letzte Wächter-Commit 16.10. 06:11 — beide Einheiten stehen gleichzeitig, seit ~62 h; 3 Pinterest-
# Quittungen hängen auf «laufend». Von der Cloud-Session ist der Server nicht erreichbar (Port 22 gesperrt, kein Eingang).
# ZWEI WEITERE URSACHEN, die dieselbe Stille erzeugen (GEMESSEN/QUELLE 18.10.):
#   · NETZ: status.hetzner.com meldet «Urgent maintenance on all core routers» seit 15.10. 10:00 UTC (laufend) und am 16.10. Wartung an den
#     Load Balancern in NBG1 (erledigt) — ein Server ohne Route zu GitHub kann weder holen noch pushen (QUELLE status.hetzner.com).
#   · TOKEN: der Git-Remote der Klone trägt einen ghp_-Token in der URL (PROJEKT.md:61); ein abgelaufener/widerrufener Token lässt schon
#     `git fetch` am ExecStartPre scheitern (auch bei öffentlichem Repo) — alle drei Timer stehen dann still, ohne dass etwas «kaputt» wirkt.
#   Das Skript prüft beides (Schritt 1b) und sagt, welche Ursache vorliegt.
# Token erneuern (nur falls Schritt 1b «ZUGANG ABGELEHNT» meldet): neuen Token (Rechte: repo) unter github.com/settings/tokens anlegen, dann
#   echo; TOKEN=ghp_… bash <(curl -fsSL …/server-wiederbeleben.sh)    (setzt die Remote-URLs der drei Klone; der Wert wird nie ausgegeben)
# Notfall-Neustart des ganzen Servers: REBOOT=1 (erst am Ende, nur wenn die Netzprüfung scheitert und der Dienstneustart nichts bringt).
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

log "1b) Netz und GitHub-Zugang (nur lesen; mit TOKEN=… werden die Remote-URLs erneuert)"
KLONE="/opt/luxe-agent/repo /opt/luxe-waechter/repo /opt/abannews"
echo "--- Adressen/Route"; ip -br addr 2>/dev/null | head -5; ip route 2>/dev/null | head -3
getent hosts github.com >/dev/null 2>&1 && echo "DNS github.com: ok" || warn "DNS: github.com nicht auflösbar"
ping -c2 -W3 1.1.1.1 >/dev/null 2>&1 && echo "Ping 1.1.1.1: ok" || warn "Ping 1.1.1.1: keine Antwort (Netz aus?)"
echo "github.com: HTTP $(curl -sS -m 12 -o /dev/null -w '%{http_code}' https://github.com 2>/dev/null || echo 000)"
if [ -n "${TOKEN:-}" ]; then
  for d in $KLONE; do
    [ -d "$d/.git" ] || continue
    if [ "$DRY" = 1 ]; then echo "[DRY] Remote-URL in $d auf neuen Token setzen"
    else git -C "$d" remote set-url origin "https://x-access-token:${TOKEN}@github.com/allengchour-glitch/aban-news-landing.git" && echo "Remote-URL erneuert: $d"; fi
  done
fi
AUTH_FEHLER=0; NETZ_FEHLER=0
for d in $KLONE; do
  [ -d "$d/.git" ] || continue
  out=$(timeout 30 git -C "$d" ls-remote --heads origin 2>&1 </dev/null | head -3)
  if echo "$out" | grep -q -E "^[0-9a-f]{40}"; then echo "$d: GitHub lesbar (öffentliches Repo — beweist KEIN Schreibrecht, siehe 1c)"
  elif echo "$out" | grep -q -i -E "authentication failed|invalid username|invalid token|403|401|bad credentials"; then
    warn "$d: ZUGANG ABGELEHNT — Token abgelaufen/widerrufen? (${out%%$'\n'*})"; AUTH_FEHLER=1
  elif echo "$out" | grep -q -i -E "resolve host|timed out|unable to access|network is unreachable|failed to connect"; then
    warn "$d: GitHub nicht erreichbar — Netz (${out%%$'\n'*})"; NETZ_FEHLER=1
  else warn "$d: unklar: ${out%%$'\n'*}"; fi
done
[ "$AUTH_FEHLER" = 1 ] && warn "→ Neuer Token nötig: github.com/settings/tokens (Recht «repo»), dann den Befehl oben mit TOKEN=ghp_… wiederholen."
[ "$NETZ_FEHLER" = 1 ] && have_sd && { warn "Netz scheint gestört — Netzdienste neu starten (systemd-networkd, systemd-resolved)"; run systemctl restart systemd-networkd systemd-resolved 2>/dev/null || true; sleep 5; ping -c2 -W3 1.1.1.1 >/dev/null 2>&1 && echo "Netz wieder da ✅" || warn "Netz weiter aus — Hetzner-Konsole: Server → Reset («Power cycle») oder REBOOT=1"; }
# 1c) SCHREIBZUGANG — die Lücke aller früheren Prüfungen (gemessen 20.10.: der Lauf vom 19.10. meldete «lesbar ✅» und die Push-Probe lief durch,
# trotzdem scheiterte JEDER echte Push mit «could not read Username»). Lesen geht bei einem öffentlichen Repo ohne Anmeldung; geprüft wird hier,
# ob die Remote-URL überhaupt einen Token trägt und ob GitHub ihm Schreibrecht gibt (folgenloser Zweig-Update auf den aktuellen Stand).
WRITE_BRANCH=claude/luxestyle-status-tztnn1; WRITE_REPO=allengchour-glitch/aban-news-landing; KEIN_SCHREIB=0
for d in $KLONE; do
  [ -d "$d/.git" ] || continue
  u=$(git -C "$d" remote get-url origin 2>/dev/null || true)
  cred=$(printf '%s' "$u" | sed -nE 's#^https://[^/@]+:([^@/]+)@.*#\1#p')
  if [ -z "$cred" ]; then warn "$d: Remote-URL OHNE Token — Push unmöglich («could not read Username»)"; KEIN_SCHREIB=1; continue; fi
  sha=$(curl -sS -m 25 -H "Authorization: Bearer $cred" -H "Accept: application/vnd.github+json" -H "User-Agent: luxe-wiederbeleben" "https://api.github.com/repos/$WRITE_REPO/git/ref/heads/$WRITE_BRANCH" 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin)["object"]["sha"])
except Exception: print("")')
  if [ -z "$sha" ]; then warn "$d: Token wird von GitHub abgelehnt oder GitHub nicht erreichbar (kein Ref lesbar)"; KEIN_SCHREIB=1; continue; fi
  c=$(curl -sS -m 25 -o /dev/null -w '%{http_code}' -X PATCH -H "Authorization: Bearer $cred" -H "Accept: application/vnd.github+json" -H "User-Agent: luxe-wiederbeleben" -H "Content-Type: application/json" -d "{\"sha\":\"$sha\",\"force\":false}" "https://api.github.com/repos/$WRITE_REPO/git/refs/heads/$WRITE_BRANCH" 2>/dev/null || echo 000)
  case "$c" in 200|422) echo "$d: Schreibzugang ✅ (HTTP $c)";; *) warn "$d: Token darf NICHT schreiben (HTTP $c) — abgelaufen oder ohne «Contents: Read and write»"; KEIN_SCHREIB=1;; esac
done
[ "$KEIN_SCHREIB" = 1 ] && warn "→ KEIN SCHREIBZUGANG: neuen Token anlegen (Anleitung im Kopf von server/token-setzen.sh) und dann dort einfügen:  curl -fsSL -o t.sh raw.githubusercontent.com/$WRITE_REPO/$WRITE_BRANCH/server/token-setzen.sh  und  bash t.sh"
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

log "4b) Push-Probe (nichts wird gesendet)"
if [ -d /opt/luxe-agent/repo/.git ]; then
  timeout 40 git -C /opt/luxe-agent/repo push --dry-run origin HEAD:claude/luxestyle-status-tztnn1 2>&1 </dev/null | tail -2 | cut -c1-200
fi
log "4c) Warum kein Puls? (nur lesen)"
if have_sd; then
  echo "--- Journal des Agenten: Fehlerzeilen der letzten 300 Zeilen"
  journalctl -u luxe-agent.service -n 300 --no-pager -o short-iso 2>/dev/null | grep -i -E "nicht gepusht|Claim konnte|fatal|rejected|denied|403|401|Could not resolve|Authentication|No space" | tail -6 | cut -c1-330 || true
  [ -n "$(journalctl -u luxe-agent.service -n 300 --no-pager 2>/dev/null | grep -i -E 'nicht gepusht|Claim konnte|fatal|rejected|denied|403|401|Could not resolve|Authentication|No space')" ] || echo "(keine Fehlerzeile — der Agent meldet sich ohne Fehler; dann steht der Puls vermutlich nur noch aus)"
fi
if [ -d /opt/luxe-agent/repo/.git ]; then
  echo "--- Agent-Klon: letzte Commits / ungepushte Commits"
  git -C /opt/luxe-agent/repo log --format='%h %ci %an %s' -3 2>/dev/null | cut -c1-120
  git -C /opt/luxe-agent/repo rev-list --count '@{u}..HEAD' 2>/dev/null | sed 's/^/ungepusht: /' || true
fi
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
if [ "${REBOOT:-0}" = 1 ]; then
  warn "REBOOT=1 — Server startet in 15 s neu (Strg+C bricht ab)."; [ "$DRY" = 1 ] && echo "[DRY] reboot" || { sleep 15; systemctl reboot; }
fi
